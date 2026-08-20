import { defineStore } from "pinia";
import { prdData } from "../data/prdData";
import type {
  AnnotationPatch,
  BoardAnnotation,
  CanvasAnnotation,
  ReviewPackageResult,
  ReviewPackageStatus,
  ReviewComment,
  RuntimeCapabilities,
  VersionRecord,
  VersionSnapshot,
  WorkspaceView,
} from "../types";

type PrdState = {
  selectedView: WorkspaceView;
  activeRoleId: string;
  activeScenarioId: string;
  activeStateId: string;
  activeTabId: string;
  activeFileId: string;
  expandedGroupIds: string[];
  selectedAnnotationId: string;
  customAnnotations: CanvasAnnotation[];
  annotationEdits: Record<string, AnnotationPatch>;
  deletedAnnotationIds: string[];
  comments: ReviewComment[];
  versionRecords: VersionRecord[];
  runtimeCapabilities: RuntimeCapabilities;
  fileStoreReady: boolean;
  fileStoreError: string;
  lastInteraction: string;
};

type FileStoreState = {
  capabilities?: RuntimeCapabilities;
  draft?: VersionSnapshot;
  versions?: VersionRecord[];
};

type OpenFolderResult = {
  folderPath: string;
};

const fileStoreApi = "/__prd_file_store";
const initialHostedRuntime = import.meta.env.VITE_PRD_RUNTIME === "hosted";
const initialCapabilities: RuntimeCapabilities = {
  runtime: initialHostedRuntime ? "hosted" : "local",
  hasDraft: !initialHostedRuntime,
  canManageVersions: !initialHostedRuntime,
  canManageAnnotations: !initialHostedRuntime,
  canAddComments: !initialHostedRuntime,
  canManageDraftComments: !initialHostedRuntime,
  canPackage: !initialHostedRuntime,
  canOpenFolder: !initialHostedRuntime,
};

function nowText() {
  return new Date().toISOString();
}

function cloneArray<T>(items: T[]) {
  return JSON.parse(JSON.stringify(items)) as T[];
}

function cloneRecord<T extends Record<string, unknown>>(items: T) {
  return JSON.parse(JSON.stringify(items)) as T;
}

function baselineSnapshot(): VersionSnapshot {
  return {
    customAnnotations: [],
    annotationEdits: {},
    deletedAnnotationIds: [],
    comments: cloneArray(prdData.comments),
  };
}

function normalizeSnapshot(snapshot?: Partial<VersionSnapshot>): VersionSnapshot {
  const baseline = baselineSnapshot();
  if (!snapshot) {
    return baseline;
  }

  return {
    customAnnotations: Array.isArray(snapshot.customAnnotations)
      ? cloneArray(snapshot.customAnnotations as CanvasAnnotation[])
      : baseline.customAnnotations,
    annotationEdits:
      snapshot.annotationEdits && typeof snapshot.annotationEdits === "object" && !Array.isArray(snapshot.annotationEdits)
        ? cloneRecord(snapshot.annotationEdits as Record<string, AnnotationPatch>)
        : baseline.annotationEdits,
    deletedAnnotationIds: Array.isArray(snapshot.deletedAnnotationIds)
      ? cloneArray(snapshot.deletedAnnotationIds)
      : baseline.deletedAnnotationIds,
    comments: Array.isArray(snapshot.comments) ? cloneArray(snapshot.comments as ReviewComment[]) : baseline.comments,
  };
}

async function requestFileStore<T>(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${fileStoreApi}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(payload.message || "PRD 文件存储操作失败");
  }

  return payload;
}

async function requestPublishedState() {
  const response = await fetch("./published-state.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("未找到发布包中的 published-state.json");
  }
  return response.json() as Promise<FileStoreState>;
}

function firstFeatureFileId() {
  return prdData.featureGroups[0]?.files[0]?.id || "";
}

function findFeatureFile(fileId: string) {
  for (const group of prdData.featureGroups) {
    const file = group.files.find((item) => item.id === fileId);
    if (file) {
      return file;
    }
  }

  return undefined;
}

function mergeAnnotation(annotation: BoardAnnotation, annotationEdits: Record<string, AnnotationPatch>) {
  const patch = annotationEdits[annotation.id];
  if (!patch) {
    return annotation;
  }

  return {
    ...annotation,
    ...patch,
  };
}

