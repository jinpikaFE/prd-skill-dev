#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const targetDir = process.argv[2];

if (!targetDir) {
  console.error("Usage: node validate_prd_package.mjs <prd-package-dir>");
  process.exit(2);
}

const requiredFiles = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "index.html",
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
  "review-data/draft.json",
  "prd.md",
  "requirements.json",
  "traceability-matrix.md",
  "ai-handoff.md",
  "CHANGELOG.md",
  "versions/index.json",
];

const sourceFiles = [
  "src/main.ts",
  "src/App.vue",
  "src/styles.css",
  "src/types.ts",
  "src/vite-env.d.ts",
  "src/data/generatedDocs.ts",
  "src/data/prdData.ts",
  "src/stores/prd.ts",
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

function readText(file) {
  return fs.readFileSync(filePath(file), "utf8");
}

function fileExists(file) {
  return fs.existsSync(filePath(file));
}

for (const file of requiredFiles) {
  if (!fileExists(file)) {
    errors.push(`Missing required file: ${file}`);
  }
}

let packageJson = null;
if (fileExists("package.json")) {
  try {
    packageJson = JSON.parse(readText("package.json"));
  } catch (error) {
    errors.push(`package.json is not valid JSON: ${error.message}`);
  }
}

if (packageJson) {
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  for (const dependency of [
    "vue",
    "pinia",
    "vite",
    "typescript",
    "@vitejs/plugin-vue",
    "vant",
    "markdown-it",
    "mermaid",
  ]) {
    if (!dependencies[dependency]) {
      errors.push(`package.json must include ${dependency}.`);
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

if (fileExists("pnpm-workspace.yaml")) {
  const pnpmWorkspace = readText("pnpm-workspace.yaml");
  if (!/allowBuilds/.test(pnpmWorkspace)) {
    warnings.push("pnpm-workspace.yaml should record approved dependency build scripts.");
  }
}

let requirements = [];
let requirementsJson = null;

if (fileExists("requirements.json")) {
  try {
    requirementsJson = JSON.parse(readText("requirements.json"));
    requirements = Array.isArray(requirementsJson.requirements)
      ? requirementsJson.requirements
      : [];
  } catch (error) {
    errors.push(`requirements.json is not valid JSON: ${error.message}`);
  }
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

  if (reqIds.has(requirement.id)) {
    errors.push(`Duplicate requirement id: ${requirement.id}`);
  }
  reqIds.add(requirement.id);

  if (!requirement.title) {
    warnings.push(`${requirement.id} is missing title.`);
  }
  if (!Array.isArray(requirement.acceptanceCriteria) || requirement.acceptanceCriteria.length === 0) {
    warnings.push(`${requirement.id} is missing acceptanceCriteria.`);
  }
}

const existingText = {};
for (const file of requiredFiles.filter(fileExists)) {
  existingText[file] = readText(file);
}

const indexHtml = existingText["index.html"] || "";
const appVue = existingText["src/App.vue"] || "";
const prdData = existingText["src/data/prdData.ts"] || "";
const storeSource = existingText["src/stores/prd.ts"] || "";
const viteConfig = existingText["vite.config.ts"] || "";
const traceability = existingText["traceability-matrix.md"] || "";
const handoff = existingText["ai-handoff.md"] || "";
const changelog = existingText["CHANGELOG.md"] || "";

const sourceText = sourceFiles
  .filter(fileExists)
  .map((file) => readText(file))
  .join("\n");

const docText = docFiles
  .filter(fileExists)
  .map((file) => readText(file))
  .join("\n");

const allText = `${sourceText}\n${docText}`;

if (indexHtml && !/src\/main\.ts/.test(indexHtml)) {
  errors.push("index.html must load the Vue entry at /src/main.ts.");
}

if (sourceText && !/data-req-id(?:s)?=/.test(sourceText)) {
  errors.push("Vue source must bind meaningful elements with data-req-id or data-req-ids.");
}

if (sourceText && /localStorage|sessionStorage|indexedDB/i.test(sourceText)) {
  errors.push("Vue source must not use browser-only storage for PRD review data. Use review-data/draft.json and versions/*.json.");
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

if (storeSource && !/review-data\/draft\.json|\/draft/.test(storeSource)) {
  warnings.push("src/stores/prd.ts should make draft review persistence explicit.");
}

if (appVue && !/PRD 标注/.test(appVue)) {
  warnings.push("src/App.vue should expose the PRD 标注 view.");
}

if (appVue && !/高保真原型/.test(appVue)) {
  warnings.push("src/App.vue should expose the 高保真原型 view.");
}

if (appVue && !/文档查看/.test(appVue)) {
  warnings.push("src/App.vue should expose the 文档查看 view.");
}

if (appVue && !/评论|comment/i.test(appVue)) {
  warnings.push("src/App.vue should support PRD comments.");
}

if (appVue && !/download|下载/i.test(appVue)) {
  warnings.push("src/App.vue should include document download affordance.");
}

if (appVue && !/zoom|缩放/i.test(appVue)) {
  warnings.push("src/App.vue should include PRD canvas zoom controls.");
}

if (appVue && !/drag|pan|拖动/i.test(appVue)) {
  warnings.push("src/App.vue should include PRD canvas drag or pan controls.");
}

if (appVue && !/addAnnotation|添加标注/i.test(appVue)) {
  warnings.push("src/App.vue should support adding annotations on the PRD canvas.");
}

if (appVue && !/全部标注/.test(appVue)) {
  warnings.push("src/App.vue should list all annotations separately from comments.");
}

if (appVue && !/发版|publishVersion/i.test(appVue)) {
  warnings.push("src/App.vue should include a page-level release affordance.");
}

if (appVue && !/删除版本|deleteVersion/i.test(appVue)) {
  warnings.push("src/App.vue should support deleting version records.");
}

if (sourceText && !/VersionSnapshot|snapshot\s*:|activeVersionSnapshot/i.test(sourceText)) {
  warnings.push("Vue source should freeze and read independent per-version snapshots.");
}

if (sourceText && !/renameVersion|重命名版本/i.test(sourceText)) {
  warnings.push("Vue source should support renaming finalized version records.");
}

if (sourceText && !/renameHistory/i.test(sourceText)) {
  warnings.push("Vue source should preserve finalized version rename history.");
}

if (sourceText && !/versionNameExists|版本名称已存在|duplicate/i.test(sourceText)) {
  warnings.push("Vue source should prevent duplicate finalized version names on release or rename.");
}

if (appVue && !/van-picker/i.test(appVue)) {
  warnings.push("src/App.vue should use Vant picker for history and review selectors.");
}

if (appVue && !/van-popup/i.test(appVue)) {
  warnings.push("src/App.vue should use Vant popup/dialog controls for release, rename, or selectors.");
}

if (appVue && /<select\b/i.test(appVue)) {
  warnings.push("src/App.vue should avoid native select controls when a Vant selector is available.");
}

if (appVue && !/1\.0\.0/.test(appVue)) {
  warnings.push('src/App.vue should default the first page-level release name to "1.0.0".');
}

if (sourceText && !/isViewingFinalVersion|只读|readonly/i.test(sourceText)) {
  warnings.push("Vue source should make finalized version snapshots read-only for annotations and comments.");
}

if (appVue && !/showConfirmDialog|二次确认|确认删除|确认发版/i.test(appVue)) {
  warnings.push("src/App.vue should require second confirmation for release and delete actions.");
}

if (appVue && !/wheel|@wheel|滚轮/i.test(appVue)) {
  warnings.push("src/App.vue should support mouse-wheel zoom on the PRD canvas.");
}

if (sourceText && !/mermaid/i.test(sourceText)) {
  warnings.push("Vue source should use Mermaid for flowchart or mindmap rendering.");
}

if (sourceText && !/generatedDocs/.test(sourceText)) {
  warnings.push("Vue source should import generated documents for in-page viewing.");
}

if (sourceText && !/scenario|场景/i.test(sourceText)) {
  warnings.push("Vue source does not appear to expose scenario switching.");
}

if (sourceText && !/role|角色/i.test(sourceText)) {
  warnings.push("Vue source does not appear to expose role switching.");
}

if (sourceText && !/history|version|变更|版本|历史/i.test(sourceText)) {
  warnings.push("Vue source does not appear to expose version or history controls.");
}

if (sourceText && !/feature|功能|清单/i.test(sourceText)) {
  warnings.push("Vue source should include a left feature or requirement menu.");
}

if (prdData && !/versionHistory/.test(prdData)) {
  warnings.push("src/data/prdData.ts should include versionHistory.");
}

if (prdData && !/files\s*:/.test(prdData)) {
  warnings.push("src/data/prdData.ts should model the left menu as feature groups with child files.");
}

if (prdData && !/boardSections/.test(prdData)) {
  errors.push("src/data/prdData.ts must include boardSections.");
}

if (prdData && !/prototype/.test(prdData)) {
  errors.push("src/data/prdData.ts must include prototype data.");
}

if (handoff && !/API|接口|mock/i.test(handoff)) {
  warnings.push("ai-handoff.md should include API or mock contract guidance.");
}

if (handoff && !/state|状态/i.test(handoff)) {
  warnings.push("ai-handoff.md should include state guidance.");
}

if (
  handoff &&
  /^#\s+AI-readable|^##\s+(Functional Points|Scope Boundaries|Field Details|State Details|Mock\/API Assumptions|Likely Issues|Acceptance Checks)/im.test(
    handoff,
  )
) {
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

if (changelog && !/^##\s+/m.test(changelog)) {
  warnings.push("CHANGELOG.md should include at least one version heading.");
}

if (changelog && /^#\s+Changelog/im.test(changelog)) {
  warnings.push("CHANGELOG.md should use a Simplified Chinese title and entries by default.");
}

for (const reqId of reqIds) {
  if (!traceability.includes(reqId)) {
    errors.push(`${reqId} is missing from traceability-matrix.md.`);
  }
  if (!sourceText.includes(reqId)) {
    errors.push(`${reqId} is missing from Vue source.`);
  }
  if (!allText.includes(reqId)) {
    errors.push(`${reqId} is not referenced by generated documentation.`);
  }
}

const sourceReqIds = new Set(sourceText.match(/REQ-\d{3,}/g) || []);
for (const reqId of sourceReqIds) {
  if (!reqIds.has(reqId)) {
    warnings.push(`Vue source references ${reqId}, but it is not defined in requirements.json.`);
  }
}

if (errors.length > 0) {
  console.error("PRD Vue3 prototype package validation failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  if (warnings.length > 0) {
    console.error("\nWarnings:");
    for (const warning of warnings) {
      console.error(`- ${warning}`);
    }
  }
  process.exit(1);
}

console.log("PRD Vue3 prototype package validation passed.");
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}
