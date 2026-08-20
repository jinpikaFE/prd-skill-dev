import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "skill");
const skillsRoot = path.join(os.homedir(), ".codex", "skills");
const targetRoot = path.join(skillsRoot, "prd");
const mode = process.argv[2] || "--check";
const ignoredNames = new Set(["node_modules", "dist", ".DS_Store"]);

async function collect(root, current = "") {
  const absolute = path.join(root, current);
  let entries;
  try {
    entries = await fs.readdir(absolute, { withFileTypes: true });
  } catch {
    return {};
  }
  const result = {};
  for (const entry of entries) {
    if (ignoredNames.has(entry.name)) continue;
    const relative = path.join(current, entry.name);
    if (entry.isDirectory()) {
      Object.assign(result, await collect(root, relative));
      continue;
    }
    const content = await fs.readFile(path.join(root, relative));
    result[relative.split(path.sep).join("/")] = crypto.createHash("sha256").update(content).digest("hex");
  }
  return result;
}

async function copyTree(source, target) {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredNames.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) await copyTree(from, to);
    else await fs.copyFile(from, to);
  }
}

const sourceHashes = await collect(sourceRoot);
const targetHashes = await collect(targetRoot);
const sourceText = JSON.stringify(sourceHashes);
const targetText = JSON.stringify(targetHashes);

if (mode === "--check") {
  if (sourceText !== targetText) {
    console.error("安装副本与开发源码不一致。");
    process.exitCode = 1;
  } else {
    console.log("安装副本与开发源码一致。");
  }
} else if (mode === "--install") {
  const staging = path.join(skillsRoot, `.prd-staging-${process.pid}`);
  const backup = path.join(skillsRoot, `.prd-backup-${process.pid}`);
  await fs.rm(staging, { recursive: true, force: true });
  await copyTree(sourceRoot, staging);
  await fs.rename(targetRoot, backup);
  try {
    await fs.rename(staging, targetRoot);
    await fs.rm(backup, { recursive: true, force: true });
  } catch (error) {
    await fs.rename(backup, targetRoot);
    throw error;
  }
  console.log(`已安装 PRD 技能：${targetRoot}`);
} else {
  throw new Error("仅支持 --check 或 --install");
}
