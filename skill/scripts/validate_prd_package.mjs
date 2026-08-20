#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const targetDir = process.argv[2];

if (!targetDir) {
  console.error("Usage: node validate_prd_package.mjs <prd-package-dir>");
  process.exit(2);
}

const requiredFiles = [
  ".prd-template.json",
  "AGENTS.md",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "index.html",
  "prototype.html",
  "vite.config.ts",
  "tsconfig.json",
  "tsconfig.node.json",
  "src/main.ts",
  "src/App.vue",
  "src/styles.css",
  "src/types.ts",
  "src/vite-env.d.ts",
  "src/data/generatedDocs.ts",
  "src/data/prdData.ts",
  "src/stores/prd.ts",
  "src/workbench/WorkbenchApp.vue",
  "src/workbench/components/DocumentViewer.vue",
  "src/workbench/components/FeatureMenu.vue",
  "src/workbench/components/PrdCanvas.vue",
  "src/workbench/components/PrototypePreview.vue",
  "src/workbench/components/ReviewPanel.vue",
  "src/workbench/components/WorkbenchHeader.vue",
  "src/prototype/main.ts",
  "src/prototype/mobile/MobilePrototype.vue",
  "src/prototype/desktop/DesktopPrototype.vue",
  "review-data/draft.json",
  "prd.md",
  "requirements.json",
  "traceability-matrix.md",
  "ai-handoff.md",
  "CHANGELOG.md",
  "versions/index.json",
];

const docFiles = [
  "prd.md",
  "requirements.json",
  "traceability-matrix.md",
  "ai-handoff.md",
  "CHANGELOG.md",
];

const errors = [];
const warnings = [];

function filePath(file) {
  return path.join(targetDir, file);
}

function fileExists(file) {
  return fs.existsSync(filePath(file));
}

function readText(file) {
  return fs.readFileSync(filePath(file), "utf8");
}

function readJson(file, label) {
  try {
    return JSON.parse(readText(file));
  } catch (error) {
    errors.push(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath(file))).digest("hex");
}

function collectFiles(relativeDir) {
  const absolute = filePath(relativeDir);
  if (!fs.existsSync(absolute)) return [];
  const result = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectFiles(relative));
      continue;
    }
    result.push(relative.split(path.sep).join("/"));
  }
  return result;
}

function joinedText(files) {
  return files.filter(fileExists).map(readText).join("\n");
}

for (const file of requiredFiles) {
  if (!fileExists(file)) errors.push(`Missing required file: ${file}`);
}

const packageJson = fileExists("package.json") ? readJson("package.json", "package.json") : null;
if (packageJson) {
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  for (const dependency of [
    "vue",
    "pinia",
    "vite",
    "typescript",
    "@vitejs/plugin-vue",
    "ant-design-vue",
    "@ant-design/icons-vue",
    "vant",
    "markdown-it",
    "mermaid",
  ]) {
    if (!dependencies[dependency]) errors.push(`package.json must include ${dependency}.`);
  }

  const fixedVersions = {
    "ant-design-vue": "4.2.6",
    "@ant-design/icons-vue": "7.0.1",
    vant: "4.10.0",
  };
  for (const [dependency, version] of Object.entries(fixedVersions)) {
    if (dependencies[dependency] && dependencies[dependency] !== version) {
      errors.push(`package.json must pin ${dependency} to ${version}.`);
    }
  }

  if (!/^pnpm@/.test(packageJson.packageManager || "")) {
    errors.push('package.json must set packageManager to pnpm, for example "pnpm@11.1.1".');
  }
  if (!packageJson.engines?.node || !/>=20\s*<25/.test(packageJson.engines.node)) {
    warnings.push('package.json should constrain Node.js with engines.node such as ">=20 <25".');
  }
  if (!packageJson.engines?.pnpm || !/>=10\s*<12/.test(packageJson.engines.pnpm)) {
    warnings.push('package.json should constrain pnpm with engines.pnpm such as ">=10 <12".');
  }
  if (!packageJson.scripts?.dev || !packageJson.scripts?.build) {
    warnings.push("package.json should include dev and build scripts.");
  }
}

if (fileExists("package-lock.json")) {
  errors.push("package-lock.json should not be present. Use pnpm-lock.yaml for generated PRD workspaces.");
}
if (fileExists("pnpm-workspace.yaml") && !/allowBuilds/.test(readText("pnpm-workspace.yaml"))) {
  warnings.push("pnpm-workspace.yaml should record approved dependency build scripts.");
}

const manifest = fileExists(".prd-template.json")
  ? readJson(".prd-template.json", ".prd-template.json")
  : null;
