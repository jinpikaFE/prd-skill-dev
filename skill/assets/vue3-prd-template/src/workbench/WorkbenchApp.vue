<template>
  <a-config-provider :locale="zhCN">
    <div class="workspace-shell">
      <FeatureMenu
        :feature-name="prdData.meta.featureName"
        :version="prdData.meta.version"
        :status-label="versionStatusLabel"
        :feature-groups="prdData.featureGroups"
        :active-file-id="store.activeFileId"
        :open-keys="store.expandedGroupIds"
        @select="selectFile"
        @update:open-keys="store.expandedGroupIds = $event"
      />

      <main class="workspace-main">
        <WorkbenchHeader
          :feature-name="prdData.meta.featureName"
          :summary="prdData.meta.summary"
          :view="store.selectedView"
          :active-version-id="activeVersionTarget"
          :active-version-date="activeVersionDate"
          :version-options="versionOptions"
          :can-manage-version="isViewingFinalVersion"
          :readonly="isViewingFinalVersion"
          :role-id="store.activeRoleId"
          :scenario-id="store.activeScenarioId"
          :state-id="store.activeStateId"
          :role-options="roleOptions"
          :scenario-options="scenarioOptions"
          :state-options="stateOptions"
          @view-change="store.setView"
          @version-change="changeVersion"
          @release="openReleaseDialog"
          @rename="openRenameDialog"
          @delete-version="confirmDeleteVersion"
          @role-change="store.activeRoleId = $event"
          @scenario-change="store.activeScenarioId = $event"
          @state-change="store.activeStateId = $event"
        />

        <PrdCanvas
          v-if="store.selectedView === 'prd'"
          ref="canvasRef"
          :file-title="activeFileTitle"
          :section="store.activeSection"
          :annotations="activeSectionAnnotations"
          :selected-annotation-id="store.selectedAnnotationId"
          :readonly="isViewingFinalVersion"
          :platform="prdData.meta.targetPlatform"
          :viewport-width="prdData.meta.prototypeViewport.width"
          :viewport-height="prdData.meta.prototypeViewport.height"
          :prototype-base-url="prototypeBaseUrl"
          :role-id="store.activeRoleId"
          :scenario-id="store.activeScenarioId"
          :state-id="store.activeStateId"
          @select-annotation="selectAnnotation"
          @add-annotation="addAnnotation"
        />

        <PrototypePreview
          v-else-if="store.selectedView === 'prototype'"
          :platform="prdData.meta.targetPlatform"
          :width="prdData.meta.prototypeViewport.width"
          :height="prdData.meta.prototypeViewport.height"
          :prototype-base-url="prototypeBaseUrl"
          :role-id="store.activeRoleId"
          :scenario-id="store.activeScenarioId"
          :state-id="store.activeStateId"
          :role-label="activeRoleLabel"
          :scenario-label="activeScenarioLabel"
          :state-label="activeStateLabel"
          :feedback="store.lastInteraction"
          :req-ids="activeScreen.reqIds"
        />

        <DocumentViewer v-else :docs="generatedDocs" />
      </main>

      <ReviewPanel
        :annotations="allAnnotations"
        :comments="displayedSnapshot.comments"
        :selected-annotation="selectedAnnotation"
        :requirements="prdData.requirements"
        :readonly="isViewingFinalVersion"
        @locate-annotation="locateAnnotation"
        @locate-comment="locateComment"
        @add-comment="addComment"
        @update-annotation="updateAnnotation"
        @delete-annotation="confirmDeleteAnnotation"
        @update-comment="updateComment"
        @delete-comment="confirmDeleteComment"
      />

      <a-modal
        v-model:open="releaseDialogOpen"
        title="发布定版"
        ok-text="下一步"
        cancel-text="取消"
        @ok="confirmPublishVersion"
      >
        <a-form layout="vertical">
          <a-form-item label="版本名称" :validate-status="releaseNameError ? 'error' : ''" :help="releaseNameError">
            <a-input v-model:value="releaseNameDraft" placeholder="例如 1.0.0" />
          </a-form-item>
          <a-alert message="定版会创建独立版本目录，并冻结当前代码、文档、标注和评论。" type="info" show-icon />
        </a-form>
      </a-modal>

      <a-modal
        v-model:open="renameDialogOpen"
        title="重命名版本"
        ok-text="保存"
        cancel-text="取消"
        @ok="confirmRenameVersion"
      >
        <a-form layout="vertical">
          <a-form-item label="版本名称" :validate-status="renameNameError ? 'error' : ''" :help="renameNameError">
            <a-input v-model:value="renameNameDraft" placeholder="例如 1.0.1" />
          </a-form-item>
        </a-form>
      </a-modal>
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import { Modal, message } from "ant-design-vue";
import zhCN from "ant-design-vue/es/locale/zh_CN";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { generatedDocs } from "../data/generatedDocs";
import { prdData } from "../data/prdData";
import { usePrdStore } from "../stores/prd";
import type {
  AnnotationPatch,
  BoardAnnotation,
  ReviewComment,
  VersionSnapshot,
} from "../types";
import DocumentViewer from "./components/DocumentViewer.vue";
import FeatureMenu from "./components/FeatureMenu.vue";
import PrdCanvas from "./components/PrdCanvas.vue";
import PrototypePreview from "./components/PrototypePreview.vue";
import ReviewPanel from "./components/ReviewPanel.vue";
import WorkbenchHeader from "./components/WorkbenchHeader.vue";
import type { LocatedAnnotation } from "./types";