function sectionVisibleAnnotations(
  sectionId: string,
  customAnnotations: CanvasAnnotation[],
  annotationEdits: Record<string, AnnotationPatch>,
  deletedAnnotationIds: string[],
) {
  const deletedIds = new Set(deletedAnnotationIds);
  const section = prdData.boardSections.find((item) => item.id === sectionId);
  if (!section) {
    return [];
  }

  const annotations: BoardAnnotation[] = [];
  for (const frame of section.frames) {
    for (const annotation of frame.annotations) {
      if (!deletedIds.has(annotation.id)) {
        annotations.push(mergeAnnotation(annotation, annotationEdits));
      }
    }

    for (const annotation of customAnnotations) {
      if (annotation.frameId === frame.id && !deletedIds.has(annotation.id)) {
        annotations.push(mergeAnnotation(annotation, annotationEdits));
      }
    }
  }

  return annotations;
}

function firstAnnotationIdForSection(
  sectionId: string,
  customAnnotations: CanvasAnnotation[],
  annotationEdits: Record<string, AnnotationPatch>,
  deletedAnnotationIds: string[],
) {
  return sectionVisibleAnnotations(sectionId, customAnnotations, annotationEdits, deletedAnnotationIds)[0]?.id || "";
}

function firstVisibleAnnotationId(
  customAnnotations: CanvasAnnotation[],
  annotationEdits: Record<string, AnnotationPatch>,
  deletedAnnotationIds: string[],
) {
  for (const group of prdData.featureGroups) {
    for (const file of group.files) {
      const annotationId = firstAnnotationIdForSection(
        file.sectionId,
        customAnnotations,
        annotationEdits,
        deletedAnnotationIds,
      );
      if (annotationId) {
        return annotationId;
      }
    }
  }

  return "";
}

function maxGeneratedAnnotationIndex() {
  let maxIndex = 0;

  for (const section of prdData.boardSections) {
    for (const frame of section.frames) {
      for (const annotation of frame.annotations) {
        maxIndex = Math.max(maxIndex, annotation.index);
      }
    }
  }

  return maxIndex;
}

