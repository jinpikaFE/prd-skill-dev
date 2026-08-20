import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";

type VersionSnapshot = {
  customAnnotations: unknown[];
  annotationEdits: Record<string, unknown>;
  deletedAnnotationIds: string[];
  comments: unknown[];
};

type ReviewComment = {
  id: string;
  annotationId: string;
  text: string;
  createdAt: string;
  status: "open";
};

type VersionRecord = {
  id: string;
  releaseId?: string;
  name: string;
  label: string;
  status: "final";
  createdAt: string;
  updatedAt?: string;
  snapshotSummary: string;
  source: "workspace";
  deletable: true;
  directory: string;
  reviewDataPath: string;
  renameHistory?: Array<{
    from: string;
    to: string;
    renamedAt: string;
  }>;
};

type VersionIndexFile = {
  schemaVersion: 1;
  updatedAt: string;
  versions: VersionRecord[];
};

type DraftReviewFile = {
  schemaVersion: 1;
  updatedAt: string;
  snapshot: VersionSnapshot;
};

type VersionReviewFile = DraftReviewFile & {
  version: VersionRecord;
};

type VersionCommentsFile = {
  schemaVersion: 1;
  updatedAt: string;
  comments: ReviewComment[];
};

const reviewApiPrefix = "/__prd_file_store";
const localCapabilities = {
  runtime: "local",
  hasDraft: true,
  canManageVersions: true,
  canManageAnnotations: true,
  canAddComments: true,
  canManageDraftComments: true,
  canPackage: true,
  canOpenFolder: true,
} as const;
const workspaceEntries = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "index.html",
  "prototype.html",
  ".prd-template.json",
  "vite.config.ts",
  "tsconfig.json",
  "tsconfig.node.json",
  "prd.md",
  "requirements.json",
  "traceability-matrix.md",
  "ai-handoff.md",
  "CHANGELOG.md",
  "AGENTS.md",
  "src",
  "scripts",
];

function nowText() {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function versionIdFromName(name: string) {
  const trimmed = name.trim();
  if (!/^\d+\.\d+\.\d+$/.test(trimmed)) {
    throw new Error("版本名称必须使用 X.Y.Z 格式，例如 1.0.0");
  }

  return `v${trimmed}`;
}

function jsonResponse(res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void }, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload, null, 2));
}

async function readJsonBody(req: { setEncoding: (encoding: BufferEncoding) => void; on: (event: string, listener: (chunk?: unknown) => void) => void }) {
  let body = "";

  await new Promise<void>((resolve, reject) => {
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += String(chunk || "");
    });
    req.on("end", () => resolve());
    req.on("error", () => reject(new Error("读取请求内容失败")));
  });

  if (!body.trim()) {
    return {};
  }

  return JSON.parse(body) as Record<string, unknown>;
}

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, payload: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function openDirectory(directoryPath: string) {
  const commands: Partial<Record<NodeJS.Platform, string>> = {
    darwin: "open",
    win32: "explorer",
  };
  const command = commands[process.platform] || "xdg-open";

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, [directoryPath], {
      detached: true,
      stdio: "ignore",
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

async function runCommand(command: string, args: string[], cwd: string) {
  return new Promise<string>((resolve, reject) => {
    let output = "";
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, CI: "1", NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => { output += String(chunk); });
    child.stderr.on("data", (chunk) => { output += String(chunk); });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
        return;
      }
      reject(new Error(output.trim() || `${command} 执行失败`));
    });
  });
}

