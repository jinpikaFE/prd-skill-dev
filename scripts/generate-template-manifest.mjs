import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(repoRoot, "skill", "assets", "vue3-prd-template");
const lockedEntries = [
  "AGENTS.md",
  "index.html",
  "prototype.html",
  "vite.config.ts",
  "src/App.vue",
  "src/main.ts",
  "src/styles.css",
  "src/types.ts",
  "src/stores/prd.ts",
  "src/workbench",
];

async function filesUnder(entry) {
  const absolute = path.join(templateRoot, entry);
  const stat = await fs.stat(absolute);
  if (stat.isFile()) return [entry];
  const children = await fs.readdir(absolute);
  const nested = await Promise.all(children.map((child) => filesUnder(path.join(entry, child))));
  return nested.flat();
}

function hash(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

const lockedFiles = {};
for (const entry of lockedEntries) {
  for (const file of await filesUnder(entry)) {
    lockedFiles[file.split(path.sep).join("/")] = hash(await fs.readFile(path.join(templateRoot, file)));
  }
}

const manifest = {
  schemaVersion: 1,
  templateVersion: "2.0.0",
  workbenchUiLibrary: "ant-design-vue",
  prototypeUiLibraries: {
    mobile: "vant",
    desktop: "ant-design-vue",
  },
  lockedFiles,
  extensionPaths: [
    "src/prototype/",
    "src/data/prdData.ts",
    "src/data/generatedDocs.ts",
    "prd.md",
    "requirements.json",
    "traceability-matrix.md",
    "ai-handoff.md",
    "CHANGELOG.md",
    "review-data/",
    "versions/",
  ],
};

await fs.writeFile(path.join(templateRoot, ".prd-template.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`已更新模板锁定清单，共 ${Object.keys(lockedFiles).length} 个文件。`);