type CanvasExpose = { locateAnnotation: (id: string) => Promise<void>; resetCanvas: () => void };

const store = usePrdStore();
const canvasRef = ref<CanvasExpose>();
const activeVersionTarget = ref("draft");
const releaseDialogOpen = ref(false);
const renameDialogOpen = ref(false);
const releaseNameDraft = ref("1.0.0");
const renameNameDraft = ref("");

const activeScreen = computed(() => prdData.prototype.screens[0]);
const activeVersion = computed(() => store.versionRecords.find((version) => version.id === activeVersionTarget.value));
const isViewingFinalVersion = computed(() => activeVersion.value?.status === "final");
const baselineSnapshot = computed<VersionSnapshot>(() => ({
  customAnnotations: [],
  annotationEdits: {},
  deletedAnnotationIds: [],
  comments: JSON.parse(JSON.stringify(prdData.comments)) as ReviewComment[],
}));
const displayedSnapshot = computed(() => {
  if (!isViewingFinalVersion.value) return store.draftSnapshot();
  return activeVersion.value?.snapshot || baselineSnapshot.value;
});

const versionOptions = computed(() => [
  { label: "当前草稿 · 未定版", value: "draft" },
  ...store.versionRecords.map((version) => ({ label: `${version.name || version.label} · ${version.createdAt || "日期未知"}`, value: version.id })),
]);
const activeVersionDate = computed(() => activeVersion.value?.createdAt || "草稿会持续写入 review-data/draft.json");
const versionStatusLabel = computed(() => isViewingFinalVersion.value ? "定版只读" : "当前草稿");
const prototypeBaseUrl = computed(() => {
  if (isViewingFinalVersion.value && activeVersion.value?.directory) {
    return `/${activeVersion.value.directory}/prototype.html`;
  }
  return "/prototype.html";
});

const roleOptions = computed(() => prdData.roles.map((item) => ({ label: item.label, value: item.id })));
const scenarioOptions = computed(() => prdData.scenarios.map((item) => ({ label: item.label, value: item.id })));
const stateOptions = computed(() => prdData.states.map((item) => ({ label: item.label, value: item.id })));
const activeRoleLabel = computed(() => prdData.roles.find((item) => item.id === store.activeRoleId)?.label || "未定义角色");
const activeScenarioLabel = computed(() => prdData.scenarios.find((item) => item.id === store.activeScenarioId)?.label || "未定义场景");
const activeStateLabel = computed(() => prdData.states.find((item) => item.id === store.activeStateId)?.label || "未定义状态");
const activeFileTitle = computed(() => store.activeFile?.title || "未选择文件");