if (manifest) {
  if (manifest.workbenchUiLibrary !== "ant-design-vue") {
    errors.push(".prd-template.json must lock the workbench to ant-design-vue.");
  }
  if (manifest.prototypeUiLibraries?.mobile !== "vant") {
    errors.push(".prd-template.json must map the mobile prototype to vant.");
  }
  if (manifest.prototypeUiLibraries?.desktop !== "ant-design-vue") {
    errors.push(".prd-template.json must map the desktop prototype to ant-design-vue.");
  }
  if (!manifest.lockedFiles || typeof manifest.lockedFiles !== "object") {
    errors.push(".prd-template.json must include lockedFiles hashes.");
  } else {
    for (const [file, expectedHash] of Object.entries(manifest.lockedFiles)) {
      if (!fileExists(file)) {
        errors.push(`Locked workbench file is missing: ${file}`);
        continue;
      }
      if (sha256(file) !== expectedHash) {
        errors.push(`Locked workbench file drifted: ${file}`);
      }
    }
  }
}

let requirements = [];
let requirementsJson = null;
if (fileExists("requirements.json")) {
  requirementsJson = readJson("requirements.json", "requirements.json");
  requirements = Array.isArray(requirementsJson?.requirements) ? requirementsJson.requirements : [];
}
if (requirementsJson && requirements.length === 0) {
  errors.push("requirements.json must include a non-empty requirements array.");
}

const reqIds = new Set();
for (const [index, requirement] of requirements.entries()) {
  if (!requirement || typeof requirement !== "object") {
    errors.push(`requirements[${index}] must be an object.`);
    continue;
  }
  if (!/^REQ-\d{3,}$/.test(requirement.id || "")) {
    errors.push(`requirements[${index}] has invalid id: ${requirement.id || "<missing>"}`);
    continue;
  }
  if (reqIds.has(requirement.id)) errors.push(`Duplicate requirement id: ${requirement.id}`);
  reqIds.add(requirement.id);
  if (!requirement.title) warnings.push(`${requirement.id} is missing title.`);
  if (!Array.isArray(requirement.acceptanceCriteria) || requirement.acceptanceCriteria.length === 0) {
    warnings.push(`${requirement.id} is missing acceptanceCriteria.`);
  }
}

const sourceFiles = collectFiles("src").filter((file) => /\.(ts|vue|css)$/.test(file));
const workbenchFiles = sourceFiles.filter((file) => {
  return file === "src/main.ts" || file === "src/App.vue" || file === "src/styles.css" || file.startsWith("src/workbench/");
});
const sourceText = joinedText(sourceFiles);
const workbenchText = joinedText(workbenchFiles);
const docText = joinedText(docFiles);
const allText = `${sourceText}\n${docText}`;
const indexHtml = fileExists("index.html") ? readText("index.html") : "";
const prototypeHtml = fileExists("prototype.html") ? readText("prototype.html") : "";
const mainSource = fileExists("src/main.ts") ? readText("src/main.ts") : "";
const prototypeMain = fileExists("src/prototype/main.ts") ? readText("src/prototype/main.ts") : "";
const mobileSource = fileExists("src/prototype/mobile/MobilePrototype.vue")
  ? readText("src/prototype/mobile/MobilePrototype.vue")
  : "";
const desktopSource = fileExists("src/prototype/desktop/DesktopPrototype.vue")
  ? readText("src/prototype/desktop/DesktopPrototype.vue")
  : "";
const prdData = fileExists("src/data/prdData.ts") ? readText("src/data/prdData.ts") : "";
const storeSource = fileExists("src/stores/prd.ts") ? readText("src/stores/prd.ts") : "";
const viteConfig = fileExists("vite.config.ts") ? readText("vite.config.ts") : "";
const traceability = fileExists("traceability-matrix.md") ? readText("traceability-matrix.md") : "";
const handoff = fileExists("ai-handoff.md") ? readText("ai-handoff.md") : "";
const changelog = fileExists("CHANGELOG.md") ? readText("CHANGELOG.md") : "";