function createReviewFileStorePlugin(): Plugin {
  let rootDir = process.cwd();

  function reviewDataDir() {
    return path.join(rootDir, "review-data");
  }

  function versionsDir() {
    return path.join(rootDir, "versions");
  }

  function draftFilePath() {
    return path.join(reviewDataDir(), "draft.json");
  }

  function versionIndexPath() {
    return path.join(versionsDir(), "index.json");
  }

  function versionDir(versionId: string) {
    return path.join(versionsDir(), versionId);
  }

  function versionReviewPath(versionId: string) {
    return path.join(versionDir(versionId), "review-data.json");
  }

  function versionCommentsPath(versionId: string) {
    return path.join(versionDir(versionId), "review-comments.json");
  }

  async function prototypeFolder(versionId: string) {
    if (!versionId || versionId === "draft") {
      return rootDir;
    }

    if (!/^v\d+\.\d+\.\d+$/.test(versionId)) {
      throw new Error("原型版本目录格式不正确");
    }

    const directoryPath = versionDir(versionId);
    if (!(await pathExists(directoryPath))) {
      throw new Error("当前原型版本目录不存在");
    }

    return directoryPath;
  }

  async function readVersionIndex() {
    const indexFile = await readJsonFile<VersionIndexFile>(versionIndexPath(), {
      schemaVersion: 1,
      updatedAt: nowText(),
      versions: [],
    });

    return Array.isArray(indexFile.versions) ? indexFile.versions : [];
  }

  async function writeVersionIndex(versions: VersionRecord[]) {
    await writeJsonFile(versionIndexPath(), {
      schemaVersion: 1,
      updatedAt: nowText(),
      versions,
    } satisfies VersionIndexFile);
  }

  async function readVersionSnapshot(versionId: string) {
    const reviewFile = await readJsonFile<VersionReviewFile | undefined>(versionReviewPath(versionId), undefined);
    return reviewFile?.snapshot;
  }

  async function readVersionComments(versionId: string) {
    const file = await readJsonFile<VersionCommentsFile | undefined>(versionCommentsPath(versionId), undefined);
    return Array.isArray(file?.comments) ? file.comments : [];
  }

  async function writeVersionComments(versionId: string, comments: ReviewComment[]) {
    await writeJsonFile(versionCommentsPath(versionId), {
      schemaVersion: 1,
      updatedAt: nowText(),
      comments,
    } satisfies VersionCommentsFile);
  }

  async function readState() {
    const draftFile = await readJsonFile<DraftReviewFile | undefined>(draftFilePath(), undefined);
    const versions = await Promise.all(
      (await readVersionIndex()).map(async (version) => ({
        ...version,
        snapshot: await readVersionSnapshot(version.id),
        reviewComments: await readVersionComments(version.id),
      })),
    );

    return {
      capabilities: localCapabilities,
      draft: draftFile?.snapshot,
      versions,
    };
  }

  async function copyEntry(source: string, target: string) {
    if (path.basename(source) === ".DS_Store") {
      return;
    }

    const stat = await fs.stat(source);
    if (stat.isDirectory()) {
      await fs.mkdir(target, { recursive: true });
      const children = await fs.readdir(source);
      for (const child of children) {
        await copyEntry(path.join(source, child), path.join(target, child));
      }
      return;
    }

    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  }

  async function copyWorkspaceSnapshot(targetDir: string) {
    await fs.mkdir(targetDir, { recursive: true });
    for (const entry of workspaceEntries) {
      const source = path.join(rootDir, entry);
      if (await pathExists(source)) {
        await copyEntry(source, path.join(targetDir, entry));
      }
    }
  }

  async function writeVersionReviewData(version: VersionRecord, snapshot: VersionSnapshot) {
    await writeJsonFile(versionReviewPath(version.id), {
      schemaVersion: 1,
      updatedAt: nowText(),
      version,
      snapshot,
    } satisfies VersionReviewFile);
  }

  async function releaseVersion(name: string, snapshot: VersionSnapshot) {
    const versionId = versionIdFromName(name);
    const versions = await readVersionIndex();
    if (versions.some((version) => version.id === versionId || version.name === name)) {
      throw new Error("版本名称已存在，请换一个名称");
    }

    const version: VersionRecord = {
      id: versionId,
      releaseId: `release-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`,
      name,
      label: name,
      status: "final",
      createdAt: nowText(),
      snapshotSummary: `页面定版 ${name}`,
      source: "workspace",
      deletable: true,
      directory: `versions/${versionId}`,
      reviewDataPath: `versions/${versionId}/review-data.json`,
      renameHistory: [],
    };

    await copyWorkspaceSnapshot(versionDir(versionId));
    await writeVersionReviewData(version, snapshot);
    await writeVersionComments(version.id, []);
    await writeVersionIndex([version, ...versions]);
    return version;
  }

  async function renameVersion(versionId: string, name: string) {
    const nextVersionId = versionIdFromName(name);
    const versions = await readVersionIndex();
    const current = versions.find((version) => version.id === versionId);
    if (!current) {
      throw new Error("未找到要重命名的版本");
    }

    if (versions.some((version) => version.id !== versionId && (version.id === nextVersionId || version.name === name))) {
      throw new Error("版本名称已存在，请换一个名称");
    }

    const snapshot = await readVersionSnapshot(versionId);
    const renamedAt = nowText();
    const renamed: VersionRecord = {
      ...current,
      releaseId: current.releaseId || current.id,
      id: nextVersionId,
      name,
      label: name,
      updatedAt: renamedAt,
      directory: `versions/${nextVersionId}`,
      reviewDataPath: `versions/${nextVersionId}/review-data.json`,
      renameHistory: [
        ...(current.renameHistory || []),
        {
          from: current.name || current.label,
          to: name,
          renamedAt,
        },
      ],
    };

    if (versionId !== nextVersionId) {
      await fs.rename(versionDir(versionId), versionDir(nextVersionId));
    }

    if (snapshot) {
      await writeVersionReviewData(renamed, snapshot);
    }

    await writeVersionIndex(
      versions.map((version) => {
        if (version.id === versionId) {
          return renamed;
        }

        return version;
      }),
    );
  }

  async function deleteVersion(versionId: string) {
    const versions = await readVersionIndex();
    await fs.rm(versionDir(versionId), { recursive: true, force: true });
    await writeVersionIndex(versions.filter((version) => version.id !== versionId));
  }

  async function addVersionComment(versionId: string, annotationId: string, text: string) {
    const versions = await readVersionIndex();
    if (!versions.some((version) => version.id === versionId)) {
      throw new Error("未找到要评论的定版版本");
    }
    const trimmed = text.trim();
    if (!annotationId || !trimmed) {
      throw new Error("请选择标注并填写评论内容");
    }
    if (trimmed.length > 1000) {
      throw new Error("评论内容不能超过 1000 个字符");
    }
    const comments = await readVersionComments(versionId);
    comments.unshift({
      id: `comment-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      annotationId,
      text: trimmed,
      createdAt: new Date().toISOString(),
      status: "open",
    });
    await writeVersionComments(versionId, comments);
  }

  function publishDirectory() {
    return path.join(rootDir, "publish");
  }

  async function latestReviewPackage() {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(publishDirectory());
    } catch {
      return undefined;
    }
    const packages = await Promise.all(
      entries.filter((entry) => entry.endsWith(".zip")).map(async (entry) => {
        const packagePath = path.join(publishDirectory(), entry);
        const stat = await fs.stat(packagePath);
        return {
          packagePath,
          fileName: entry,
          generatedAt: stat.mtime.toISOString(),
          sizeBytes: stat.size,
          modifiedAt: stat.mtimeMs,
        };
      }),
    );
    packages.sort((left, right) => right.modifiedAt - left.modifiedAt);
    const latest = packages[0];
    if (!latest) return undefined;
    return {
      packagePath: latest.packagePath,
      fileName: latest.fileName,
      generatedAt: latest.generatedAt,
      sizeBytes: latest.sizeBytes,
    };
  }

  async function packageStatus() {
    return {
      versionCount: (await readVersionIndex()).length,
      publishDirectory: publishDirectory(),
      lastPackage: await latestReviewPackage(),
    };
  }

  async function createReviewPackage() {
    if ((await readVersionIndex()).length === 0) {
      throw new Error("请先完成至少一个定版，再生成发布包");
    }
    const output = await runCommand(process.execPath, ["scripts/build-review-package.mjs"], rootDir);
    const resultLine = output.split("\n").reverse().find((line) => line.startsWith("PRD_PACKAGE_RESULT:"));
    if (!resultLine) {
      throw new Error("发布包已生成，但未能读取打包结果");
    }
    return JSON.parse(resultLine.slice("PRD_PACKAGE_RESULT:".length)) as Record<string, unknown>;
  }

  return {
    name: "prd-review-file-store",
    configResolved(config) {
      rootDir = config.root;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(reviewApiPrefix)) {
          next();
          return;
        }

        try {
          const endpoint = req.url.split("?")[0].replace(reviewApiPrefix, "");
          if (req.method === "GET" && endpoint === "/state") {
            jsonResponse(res, 200, await readState());
            return;
          }

          if (req.method === "GET" && endpoint === "/package-status") {
            jsonResponse(res, 200, await packageStatus());
            return;
          }

          const body = await readJsonBody(req);
          if (req.method === "PUT" && endpoint === "/draft") {
            await writeJsonFile(draftFilePath(), {
              schemaVersion: 1,
              updatedAt: nowText(),
              snapshot: body.snapshot as VersionSnapshot,
            } satisfies DraftReviewFile);
            jsonResponse(res, 200, await readState());
            return;
          }

          if (req.method === "POST" && endpoint === "/release") {
            await releaseVersion(String(body.name || ""), body.snapshot as VersionSnapshot);
            jsonResponse(res, 200, await readState());
            return;
          }

          if (req.method === "POST" && endpoint === "/rename") {
            await renameVersion(String(body.versionId || ""), String(body.name || ""));
            jsonResponse(res, 200, await readState());
            return;
          }

          if (req.method === "POST" && endpoint === "/delete") {
            await deleteVersion(String(body.versionId || ""));
            jsonResponse(res, 200, await readState());
            return;
          }


          if (req.method === "POST" && endpoint === "/comments") {
            await addVersionComment(
              String(body.versionId || ""),
              String(body.annotationId || ""),
              String(body.text || ""),
            );
            jsonResponse(res, 200, await readState());
            return;
          }

          if (req.method === "POST" && endpoint === "/open-folder") {
            const folderPath = await prototypeFolder(String(body.versionId || "draft"));
            await openDirectory(folderPath);
            jsonResponse(res, 200, { folderPath });
            return;
          }

          if (req.method === "POST" && endpoint === "/open-package-folder") {
            const folderPath = publishDirectory();
            await fs.mkdir(folderPath, { recursive: true });
            await openDirectory(folderPath);
            jsonResponse(res, 200, { folderPath });
            return;
          }


          if (req.method === "POST" && endpoint === "/package") {
            jsonResponse(res, 200, await createReviewPackage());
            return;
          }

          jsonResponse(res, 404, { message: "未知的 PRD 文件存储接口" });
        } catch (error) {
          jsonResponse(res, 400, { message: error instanceof Error ? error.message : "PRD 文件存储操作失败" });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [vue(), createReviewFileStorePlugin()],
  define: {
    "import.meta.env.VITE_PRD_RUNTIME": JSON.stringify(process.env.PRD_RUNTIME === "hosted" ? "hosted" : "local"),
  },
  build: {
    rollupOptions: {
      input: {
        workbench: path.resolve(process.cwd(), "index.html"),
        prototype: path.resolve(process.cwd(), "prototype.html"),
      },
    },
  },
});