const allAnnotations = computed<LocatedAnnotation[]>(() => {
  const snapshot = displayedSnapshot.value;
  const deletedIds = new Set(snapshot.deletedAnnotationIds);
  const located: LocatedAnnotation[] = [];

  for (const section of prdData.boardSections) {
    const file = findFileBySectionId(section.id);
    for (const frame of section.frames) {
      for (const annotation of frame.annotations) {
        if (deletedIds.has(annotation.id)) continue;
        located.push(toLocatedAnnotation(annotation, frame.id, section.id, file?.id || "", snapshot.annotationEdits, "generated"));
      }
      for (const annotation of snapshot.customAnnotations) {
        if (annotation.frameId !== frame.id || deletedIds.has(annotation.id)) continue;
        located.push(toLocatedAnnotation(annotation, frame.id, section.id, file?.id || "", snapshot.annotationEdits, "product"));
      }
    }
  }
  return located.sort((a, b) => a.index - b.index);
});
const activeSectionAnnotations = computed(() => allAnnotations.value.filter((annotation) => annotation.sectionId === store.activeSection?.id));
const selectedAnnotation = computed(() => allAnnotations.value.find((annotation) => annotation.id === store.selectedAnnotationId));

const releaseNameError = computed(() => versionNameError(releaseNameDraft.value));
const renameNameError = computed(() => versionNameError(renameNameDraft.value, activeVersion.value?.id));

function findFileBySectionId(sectionId: string) {
  return prdData.featureGroups.flatMap((group) => group.files).find((file) => file.sectionId === sectionId);
}

function toLocatedAnnotation(
  annotation: BoardAnnotation,
  frameId: string,
  sectionId: string,
  fileId: string,
  edits: Record<string, AnnotationPatch>,
  source: LocatedAnnotation["source"],
): LocatedAnnotation {
  return { ...annotation, ...edits[annotation.id], frameId, sectionId, fileId, source };
}

function selectFile(fileId: string) {
  store.selectFile(fileId);
  canvasRef.value?.resetCanvas();
}

function selectAnnotation(id: string) {
  store.selectAnnotation(id);
}

function addAnnotation(payload: { frameId: string; reqId: string; x: number; y: number }) {
  if (isViewingFinalVersion.value) return;
  store.addAnnotation(payload.frameId, payload.reqId, payload.x, payload.y);
}

async function locateAnnotation(id: string) {
  const annotation = allAnnotations.value.find((item) => item.id === id);
  if (!annotation) return;
  store.setView("prd");
  if (annotation.fileId && annotation.fileId !== store.activeFileId) {
    store.selectFile(annotation.fileId);
    await nextTick();
  }
  store.selectAnnotation(id);
  await nextTick();
  await canvasRef.value?.locateAnnotation(id);
}

function locateComment(comment: ReviewComment) {
  void locateAnnotation(comment.annotationId);
}

function addComment(text: string) {
  if (isViewingFinalVersion.value) return;
  store.addComment(text);
}

function updateAnnotation(id: string, patch: AnnotationPatch) {
  if (isViewingFinalVersion.value) return;
  store.updateAnnotation(id, patch);
}

function updateComment(id: string, text: string) {
  if (isViewingFinalVersion.value) return;
  store.updateComment(id, text);
}

function confirmDeleteAnnotation(id: string) {
  if (isViewingFinalVersion.value) return;
  const annotation = allAnnotations.value.find((item) => item.id === id);
  Modal.confirm({
    title: "删除标注",
    content: `确认删除“${annotation?.title || id}”？关联评论也会一起删除。`,
    okText: "确认删除",
    okType: "danger",
    cancelText: "取消",
    onOk: () => store.deleteAnnotation(id),
  });
}