if (indexHtml && !/src\/main\.ts/.test(indexHtml)) {
  errors.push("index.html must load the Ant Design Vue workbench entry at /src/main.ts.");
}
if (prototypeHtml && !/\.\/src\/prototype\/main\.ts/.test(prototypeHtml)) {
  errors.push("prototype.html must load the isolated prototype entry with a relative path.");
}
if (mainSource && !/from\s+["']ant-design-vue["']|import\s+Antd\s+from\s+["']ant-design-vue["']/.test(mainSource)) {
  errors.push("src/main.ts must initialize the Ant Design Vue workbench.");
}
if (mainSource && !/ant-design-vue\/dist\/reset\.css/.test(mainSource)) {
  errors.push("src/main.ts must load the Ant Design Vue reset for the workbench document.");
}
if (/from\s+["']vant["']|vant\/lib|<van-/i.test(workbenchText)) {
  errors.push("Workbench files must not import or render Vant. Keep Vant inside the mobile prototype iframe.");
}
if (workbenchText && /<select\b/i.test(workbenchText)) {
  errors.push("Workbench files must use Ant Design Vue selectors instead of native select controls.");
}
for (const pattern of [/<a-menu\b/i, /<a-select\b/i, /<a-segmented\b/i, /<a-modal\b/i]) {
  if (workbenchText && !pattern.test(workbenchText)) {
    warnings.push(`Workbench is missing expected Ant Design Vue control: ${pattern.source}`);
  }
}
if (prototypeMain && !/targetPlatform/.test(prototypeMain)) {
  errors.push("src/prototype/main.ts must choose the product renderer from targetPlatform.");
}
if (prototypeMain && !/import\(["']\.\/mobile\/MobilePrototype\.vue["']\)/.test(prototypeMain)) {
  errors.push("src/prototype/main.ts must lazy-load the mobile prototype.");
}
if (prototypeMain && !/import\(["']\.\/desktop\/DesktopPrototype\.vue["']\)/.test(prototypeMain)) {
  errors.push("src/prototype/main.ts must lazy-load the desktop prototype.");
}
if (mobileSource && (!/from\s+["']vant["']/.test(mobileSource) || !/vant\/lib\/index\.css/.test(mobileSource))) {
  errors.push("The mobile prototype must use Vant and load Vant CSS inside the prototype document.");
}
if (desktopSource && (!/ant-design-vue/.test(desktopSource) || !/ant-design-vue\/dist\/reset\.css/.test(desktopSource))) {
  errors.push("The desktop prototype must use Ant Design Vue and load its reset inside the prototype document.");
}
if (fileExists("src/workbench/components/PrototypePreview.vue")) {
  const previewSource = readText("src/workbench/components/PrototypePreview.vue");
  if (!/<iframe\b/i.test(previewSource)) {
    errors.push("PrototypePreview.vue must embed prototype.html through an iframe.");
  }
}

const platformMatch = prdData.match(/targetPlatform:\s*["'](mobile|desktop)["']/);
if (!platformMatch) {
  errors.push('src/data/prdData.ts meta must define targetPlatform as "mobile" or "desktop".');
}
if (prdData && !/prototypeViewport:\s*\{[\s\S]*?width:\s*\d+[\s\S]*?height:\s*\d+/.test(prdData)) {
  errors.push("src/data/prdData.ts meta must define a numeric prototypeViewport.");
}

if (sourceText && !/data-req-id(?:s)?=/.test(sourceText)) {
  errors.push("Vue source must bind meaningful elements with data-req-id or data-req-ids.");
}
if (sourceText && /localStorage|sessionStorage|indexedDB/i.test(sourceText)) {
  errors.push("Vue source must not use browser-only storage for PRD review data.");
}
if (viteConfig && !/__prd_file_store/.test(viteConfig)) {
  errors.push("vite.config.ts must include the __prd_file_store middleware for file-backed review data.");
}
if (storeSource && !/loadReviewData/.test(storeSource)) {
  errors.push("src/stores/prd.ts must load review data from project JSON files.");
}
if (storeSource && !/saveDraftReviewData/.test(storeSource)) {
  errors.push("src/stores/prd.ts must save draft review data to review-data/draft.json.");
}
if (storeSource && !/VersionSnapshot|snapshot\s*:|activeVersionSnapshot/i.test(storeSource)) {
  warnings.push("src/stores/prd.ts should freeze and read independent per-version snapshots.");
}

for (const [pattern, warning] of [
  [/PRD 标注/, "Workbench should expose the PRD 标注 view."],
  [/高保真原型/, "Workbench should expose the 高保真原型 view."],
  [/文档查看/, "Workbench should expose the 文档查看 view."],
  [/download|下载/i, "Workbench should include document download affordance."],
  [/zoom|缩放/i, "Workbench should include PRD canvas zoom controls."],
  [/drag|pan|拖动/i, "Workbench should include PRD canvas drag or pan controls."],
  [/addAnnotation|添加标注/i, "Workbench should support adding annotations on the PRD canvas."],
  [/全部标注/, "Workbench should list all annotations separately from comments."],
  [/发版|publishVersion/i, "Workbench should include a page-level release affordance."],
  [/删除版本|deleteVersion/i, "Workbench should support deleting version records."],
  [/renameVersion|重命名版本/i, "Workbench should support renaming finalized version records."],
  [/versionNameExists|版本名称已存在|duplicate/i, "Workbench should prevent duplicate finalized version names."],
  [/isViewingFinalVersion|只读|readonly/i, "Finalized version snapshots should be read-only."],
  [/Modal\.confirm|二次确认|确认删除|确认发版/i, "Release and delete actions should require second confirmation."],
  [/wheel|@wheel|滚轮/i, "The PRD canvas should support mouse-wheel zoom."],
  [/1\.0\.0/, 'The first page-level release name should default to "1.0.0".'],
]) {
  if (workbenchText && !pattern.test(workbenchText)) warnings.push(warning);
}

if (sourceText && !/renameHistory/i.test(sourceText)) {
  warnings.push("Vue source should preserve finalized version rename history.");
}

if (sourceText && !/mermaid/i.test(sourceText)) warnings.push("Vue source should use Mermaid for flowchart or mindmap rendering.");
if (sourceText && !/generatedDocs/.test(sourceText)) warnings.push("Vue source should import generated documents for in-page viewing.");
if (sourceText && !/scenario|场景/i.test(sourceText)) warnings.push("Vue source does not appear to expose scenario switching.");
if (sourceText && !/role|角色/i.test(sourceText)) warnings.push("Vue source does not appear to expose role switching.");
if (sourceText && !/history|version|变更|版本|历史/i.test(sourceText)) warnings.push("Vue source does not appear to expose version or history controls.");
if (sourceText && !/feature|功能|清单/i.test(sourceText)) warnings.push("Vue source should include a left feature menu.");

if (prdData && !/versionHistory/.test(prdData)) warnings.push("src/data/prdData.ts should include versionHistory.");
if (prdData && !/files\s*:/.test(prdData)) warnings.push("src/data/prdData.ts should model feature groups with child files.");
if (prdData && !/boardSections/.test(prdData)) errors.push("src/data/prdData.ts must include boardSections.");
if (prdData && !/prototype/.test(prdData)) errors.push("src/data/prdData.ts must include prototype data.");

if (handoff && !/API|接口|mock/i.test(handoff)) warnings.push("ai-handoff.md should include API or mock contract guidance.");
if (handoff && !/state|状态/i.test(handoff)) warnings.push("ai-handoff.md should include state guidance.");
if (handoff && /^#\s+AI-readable|^##\s+(Functional Points|Scope Boundaries|Field Details|State Details|Mock\/API Assumptions|Likely Issues|Acceptance Checks)/im.test(handoff)) {
  warnings.push("ai-handoff.md should use Simplified Chinese headings and prose by default.");
}
if (handoff && /Suggested page\/component tree|建议组件结构|建议实现任务|implementation tasks|component tree/i.test(handoff)) {
  warnings.push("ai-handoff.md appears to prescribe implementation structure; keep it focused on requirement details and boundaries.");
}

if (docText && !/review-data\/draft\.json/.test(docText)) {
  errors.push("Generated documents must describe draft review data storage at review-data/draft.json.");
}
if (docText && !/versions\/index\.json/.test(docText)) {
  errors.push("Generated documents must describe finalized version index storage at versions/index.json.");
}
if (docText && !/review-data\.json/.test(docText)) {
  errors.push("Generated documents must describe per-version review-data.json snapshots.");
}
if (changelog && !/^##\s+/m.test(changelog)) warnings.push("CHANGELOG.md should include at least one version heading.");
if (changelog && /^#\s+Changelog/im.test(changelog)) {
  warnings.push("CHANGELOG.md should use a Simplified Chinese title and entries by default.");
}

for (const reqId of reqIds) {
  if (!traceability.includes(reqId)) errors.push(`${reqId} is missing from traceability-matrix.md.`);
  if (!sourceText.includes(reqId)) errors.push(`${reqId} is missing from Vue source.`);
  if (!allText.includes(reqId)) errors.push(`${reqId} is not referenced by generated documentation.`);
}

const sourceReqIds = new Set(sourceText.match(/REQ-\d{3,}/g) || []);
for (const reqId of sourceReqIds) {
  if (!reqIds.has(reqId)) warnings.push(`Vue source references ${reqId}, but it is not defined in requirements.json.`);
}

if (errors.length > 0) {
  console.error("PRD Vue3 prototype package validation failed.");
  for (const error of errors) console.error(`- ${error}`);
  if (warnings.length > 0) {
    console.error("\nWarnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("PRD Vue3 prototype package validation passed.");
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
