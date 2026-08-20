import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import archiver from "archiver";
import { build } from "vite";

const rootDir = process.cwd();
const versionsDir = path.join(rootDir, "versions");
const publishDir = path.join(rootDir, "publish");

function compactTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}-${values.hour}${values.minute}${values.second}`;
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fsp.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, payload) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function normalizedCommentDate(comment, fallbackDate) {
  const rawDate = String(comment?.createdAt || "");
  const normalizedDate = rawDate.replace(/^(\d{4})\/(\d{2})\/(\d{2})/, "$1-$2-$3");
  const parsedTime = Date.parse(normalizedDate);
  if (Number.isFinite(parsedTime)) return new Date(parsedTime).toISOString();
  const timestamp = Number(String(comment?.id || "").match(/^comment-(\d{13})/)?.[1]);
  if (Number.isFinite(timestamp) && timestamp > 0) return new Date(timestamp).toISOString();
  const normalizedFallback = String(fallbackDate || "").replace(/^(\d{4})\/(\d{2})\/(\d{2})/, "$1-$2-$3");
  const fallbackTime = Date.parse(normalizedFallback);
  return Number.isFinite(fallbackTime) ? new Date(fallbackTime).toISOString() : new Date().toISOString();
}

function normalizeComments(comments, fallbackDate) {
  if (!Array.isArray(comments)) return [];
  return comments.map((comment) => ({
    ...comment,
    createdAt: normalizedCommentDate(comment, fallbackDate),
  }));
}

async function runViteBuild(buildRoot, outputDir) {
  const originalCwd = process.cwd();
  process.chdir(buildRoot);
  try {
    await build({
      root: buildRoot,
      base: "./",
      logLevel: "silent",
      define: {
        "import.meta.env.VITE_PRD_RUNTIME": JSON.stringify("hosted"),
      },
      build: {
        outDir: outputDir,
        emptyOutDir: false,
      },
    });
  } finally {
    process.chdir(originalCwd);
  }
}

async function zipDirectory(sourceDir, zipPath) {
  await fsp.mkdir(path.dirname(zipPath), { recursive: true });
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("warning", (error) => {
      if (error.code !== "ENOENT") reject(error);
    });
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    void archive.finalize();
  });
}

const indexPath = path.join(versionsDir, "index.json");
const versionIndex = await readJson(indexPath, { schemaVersion: 1, versions: [] });
const versions = Array.isArray(versionIndex.versions) ? versionIndex.versions : [];
if (versions.length === 0) {
  throw new Error("请先完成至少一个定版，再生成发布包");
}

const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "prd-review-package-"));
const siteDir = path.join(tempDir, "site");
const generatedAt = new Date().toISOString();
process.env.PRD_RUNTIME = "hosted";

try {
  await runViteBuild(rootDir, siteDir);
  const publishedVersions = [];

  for (const version of versions) {
    const versionDir = path.join(rootDir, version.directory || `versions/${version.id}`);
    const versionOutputDir = path.join(siteDir, "versions", version.id);
    await runViteBuild(versionDir, versionOutputDir);
    const reviewData = await readJson(path.join(versionDir, "review-data.json"), {});
    const reviewComments = await readJson(path.join(versionDir, "review-comments.json"), { comments: [] });
    const snapshot = {
      ...(reviewData.snapshot || {}),
      comments: normalizeComments(reviewData.snapshot?.comments, version.createdAt || generatedAt),
    };
    const normalizedReviewComments = normalizeComments(reviewComments.comments, version.createdAt || generatedAt);
    await writeJson(path.join(versionOutputDir, "review-data.json"), {
      ...reviewData,
      snapshot,
    });
    await writeJson(path.join(versionOutputDir, "review-comments.json"), {
      ...reviewComments,
      comments: normalizedReviewComments,
    });
    publishedVersions.push({
      ...version,
      snapshot,
      reviewComments: normalizedReviewComments,
    });
  }

  const hostedCapabilities = {
    runtime: "hosted",
    hasDraft: false,
    canManageVersions: false,
    canManageAnnotations: false,
    canAddComments: false,
    canManageDraftComments: false,
    canPackage: false,
    canOpenFolder: false,
  };
  await writeJson(path.join(siteDir, "published-state.json"), {
    schemaVersion: 1,
    generatedAt,
    capabilities: hostedCapabilities,
    versions: publishedVersions,
  });
  await writeJson(path.join(siteDir, "deployment-handoff.json"), {
    schemaVersion: 1,
    generatedAt,
    packageType: "prd-review",
    entryFile: "index.html",
    runtime: "hosted",
    defaultCapabilities: hostedCapabilities,
    deploymentRequirements: {
      staticFiles: "将压缩包内容作为站点根目录发布，不要只上传 zip 文件。",
      history: "保留 versions/ 下全部定版历史和相对资源路径。",
      comments: {
        optional: true,
        stateEndpoint: "GET /__prd_file_store/state",
        createEndpoint: "POST /__prd_file_store/comments",
        createBody: {
          versionId: "定版版本 ID",
          annotationId: "标注 ID",
          text: "匿名评论内容",
        },
        rules: [
          "不建立用户体系，不记录评论人。",
          "评论必须包含 ISO 8601 createdAt。",
          "线上评论只允许新增，不提供编辑和删除。",
          "state 接口返回 capabilities.canAddComments=true 后页面才展示评论入口。",
        ],
      },
    },
  });
  await writeJson(path.join(siteDir, "versions", "index.json"), versionIndex);

  const packageName = `${path.basename(rootDir)}-review-${compactTimestamp()}.zip`;
  const packagePath = path.join(publishDir, packageName);
  await zipDirectory(siteDir, packagePath);
  const stat = await fsp.stat(packagePath);
  const codexPrompt = [
    "请帮我将这个 PRD 评审包部署到【目标平台】：",
    packagePath,
    "",
    "请解压后将包内静态站点作为站点根目录直接发布，并保持现有目录结构和相对路径。定版历史查看、画布拖动缩放均已内置；如需开放线上匿名评论，再按包内 deployment-handoff.json 接入评论存储，否则保持只读评审模式。",
  ].join("\n");
  const result = {
    packagePath,
    fileName: packageName,
    versionCount: versions.length,
    generatedAt,
    sizeBytes: stat.size,
    codexPrompt,
  };
  console.log(`PRD_PACKAGE_RESULT:${JSON.stringify(result)}`);
} finally {
  await fsp.rm(tempDir, { recursive: true, force: true });
}
