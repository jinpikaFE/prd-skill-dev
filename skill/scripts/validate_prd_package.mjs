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
  "scripts/build-review-package.mjs",
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
  "src/workbench/components/internal/EllipsisTooltipText.vue",
  "src/workbench/components/internal/RequirementTag.vue",
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
    "archiver",
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
  if (!/build-review-package\.mjs/.test(packageJson.scripts?.["build:review"] || "")) {
    errors.push("package.json build:review must create the platform-neutral finalized review package.");
  }
}

for (const providerSpecificFile of ["vercel.json", "tsconfig.vercel.json", "api/prd-file-store.ts"]) {
  if (fileExists(providerSpecificFile)) {
    errors.push(`${providerSpecificFile} must not be bundled into the platform-neutral PRD template.`);
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
const reviewPanelSource = fileExists("src/workbench/components/ReviewPanel.vue")
  ? readText("src/workbench/components/ReviewPanel.vue")
  : "";
const prdCanvasSource = fileExists("src/workbench/components/PrdCanvas.vue")
  ? readText("src/workbench/components/PrdCanvas.vue")
  : "";
const workbenchAppSource = fileExists("src/workbench/WorkbenchApp.vue")
  ? readText("src/workbench/WorkbenchApp.vue")
  : "";
const reviewPackageSource = fileExists("scripts/build-review-package.mjs")
  ? readText("scripts/build-review-package.mjs")
  : "";
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
const nativeTitleOnInteractiveControl = /<(?:(?:button|a|input|select|textarea)|a-button|a-menu-item)(?=[\s/>])[^>]*\s+(?:v-bind:|:)?title\s*=/gi;
const nativeTitleMatches = workbenchText.match(nativeTitleOnInteractiveControl) || [];
if (nativeTitleMatches.length > 0) {
  errors.push("Workbench interactive controls must use Ant Design Vue Tooltip instead of native title attributes.");
}
if (fileExists("src/workbench/components/internal/EllipsisTooltipText.vue")) {
  const ellipsisTooltipSource = readText("src/workbench/components/internal/EllipsisTooltipText.vue");
  if (!/<a-tooltip\b/i.test(ellipsisTooltipSource)) {
    errors.push("EllipsisTooltipText.vue must render an Ant Design Vue Tooltip.");
  }
  if (!/ResizeObserver/.test(ellipsisTooltipSource)) {
    errors.push("EllipsisTooltipText.vue must observe size changes with ResizeObserver.");
  }
  if (!/scrollWidth\s*>\s*element\.clientWidth/.test(ellipsisTooltipSource)
    || !/scrollHeight\s*>\s*element\.clientHeight/.test(ellipsisTooltipSource)) {
    errors.push("EllipsisTooltipText.vue must detect real horizontal and vertical overflow.");
  }
  if (!/rows\??:\s*number/.test(ellipsisTooltipSource) || !/-webkit-box-orient|WebkitLineClamp/.test(ellipsisTooltipSource)) {
    errors.push("EllipsisTooltipText.vue must support explicit multi-line truncation rows.");
  }
}
if (fileExists("src/workbench/components/internal/RequirementTag.vue")) {
  const requirementTagSource = readText("src/workbench/components/internal/RequirementTag.vue");
  if (!/<a-tooltip\b/i.test(requirementTagSource)
    || !/requirements:\s*Requirement\[\]/.test(requirementTagSource)
    || !/acceptanceCriteria/.test(requirementTagSource)) {
    errors.push("RequirementTag.vue must show requirement details and acceptance content through Ant Design Vue Tooltip.");
  }
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
if (prototypeMain && !/import\(["']ant-design-vue["']\)/.test(prototypeMain)) {
  errors.push("src/prototype/main.ts must register Ant Design Vue for the desktop prototype.");
}
if (prototypeMain && !/import\(["']ant-design-vue\/dist\/reset\.css["']\)/.test(prototypeMain)) {
  errors.push("src/prototype/main.ts must load the Ant Design Vue reset before mounting the desktop prototype.");
}
if (prototypeMain && !/\.use\(Antd\)/.test(prototypeMain)) {
  errors.push("src/prototype/main.ts must install Ant Design Vue before mounting the desktop prototype.");
}
if (prototypeMain && !/import\(["']vant\/lib\/index\.css["']\)/.test(prototypeMain)) {
  errors.push("src/prototype/main.ts must load Vant CSS before mounting the mobile prototype.");
}
if (mobileSource && (!/from\s+["']vant["']/.test(mobileSource) || !/<van-/i.test(mobileSource))) {
  errors.push("The mobile prototype must render Vant components.");
}
if (desktopSource && (!/ant-design-vue/.test(desktopSource) || !/<a-/i.test(desktopSource))) {
  errors.push("The desktop prototype must render Ant Design Vue components.");
}
for (const file of sourceFiles.filter((sourceFile) => sourceFile.startsWith("src/prototype/") && sourceFile.endsWith(".vue"))) {
  const componentSource = readText(file);
  const hasScopedStyle = /<style\b[^>]*\bscoped\b/i.test(componentSource);
  const hasRenderFunctionChildren = /defineComponent\s*\(/.test(componentSource) && /\bh\s*\(/.test(componentSource);
  if (hasScopedStyle && hasRenderFunctionChildren) {
    errors.push(`${file} must not rely on a parent scoped style for defineComponent + h() child components. Split them into styled SFCs or use prototype-global CSS.`);
  }
}
if (fileExists("src/workbench/components/PrototypePreview.vue")) {
  const previewSource = readText("src/workbench/components/PrototypePreview.vue");
  if (!/<iframe\b/i.test(previewSource)) {
    errors.push("PrototypePreview.vue must embed prototype.html through an iframe.");
  }
  if (!/<RequirementTag\b/.test(previewSource)) {
    errors.push("PrototypePreview.vue must render requirement IDs with RequirementTag tooltips.");
  }
}
if (fileExists("src/workbench/components/PrdCanvas.vue") && !/<RequirementTag\b/.test(readText("src/workbench/components/PrdCanvas.vue"))) {
  errors.push("PrdCanvas.vue must render requirement IDs with RequirementTag tooltips.");
}
if (fileExists("src/workbench/components/ReviewPanel.vue") && !/<RequirementTag\b/.test(readText("src/workbench/components/ReviewPanel.vue"))) {
  errors.push("ReviewPanel.vue must render the selected requirement with a RequirementTag tooltip.");
}
if (reviewPanelSource && (!/创建时间/.test(reviewPanelSource) || !/formatCommentDate/.test(reviewPanelSource))) {
  errors.push("ReviewPanel.vue must visibly render every comment creation date.");
}
if (fileExists("src/workbench/components/DocumentViewer.vue")) {
  const documentViewerSource = readText("src/workbench/components/DocumentViewer.vue");
  if (!/<template\s+#icon>\s*<FileTextOutlined\s*\/>\s*<\/template>/i.test(documentViewerSource)) {
    errors.push("DocumentViewer.vue must render document menu icons through the Ant Design Vue icon slot.");
  }
}
if (fileExists("src/workbench/components/WorkbenchHeader.vue")) {
  const workbenchHeaderSource = readText("src/workbench/components/WorkbenchHeader.vue");
  if (!/FolderOpenOutlined/.test(workbenchHeaderSource)
    || !/打开当前原型所在文件夹/.test(workbenchHeaderSource)
    || !/openFolder/.test(workbenchHeaderSource)) {
    errors.push("WorkbenchHeader.vue must provide the current prototype folder action with a tooltip.");
  }
  if (!/:options=["']renderedVersionOptions["']/.test(workbenchHeaderSource)
    || !/h\(EllipsisTooltipText/.test(workbenchHeaderSource)
    || !/className:\s*["']history-option-label["']/.test(workbenchHeaderSource)) {
    errors.push("Workbench history options must use EllipsisTooltipText nodes instead of native Select title tooltips.");
  }
}
if (fileExists("src/workbench/components/internal/CalloutList.vue")) {
  const calloutListSource = readText("src/workbench/components/internal/CalloutList.vue");
  if (!/class=["']callout-index["']/.test(calloutListSource)) {
    errors.push("CalloutList.vue must identify the annotation number with the callout-index class.");
  }
}
if (fileExists("src/styles.css") && /\.callout-item(?:\.active)?\s*>\s*span/.test(readText("src/styles.css"))) {
  errors.push("Callout number styles must target callout-index instead of every direct span child.");
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
if (viteConfig && (!/node:child_process/.test(viteConfig) || !/endpoint\s*===\s*["']\/open-folder["']/.test(viteConfig))) {
  errors.push("vite.config.ts must provide the local open-folder endpoint for the active prototype directory.");
}
if (storeSource && !/loadReviewData/.test(storeSource)) {
  errors.push("src/stores/prd.ts must load review data from project JSON files.");
}
if (storeSource && !/saveDraftReviewData/.test(storeSource)) {
  errors.push("src/stores/prd.ts must save draft review data to review-data/draft.json.");
}
if (storeSource && !/openPrototypeFolder/.test(storeSource)) {
  errors.push("src/stores/prd.ts must expose the current prototype folder action.");
}
if (storeSource && !/openReviewPackageFolder/.test(storeSource)) {
  errors.push("src/stores/prd.ts must expose the generated review package folder action.");
}
if (storeSource && (!/addVersionComment/.test(storeSource) || !/createdAt:\s*nowText\(\)/.test(storeSource))) {
  errors.push("src/stores/prd.ts must support finalized-version comments and timestamp new draft comments.");
}
if (prdCanvasSource && (!/canAddAnnotation/.test(prdCanvasSource) || !/panMode\.value/.test(prdCanvasSource))) {
  errors.push("PrdCanvas.vue must keep canvas pan/zoom independent from finalized annotation editing.");
}
if (workbenchAppSource && (!/runtimeCapabilities/.test(workbenchAppSource)
  || !/reviewComments/.test(workbenchAppSource)
  || !/can-package/.test(workbenchAppSource)
  || !/formatDateTime\(packageResult\.generatedAt\)/.test(workbenchAppSource)
  || !/打开 ZIP 所在目录/.test(workbenchAppSource))) {
  errors.push("WorkbenchApp.vue must drive local/hosted actions from runtime capabilities and merge post-release comments.");
}
if (viteConfig && (!/review-comments\.json/.test(viteConfig)
  || !/endpoint\s*===\s*["']\/comments["']/.test(viteConfig)
  || !/endpoint\s*===\s*["']\/package["']/.test(viteConfig)
  || !/endpoint\s*===\s*["']\/package-status["']/.test(viteConfig)
  || !/endpoint\s*===\s*["']\/open-package-folder["']/.test(viteConfig)
  || !/PRD_RUNTIME/.test(viteConfig))) {
  errors.push("vite.config.ts must provide local finalized comments, review-package creation, and runtime-mode injection.");
}
if (reviewPackageSource && (!/base:\s*["']\.\/["']/.test(reviewPackageSource)
  || !/from\s+["']vite["']/.test(reviewPackageSource)
  || !/from\s+["']archiver["']/.test(reviewPackageSource)
  || !/published-state\.json/.test(reviewPackageSource)
  || !/deployment-handoff\.json/.test(reviewPackageSource)
  || !/review-comments\.json/.test(reviewPackageSource)
  || !/runtime:\s*["']hosted["']/.test(reviewPackageSource)
  || !/canAddComments:\s*false/.test(reviewPackageSource)
  || !/定版历史查看、画布拖动缩放均已内置/.test(reviewPackageSource)
  || /需要保留定版历史查看、画布拖动缩放/.test(reviewPackageSource))) {
  errors.push("The review-package script must build relative assets, include finalized data and deployment handoff, and default hosted comments to disabled.");
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