export const usePrdStore = defineStore("prd", {
  state: (): PrdState => {
    const snapshot = baselineSnapshot();
    const activeFileId = firstFeatureFileId();
    const activeFile = findFeatureFile(activeFileId);
    const selectedAnnotationId = activeFile
      ? firstAnnotationIdForSection(
          activeFile.sectionId,
          snapshot.customAnnotations,
          snapshot.annotationEdits,
          snapshot.deletedAnnotationIds,
        )
      : "";

    return {
      selectedView: "prd",
      activeRoleId: prdData.roles[0]?.id || "",
      activeScenarioId: prdData.scenarios[0]?.id || "",
      activeStateId: prdData.states[0]?.id || "",
      activeTabId: prdData.prototype.screens[0]?.tabs[0]?.id || "",
      activeFileId,
      expandedGroupIds: prdData.featureGroups.map((group) => group.id),
      selectedAnnotationId,
      customAnnotations: snapshot.customAnnotations,
      annotationEdits: snapshot.annotationEdits,
      deletedAnnotationIds: snapshot.deletedAnnotationIds,
      comments: snapshot.comments,
      versionRecords: [],
      runtimeCapabilities: { ...initialCapabilities },
      fileStoreReady: false,
      fileStoreError: "",
      lastInteraction: "尚未触发原型交互",
    };
  },
  getters: {
    activeFile(state) {
      return findFeatureFile(state.activeFileId);
    },
    activeGroup(state) {
      return prdData.featureGroups.find((group) => {
        return group.files.some((file) => file.id === state.activeFileId);
      });
    },
    activeSection(state) {
      const activeFile = findFeatureFile(state.activeFileId);
      if (!activeFile) {
        return prdData.boardSections[0];
      }

      return prdData.boardSections.find((section) => section.id === activeFile.sectionId);
    },
    selectedAnnotation(state) {
      const deletedIds = new Set(state.deletedAnnotationIds);
      if (deletedIds.has(state.selectedAnnotationId)) {
        return undefined;
      }

      for (const section of prdData.boardSections) {
        for (const frame of section.frames) {
          const annotation = frame.annotations.find((item) => item.id === state.selectedAnnotationId);
          if (annotation) {
            return mergeAnnotation(annotation, state.annotationEdits);
          }
        }
      }

      const customAnnotation = state.customAnnotations.find((annotation) => {
        return annotation.id === state.selectedAnnotationId;
      });
      if (!customAnnotation) {
        return undefined;
      }

      return mergeAnnotation(customAnnotation, state.annotationEdits);
    },
  },
  actions: {
    setView(view: WorkspaceView) {
      this.selectedView = view;
    },
    toggleGroup(groupId: string) {
      if (this.expandedGroupIds.includes(groupId)) {
        this.expandedGroupIds = this.expandedGroupIds.filter((item) => item !== groupId);
        return;
      }

      this.expandedGroupIds.push(groupId);
    },
    selectFile(fileId: string) {
      const file = findFeatureFile(fileId);
      if (!file) {
        return;
      }

      this.activeFileId = fileId;
      this.selectedAnnotationId = firstAnnotationIdForSection(
        file.sectionId,
        this.customAnnotations,
        this.annotationEdits,
        this.deletedAnnotationIds,
      );
      const group = this.activeGroup;
      if (group && !this.expandedGroupIds.includes(group.id)) {
        this.expandedGroupIds.push(group.id);
      }
    },
    selectAnnotation(annotationId: string) {
      if (this.deletedAnnotationIds.includes(annotationId)) {
        return;
      }

      this.selectedAnnotationId = annotationId;
    },
    setActiveTab(tabId: string) {
      this.activeTabId = tabId;
    },
    draftSnapshot(): VersionSnapshot {
      return {
        customAnnotations: cloneArray(this.customAnnotations),
        annotationEdits: cloneRecord(this.annotationEdits),
        deletedAnnotationIds: cloneArray(this.deletedAnnotationIds),
        comments: cloneArray(this.comments),
      };
    },
    applyDraftSnapshot(snapshot: VersionSnapshot) {
      this.customAnnotations = cloneArray(snapshot.customAnnotations);
      this.annotationEdits = cloneRecord(snapshot.annotationEdits);
      this.deletedAnnotationIds = cloneArray(snapshot.deletedAnnotationIds);
      this.comments = cloneArray(snapshot.comments);
      this.selectedAnnotationId = firstVisibleAnnotationId(
        this.customAnnotations,
        this.annotationEdits,
        this.deletedAnnotationIds,
      );
    },
    applyFileStoreState(state: FileStoreState) {
      if (state.capabilities) {
        this.runtimeCapabilities = { ...state.capabilities };
      }
      if (this.runtimeCapabilities.hasDraft) {
        this.applyDraftSnapshot(normalizeSnapshot(state.draft));
      }
      this.versionRecords = Array.isArray(state.versions) ? state.versions : [];
    },
    async loadReviewData() {
      try {
        const state = await requestFileStore<FileStoreState>("/state");
        this.applyFileStoreState(state);
        this.fileStoreReady = true;
        this.fileStoreError = "";
        this.lastInteraction = this.runtimeCapabilities.runtime === "hosted"
          ? "已进入线上评审模式。"
          : "已从项目 JSON 文件读取评审数据。";
      } catch (error) {
        if (this.runtimeCapabilities.runtime === "hosted") {
          try {
            const state = await requestPublishedState();
            this.applyFileStoreState(state);
            this.fileStoreReady = true;
            this.fileStoreError = "";
            this.lastInteraction = "已从发布包读取定版评审数据。评论功能需在部署时接入存储服务。";
            return;
          } catch (publishedStateError) {
            this.fileStoreError = publishedStateError instanceof Error
              ? publishedStateError.message
              : "读取发布包状态失败";
          }
        }
        this.fileStoreReady = false;
        if (!this.fileStoreError) {
          this.fileStoreError = error instanceof Error ? error.message : "文件存储服务未启动";
        }
        this.lastInteraction = "文件存储服务未启动，当前改动只会临时显示，需通过 dev server 打开才能写入 JSON 文件。";
      }
    },
    async saveDraftReviewData() {
      try {
        const state = await requestFileStore<FileStoreState>("/draft", {
          method: "PUT",
          body: JSON.stringify({ snapshot: this.draftSnapshot() }),
        });
        this.versionRecords = Array.isArray(state.versions) ? state.versions : this.versionRecords;
        this.fileStoreReady = true;
        this.fileStoreError = "";
      } catch (error) {
        this.fileStoreReady = false;
        this.fileStoreError = error instanceof Error ? error.message : "写入 draft.json 失败";
        this.lastInteraction = `保存草稿 JSON 失败：${this.fileStoreError}`;
      }
    },
    addAnnotation(frameId: string, reqId: string, x: number, y: number) {
      const customMax = this.customAnnotations.reduce((maxIndex, annotation) => {
        return Math.max(maxIndex, annotation.index);
      }, 0);
      const nextIndex = Math.max(maxGeneratedAnnotationIndex(), customMax) + 1;
      const annotation: CanvasAnnotation = {
        id: `ann-product-${Date.now()}`,
        frameId,
        reqId,
        index: nextIndex,
        title: "新增产品标注",
        detail: "产品对该原型区域的功能、边界或口径说明。",
        x,
        y,
        source: "product",
      };

      this.customAnnotations.push(annotation);
      this.selectedAnnotationId = annotation.id;
      void this.saveDraftReviewData();
    },
    updateAnnotation(annotationId: string, patch: AnnotationPatch) {
      const customIndex = this.customAnnotations.findIndex((annotation) => annotation.id === annotationId);
      if (customIndex >= 0) {
        this.customAnnotations[customIndex] = {
          ...this.customAnnotations[customIndex],
          ...patch,
        };
        void this.saveDraftReviewData();
        return;
      }

      this.annotationEdits[annotationId] = patch;
      void this.saveDraftReviewData();
    },
    deleteAnnotation(annotationId: string) {
      this.customAnnotations = this.customAnnotations.filter((annotation) => annotation.id !== annotationId);
      this.deletedAnnotationIds = Array.from(new Set([...this.deletedAnnotationIds, annotationId]));
      this.comments = this.comments.filter((comment) => comment.annotationId !== annotationId);
      this.selectedAnnotationId = firstVisibleAnnotationId(
        this.customAnnotations,
        this.annotationEdits,
        this.deletedAnnotationIds,
      );
      void this.saveDraftReviewData();
    },
    addDraftComment(text: string) {
      const trimmed = text.trim();
      if (!trimmed || !this.selectedAnnotationId) {
        return;
      }

      this.comments.unshift({
        id: `comment-${Date.now()}`,
        annotationId: this.selectedAnnotationId,
        text: trimmed,
        createdAt: nowText(),
        status: "open",
      });
      void this.saveDraftReviewData();
    },
    async addVersionComment(versionId: string, text: string) {
      const trimmed = text.trim();
      if (!trimmed || !this.selectedAnnotationId) {
        return;
      }
      const state = await requestFileStore<FileStoreState>("/comments", {
        method: "POST",
        body: JSON.stringify({
          versionId,
          annotationId: this.selectedAnnotationId,
          text: trimmed,
        }),
      });
      this.applyFileStoreState(state);
      this.fileStoreReady = true;
      this.fileStoreError = "";
      this.lastInteraction = "已添加匿名评审评论。";
    },
    updateComment(commentId: string, text: string) {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      this.comments = this.comments.map((comment) => {
        if (comment.id !== commentId) {
          return comment;
        }

        return {
          ...comment,
          text: trimmed,
          updatedAt: nowText(),
        };
      });
      void this.saveDraftReviewData();
    },
    deleteComment(commentId: string) {
      this.comments = this.comments.filter((comment) => comment.id !== commentId);
      void this.saveDraftReviewData();
    },
    async publishVersion(name: string) {
      const state = await requestFileStore<FileStoreState>("/release", {
        method: "POST",
        body: JSON.stringify({
          name,
          snapshot: this.draftSnapshot(),
        }),
      });
      this.applyFileStoreState(state);
      this.fileStoreReady = true;
      this.fileStoreError = "";
      const record = this.versionRecords.find((version) => version.name === name);
      if (!record) {
        throw new Error("定版目录已生成，但未能读取版本记录");
      }

      this.lastInteraction = `已定版并写入目录：versions/${record.id}`;
      return record;
    },
    async renameVersion(versionId: string, name: string) {
      const state = await requestFileStore<FileStoreState>("/rename", {
        method: "POST",
        body: JSON.stringify({ versionId, name }),
      });
      this.versionRecords = Array.isArray(state.versions) ? state.versions : [];
      this.fileStoreReady = true;
      this.fileStoreError = "";
      this.lastInteraction = `已重命名版本目录：v${name}`;
    },
    async deleteVersion(versionId: string) {
      const state = await requestFileStore<FileStoreState>("/delete", {
        method: "POST",
        body: JSON.stringify({ versionId }),
      });
      this.versionRecords = Array.isArray(state.versions) ? state.versions : [];
      this.fileStoreReady = true;
      this.fileStoreError = "";
      this.lastInteraction = "已删除选中的定版目录和版本记录。";
    },
    async openPrototypeFolder(versionId: string) {
      const result = await requestFileStore<OpenFolderResult>("/open-folder", {
        method: "POST",
        body: JSON.stringify({ versionId }),
      });
      this.lastInteraction = `已打开当前原型目录：${result.folderPath}`;
      return result.folderPath;
    },
    async openReviewPackageFolder() {
      const result = await requestFileStore<OpenFolderResult>("/open-package-folder", {
        method: "POST",
      });
      this.lastInteraction = `已打开发布包目录：${result.folderPath}`;
      return result.folderPath;
    },
    async getReviewPackageStatus() {
      return requestFileStore<ReviewPackageStatus>("/package-status");
    },
    async createReviewPackage() {
      const result = await requestFileStore<ReviewPackageResult>("/package", {
        method: "POST",
      });
      this.lastInteraction = `已生成发布包：${result.packagePath}`;
      return result;
    },
  },
});