function confirmDeleteComment(id: string) {
  if (isViewingFinalVersion.value) return;
  Modal.confirm({
    title: "删除评论",
    content: "确认删除这条临时评论？",
    okText: "确认删除",
    okType: "danger",
    cancelText: "取消",
    onOk: () => store.deleteComment(id),
  });
}

function changeVersion(versionId: string) {
  activeVersionTarget.value = versionId;
}

function nextReleaseName() {
  const names = store.versionRecords.map((version) => version.name || version.label).filter((name) => /^\d+\.\d+\.\d+$/.test(name));
  if (names.length === 0) return "1.0.0";
  const latest = names.map((name) => name.split(".").map(Number)).sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])[0];
  return `${latest[0]}.${latest[1]}.${latest[2] + 1}`;
}

function versionNameError(name: string, excludedId = "") {
  const trimmed = name.trim();
  if (!/^\d+\.\d+\.\d+$/.test(trimmed)) return "版本名称必须使用 X.Y.Z 格式";
  const duplicate = store.versionRecords.some((version) => version.id !== excludedId && (version.name === trimmed || version.id === `v${trimmed}`));
  return duplicate ? "版本名称已存在" : "";
}

function openReleaseDialog() {
  if (isViewingFinalVersion.value) activeVersionTarget.value = "draft";
  releaseNameDraft.value = nextReleaseName();
  releaseDialogOpen.value = true;
}

function confirmPublishVersion() {
  if (releaseNameError.value) return;
  releaseDialogOpen.value = false;
  Modal.confirm({
    title: `确认发布 ${releaseNameDraft.value}？`,
    content: "将创建完整版本目录并冻结当前草稿，发布后该版本中的标注和评论只读。",
    okText: "确认发版",
    cancelText: "取消",
    onOk: async () => {
      try {
        const record = await store.publishVersion(releaseNameDraft.value.trim());
        activeVersionTarget.value = record.id;
        message.success(`已发布 ${record.name}`);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "发版失败");
        throw error;
      }
    },
  });
}

function openRenameDialog() {
  if (!activeVersion.value) return;
  renameNameDraft.value = activeVersion.value.name || activeVersion.value.label;
  renameDialogOpen.value = true;
}

async function confirmRenameVersion() {
  if (!activeVersion.value || renameNameError.value) return;
  const oldId = activeVersion.value.id;
  try {
    await store.renameVersion(oldId, renameNameDraft.value.trim());
    activeVersionTarget.value = `v${renameNameDraft.value.trim()}`;
    renameDialogOpen.value = false;
    message.success("版本已重命名");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "重命名失败");
  }
}

function confirmDeleteVersion() {
  if (!activeVersion.value) return;
  const version = activeVersion.value;
  Modal.confirm({
    title: `删除版本 ${version.name || version.label}？`,
    content: `会删除 ${version.directory || version.id} 目录及版本索引记录，操作不可撤销。`,
    okText: "确认删除",
    okType: "danger",
    cancelText: "取消",
    onOk: async () => {
      try {
        await store.deleteVersion(version.id);
        activeVersionTarget.value = "draft";
        message.success("版本已删除");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "删除失败");
        throw error;
      }
    },
  });
}

function handlePrototypeMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin || event.data?.type !== "prd:prototype-interaction") return;
  const reqText = Array.isArray(event.data.reqIds) ? ` · ${event.data.reqIds.join(", ")}` : "";
  store.lastInteraction = `${event.data.action || "原型交互"}${reqText}`;
}

watch(allAnnotations, (annotations) => {
  if (!annotations.some((item) => item.id === store.selectedAnnotationId)) {
    store.selectAnnotation(annotations[0]?.id || "");
  }
});

onMounted(async () => {
  window.addEventListener("message", handlePrototypeMessage);
  await store.loadReviewData();
});
onBeforeUnmount(() => window.removeEventListener("message", handlePrototypeMessage));
</script>
