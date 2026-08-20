<template>
  <div class="workspace-shell">
    <aside class="feature-rail" aria-label="功能清单">
      <div class="brand-block">
        <span class="brand-kicker">Vue3 PRD</span>
        <strong>{{ prdData.meta.featureName }}</strong>
        <small>{{ prdData.meta.version }} · {{ versionStatusLabel }}</small>
      </div>

      <nav class="feature-tree">
        <section v-for="group in orderedFeatureGroups" :key="group.id" class="tree-group">
          <button
            class="tree-folder"
            type="button"
            :aria-expanded="isGroupExpanded(group.id)"
            :data-req-ids="toReqIds(group.reqIds)"
            @click="store.toggleGroup(group.id)"
          >
            <span>{{ group.title }}</span>
            <small>优先级 {{ group.priority }}</small>
          </button>

          <div v-if="isGroupExpanded(group.id)" class="tree-files">
            <button
              v-for="file in group.files"
              :key="file.id"
              class="tree-file"
              :class="{ active: store.activeFileId === file.id }"
              type="button"
              :data-req-ids="toReqIds(file.reqIds)"
              @click="selectFile(file.id)"
            >
              <span>{{ file.title }}</span>
              <small>{{ fileTypeLabel(file.type) }} · {{ file.description }}</small>
            </button>
          </div>
        </section>
      </nav>
    </aside>

    <main class="workspace-main">
      <header class="topbar">
        <div>
          <p class="eyebrow">PRD 原型工作台</p>
          <h1>{{ prdData.meta.featureName }}</h1>
          <p>{{ prdData.meta.summary }}</p>
        </div>

        <div class="toolbar">
          <div class="version-controls">
            <van-field
              class="selector-field version-selector"
              label="历史"
              :model-value="activeVersionDisplay"
              readonly
              is-link
              @click="openPicker('version')"
            />
            <div class="version-date">
              <span>{{ activeVersionDate }}</span>
              <small v-if="activeVersionRenameText">{{ activeVersionRenameText }}</small>
            </div>
            <van-button type="primary" size="small" class="release-button" @click="openReleaseDialog">
              发版
            </van-button>
            <van-button
              size="small"
              class="release-button"
              :disabled="!canRenameActiveVersion"
              @click="openRenameDialog"
            >
              重命名版本
            </van-button>
            <van-button
              size="small"
              class="release-button danger"
              :disabled="!canDeleteActiveVersion"
              @click="confirmDeleteActiveVersion"
            >
              删除版本
            </van-button>
          </div>

          <div class="segmented" aria-label="视图切换">
            <button
              type="button"
              :class="{ active: store.selectedView === 'prd' }"
              @click="store.setView('prd')"
            >
              PRD 标注
            </button>
            <button
              type="button"
              :class="{ active: store.selectedView === 'prototype' }"
              @click="store.setView('prototype')"
            >
              高保真原型
            </button>
            <button
              type="button"
              :class="{ active: store.selectedView === 'docs' }"
              @click="store.setView('docs')"
            >
              文档查看
            </button>
          </div>
        </div>
      </header>

      <section class="filters" aria-label="场景控制">
        <van-field
          class="selector-field"
          label="角色"
          :model-value="activeRoleLabel"
          readonly
          is-link
          @click="openPicker('role')"
        />
        <van-field
          class="selector-field"
          label="场景"
          :model-value="activeScenarioLabel"
          readonly
          is-link
          @click="openPicker('scenario')"
        />
        <van-field
          class="selector-field"
          label="状态"
          :model-value="activeStateLabel"
          readonly
          is-link
          @click="openPicker('state')"
        />
      </section>

      <section v-if="store.selectedView === 'prd'" class="board-view" aria-label="PRD 标注看板">
        <div class="active-file-strip">
          <div>
            <p class="eyebrow">当前文件</p>
            <strong>{{ activeFileTitle }}</strong>
            <span>{{ activeSectionDescription }}</span>
          </div>
          <div class="req-list">
            <span v-for="reqId in activeSectionReqIds" :key="reqId">{{ reqId }}</span>
          </div>
        </div>

        <div class="canvas-toolbar">
          <div class="canvas-actions">
            <button
              type="button"
              :class="{ active: isAnnotationMode }"
              :disabled="isViewingFinalVersion"
              @click="toggleAnnotationMode"
            >
              添加标注
            </button>
            <button type="button" :class="{ active: isPanMode }" @click="togglePanMode">
              拖动画布
            </button>
          </div>

          <div class="zoom-controls" aria-label="画布缩放">
            <button type="button" aria-label="缩小画布" @click="zoomOut">-</button>
            <span>{{ zoomPercent }}</span>
            <button type="button" aria-label="放大画布" @click="zoomIn">+</button>
            <button type="button" @click="resetCanvas">重置</button>
          </div>
        </div>

        <div
          class="canvas-viewport"
          :class="{ 'annotation-mode': isAnnotationMode, 'pan-mode': isPanMode, dragging: isDragging }"
          @mousedown="startPan"
          @mousemove="movePan"
          @mouseup="endPan"
          @mouseleave="endPan"
          @wheel.prevent="handleCanvasWheel"
        >
          <div class="canvas-stage" :style="canvasStageStyle">
            <article v-if="activeSection" class="board-section" :data-req-ids="toReqIds(activeSection.reqIds)">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">{{ sectionKindLabel }}</p>
                  <h2>{{ activeSection.title }}</h2>
                  <p>{{ activeSection.description }}</p>
                </div>
              </div>

              <template v-if="isDiagramSection && diagramFrame">
                <div class="diagram-layout">
                  <div
                    class="diagram-surface"
                    :data-req-ids="toReqIds(diagramFrame.reqIds)"
                    @click="handleFrameClick($event, diagramFrame)"
                  >
                    <div class="frame-head">
                      <div>
                        <strong>{{ diagramFrame.title }}</strong>
                        <span>{{ diagramFrame.subtitle }}</span>
                      </div>
                      <div class="chip-row">
                        <span v-for="chip in diagramFrame.chips" :key="chip">{{ chip }}</span>
                      </div>
                    </div>

                    <div v-if="diagramError" class="diagram-error">{{ diagramError }}</div>
                    <div v-else class="mermaid-host" v-html="diagramSvg"></div>

                    <button
                      v-for="annotation in frameAnnotations(diagramFrame)"
                      :key="annotation.id"
                      class="annotation-pin"
                      :class="annotationItemClass(annotation)"
                      type="button"
                      :style="annotationStyle(annotation.x, annotation.y)"
                      :data-annotation-id="annotation.id"
                      :data-req-id="annotation.reqId"
                      @click.stop="selectAnnotation(annotation.id)"
                    >
                      {{ annotation.index }}
                    </button>
                  </div>

                  <aside class="callout-stack">
                    <button
                      v-for="annotation in frameAnnotations(diagramFrame)"
                      :key="annotation.id"
                      type="button"
                      class="callout-item"
                      :class="annotationItemClass(annotation)"
                      @click.stop="selectAnnotation(annotation.id)"
                    >
                      <span>{{ annotation.index }}</span>
                      <strong>{{ annotation.title }}</strong>
                      <small>{{ annotationSourceLabel(annotation) }} · {{ annotation.reqId }} · {{ annotation.detail }}</small>
                    </button>
                  </aside>
                </div>
              </template>

              <div v-else class="snapshot-stack">
                <div
                  v-for="frame in activeSection.frames"
                  :key="frame.id"
                  class="snapshot-layout"
                  :data-req-ids="toReqIds(frame.reqIds)"
                >
                  <div
                    class="snapshot-phone"
                    :data-req-ids="toReqIds(frame.reqIds)"
                    @click="handleFrameClick($event, frame)"
                  >
                    <div class="snapshot-status">
                      <span>9:41</span>
                      <span>5G 100%</span>
                    </div>
                    <div class="snapshot-screen">
                      <div class="snapshot-title">
                        <p class="eyebrow">{{ frame.snapshot?.caption || frame.title }}</p>
                        <h3>{{ activeScreen.headline }}</h3>
                        <p>{{ frame.snapshot?.message || activeScreen.subhead }}</p>
                      </div>

                      <div class="snapshot-tabs">
                        <span
                          v-for="tab in activeScreen.tabs"
                          :key="tab.id"
                          :class="{ active: tab.id === snapshotTabId(frame) }"
                        >
                          {{ tab.label }}
                        </span>
                      </div>

                      <div class="snapshot-fields">
                        <div
                          v-for="field in fieldsForSnapshot(frame)"
                          :key="field.id"
                          class="snapshot-field"
                          :class="{ error: isSnapshotFieldError(frame, field.id) }"
                          :data-req-id="field.reqId"
                        >
                          <span>{{ field.label }}</span>
                          <strong>{{ snapshotFieldValue(frame, field.id) || field.placeholder }}</strong>
                          <small v-if="field.helper">{{ field.helper }}</small>
                        </div>
                      </div>

                      <div
                        class="snapshot-agreement"
                        :class="{ unchecked: frame.snapshot?.agreementAccepted === false }"
                        :data-req-id="activeScreen.legalReqId || activeScreen.reqIds[0]"
                      >
                        <span></span>
                        <small>{{ activeScreen.legalCopy }}</small>
                      </div>

                      <div class="snapshot-state" :class="`state-${frame.snapshot?.stateId || 'normal'}`">
                        {{ snapshotStateText(frame) }}
                      </div>

                      <div class="snapshot-actions">
                        <span
                          v-for="action in actionsForSnapshot(frame)"
                          :key="action.id"
                          :class="`action-${action.variant}`"
                          :data-req-id="action.reqId"
                        >
                          {{ snapshotActionLabel(action, frame) }}
                        </span>
                      </div>
                    </div>

                    <button
                      v-for="annotation in frameAnnotations(frame)"
                      :key="annotation.id"
                      class="annotation-pin"
                      :class="annotationItemClass(annotation)"
                      type="button"
                      :style="annotationStyle(annotation.x, annotation.y)"
                      :data-annotation-id="annotation.id"
                      :data-req-id="annotation.reqId"
                      @click.stop="selectAnnotation(annotation.id)"
                    >
                      {{ annotation.index }}
                    </button>
                  </div>

                  <div class="callout-stack">
                    <div class="snapshot-meta">
                      <strong>{{ frame.title }}</strong>
                      <span>{{ frame.subtitle }}</span>
                      <div class="chip-row">
                        <span v-for="chip in frame.chips" :key="chip">{{ chip }}</span>
                      </div>
                    </div>

                    <button
                      v-for="annotation in frameAnnotations(frame)"
                      :key="annotation.id"
                      type="button"
                      class="callout-item"
                      :class="annotationItemClass(annotation)"
                      @click.stop="selectAnnotation(annotation.id)"
                    >
                      <span>{{ annotation.index }}</span>
                      <strong>{{ annotation.title }}</strong>
                      <small>{{ annotationSourceLabel(annotation) }} · {{ annotation.reqId }} · {{ annotation.detail }}</small>
                    </button>

                    <ul class="frame-bullets">
                      <li v-for="bullet in frame.bullets" :key="bullet">{{ bullet }}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div class="note-strip">
                <span v-for="note in activeSection.notes" :key="note">{{ note }}</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section v-else-if="store.selectedView === 'prototype'" class="prototype-view" aria-label="高保真原型">
        <div class="phone-shell" :data-req-ids="toReqIds(activeScreen.reqIds)">
          <div class="phone-status">
            <span>9:41</span>
            <span>5G 100%</span>
          </div>
          <div class="phone-content">
            <p class="eyebrow">{{ activeScreen.eyebrow }}</p>
            <h2>{{ activeScreen.headline }}</h2>
            <p>{{ activeScreen.subhead }}</p>

            <van-tabs v-model:active="activeTabModel" type="card" shrink data-req-id="REQ-001">
              <van-tab
                v-for="tab in activeScreen.tabs"
                :key="tab.id"
                :title="tab.label"
                :name="tab.id"
              ></van-tab>
            </van-tabs>

            <van-form class="vant-login-form">
              <div v-for="field in visibleFields" :key="field.id" class="prototype-field-shell">
                <van-field
                  :model-value="fieldValue(field.id)"
                  :type="field.inputType || 'text'"
                  :label="field.label"
                  :placeholder="field.placeholder"
                  :error-message="fieldErrorMessage(field.id)"
                  :readonly="field.state === 'readonly'"
                  :disabled="field.state === 'disabled'"
                  :data-req-id="field.reqId"
                  @update:model-value="setFieldValue(field.id, $event)"
                />
                <small v-if="field.helper">{{ field.helper }}</small>
              </div>

              <van-checkbox
                v-model="agreementChecked"
                shape="square"
                icon-size="16px"
                :data-req-id="activeScreen.legalReqId || activeScreen.reqIds[0]"
              >
                {{ activeScreen.legalCopy }}
              </van-checkbox>
              <p v-if="agreementError" class="agreement-error">{{ agreementError }}</p>

              <div class="prototype-actions">
                <van-button
                  v-for="action in visibleActions"
                  :key="action.id"
                  block
                  round
                  :plain="action.variant === 'ghost'"
                  :type="buttonType(action.variant)"
                  :loading="loadingActionId === action.id"
                  :disabled="actionDisabled(action)"
                  :data-req-id="action.reqId"
                  @click="handlePrototypeAction(action.id)"
                >
                  {{ actionLabel(action) }}
                </van-button>
              </div>
            </van-form>
          </div>
        </div>

        <div class="prototype-console">
          <p class="eyebrow">交互反馈</p>
          <strong>{{ store.lastInteraction }}</strong>
          <span>当前角色：{{ activeRoleLabel }} · 当前场景：{{ activeScenarioLabel }}</span>
          <span>当前状态：{{ activeStateLabel }} · {{ activeStateDescription }}</span>
          <div class="prototype-tags">
            <van-tag v-for="reqId in activeScreen.reqIds" :key="reqId" type="primary" plain>
              {{ reqId }}
            </van-tag>
          </div>
        </div>
      </section>

      <section v-else class="docs-view" aria-label="文档查看">
        <aside class="doc-tabs">
          <button
            v-for="doc in generatedDocs"
            :key="doc.id"
            type="button"
            :class="{ active: doc.id === activeDoc.id }"
            @click="activeDocId = doc.id"
          >
            <strong>{{ doc.title }}</strong>
            <span>{{ doc.fileName }}</span>
          </button>
        </aside>

        <article class="doc-reader">
          <header>
            <div>
              <p class="eyebrow">生成文档</p>
              <h2>{{ activeDoc.title }}</h2>
              <p>{{ activeDoc.summary }}</p>
            </div>
            <button type="button" class="download-button" @click="downloadActiveDoc">
              下载 {{ activeDoc.fileName }}
            </button>
          </header>
          <div class="markdown-preview" v-html="renderedActiveDoc"></div>
        </article>
      </section>
    </main>

    <aside class="comment-panel" aria-label="标注与评论列表">
      <section class="selected-card">
        <div class="panel-title">
          <strong>当前标注</strong>
          <span v-if="selectedAnnotation" :class="['source-badge', annotationTone(selectedAnnotation)]">
            {{ annotationSourceLabel(selectedAnnotation) }}
          </span>
        </div>
        <template v-if="selectedAnnotation">
          <form
            v-if="editingAnnotationId === selectedAnnotation.id && !isViewingFinalVersion"
            class="inline-edit"
            @submit.prevent="saveAnnotationEdit"
          >
            <label>
              <span>标注标题</span>
              <input v-model="annotationDraft.title" placeholder="请输入标注标题" />
            </label>
            <van-field
              class="selector-field"
              label="关联需求"
              :model-value="annotationDraftReqLabel"
              readonly
              is-link
              @click="openPicker('annotationReq')"
            />
            <label>
              <span>标注说明</span>
              <textarea v-model="annotationDraft.detail" placeholder="说明这个原型区域的功能、边界或口径"></textarea>
            </label>
            <div class="inline-edit-actions">
              <button type="submit">保存标注</button>
              <button type="button" class="ghost" @click="cancelAnnotationEdit">取消</button>
            </div>
          </form>

          <template v-else>
            <h2>{{ selectedAnnotation.index }}. {{ selectedAnnotation.title }}</h2>
            <p>{{ selectedAnnotation.detail }}</p>
            <span class="req-chip">{{ selectedAnnotation.reqId }} · {{ requirementTitle(selectedAnnotation.reqId) }}</span>
            <p v-if="isViewingFinalVersion" class="readonly-hint">当前查看的是定版快照，标注和评论只读。</p>
            <div v-else class="record-actions wide">
              <button type="button" class="text-action" @click="beginEditAnnotation(selectedAnnotation)">
                <van-icon name="edit" />
                编辑标注
              </button>
              <button type="button" class="text-action danger" @click="removeAnnotation(selectedAnnotation.id)">
                <van-icon name="delete-o" />
                删除标注
              </button>
            </div>
          </template>
        </template>
        <p v-else>请选择一个标注后添加评论。</p>
      </section>

      <section class="comment-editor">
        <label>
          <span>添加临时评论</span>
          <textarea
            v-model="draftComment"
            :disabled="isViewingFinalVersion"
            placeholder="记录评审意见、边界问题或待确认点"
          ></textarea>
        </label>
        <button
          type="button"
          :disabled="isViewingFinalVersion || !selectedAnnotation || !draftComment.trim()"
          @click="submitComment"
        >
          添加评论
        </button>
      </section>

      <section class="annotations-list">
        <div class="panel-title">
          <strong>全部标注</strong>
          <span>{{ allAnnotations.length }}</span>
        </div>
        <article
          v-for="annotation in allAnnotations"
          :key="annotation.id"
          class="side-record annotation-record"
          :class="annotationItemClass(annotation)"
        >
          <button type="button" class="side-record-main" @click="locateAnnotation(annotation.id)">
            <span class="pin-mini">{{ annotation.index }}</span>
            <strong>{{ annotation.title }}</strong>
            <small>{{ annotationSourceLabel(annotation) }} · {{ annotation.reqId }}</small>
            <em>{{ annotation.fileTitle }} / {{ annotation.frameTitle }}</em>
          </button>
          <div v-if="!isViewingFinalVersion" class="record-actions">
            <button type="button" class="icon-action" aria-label="编辑标注" @click="beginEditAnnotation(annotation)">
              <van-icon name="edit" />
            </button>
            <button type="button" class="icon-action danger" aria-label="删除标注" @click="removeAnnotation(annotation.id)">
              <van-icon name="delete-o" />
            </button>
          </div>
        </article>
      </section>

      <section class="comments-list">
        <div class="panel-title">
          <strong>全部评论</strong>
          <span>{{ visibleComments.length }}</span>
        </div>
        <article
          v-for="comment in visibleComments"
          :key="comment.id"
          class="side-record comment-record"
          :class="commentItemClass(comment)"
        >
          <button type="button" class="side-record-main" @click="locateComment(comment)">
            <strong>{{ comment.text }}</strong>
            <span>{{ comment.author }} · {{ comment.createdAt }}</span>
            <small>{{ annotationTitle(comment.annotationId) }}</small>
          </button>
          <div v-if="!isViewingFinalVersion" class="record-actions">
            <button type="button" class="icon-action" aria-label="编辑评论" @click="beginEditComment(comment)">
              <van-icon name="edit" />
            </button>
            <button type="button" class="icon-action danger" aria-label="删除评论" @click="removeComment(comment.id)">
              <van-icon name="delete-o" />
            </button>
          </div>
          <form
            v-if="editingCommentId === comment.id && !isViewingFinalVersion"
            class="inline-edit compact"
            @submit.prevent="saveCommentEdit"
          >
            <textarea v-model="commentDraft" placeholder="更新这条临时评论"></textarea>
            <div class="inline-edit-actions">
              <button type="submit">保存评论</button>
              <button type="button" class="ghost" @click="cancelCommentEdit">取消</button>
            </div>
          </form>
        </article>
      </section>
    </aside>

    <van-popup v-model:show="pickerOpen" round position="bottom">
      <van-picker
        :title="pickerTitle"
        :columns="pickerColumns"
        @confirm="handlePickerConfirm"
        @cancel="pickerOpen = false"
      />
    </van-popup>

    <van-popup v-model:show="releaseDialogOpen" round class="dialog-popup">
      <section class="dialog-card">
        <p class="eyebrow">确认发版</p>
        <h2>生成定版快照</h2>
        <p>发版始终从当前草稿生成，会冻结草稿的标注、标注编辑、删除记录和评论，后续草稿修改不会影响这个版本。</p>
        <van-field v-model="releaseNameDraft" label="版本名称" placeholder="请输入版本名称" />
        <div class="dialog-actions">
          <van-button @click="releaseDialogOpen = false">取消</van-button>
          <van-button type="primary" @click="confirmPublishVersion">确认发版</van-button>
        </div>
      </section>
    </van-popup>

    <van-popup v-model:show="renameDialogOpen" round class="dialog-popup">
      <section class="dialog-card">
        <p class="eyebrow">版本管理</p>
        <h2>重命名版本</h2>
        <p>仅修改历史中的版本名称，不改变该版本已冻结的标注和评论数据。</p>
        <van-field v-model="renameNameDraft" label="版本名称" placeholder="请输入版本名称" />
        <div class="dialog-actions">
          <van-button @click="renameDialogOpen = false">取消</van-button>
          <van-button type="primary" @click="confirmRenameVersion">保存名称</van-button>
        </div>
      </section>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import MarkdownIt from "markdown-it";
import mermaid from "mermaid";
import { showConfirmDialog, showToast } from "vant";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { generatedDocs } from "./data/generatedDocs";
import { prdData } from "./data/prdData";
import { usePrdStore } from "./stores/prd";
import type {
  AnnotationPatch,
  BoardAnnotation,
  BoardFrame,
  GeneratedDoc,
  PrototypeAction,
  PrototypeField,
  ReviewComment,
  VersionRecord,
  VersionSnapshot,
} from "./types";

type AnnotationSource = NonNullable<BoardAnnotation["source"]>;

type LocatedAnnotation = BoardAnnotation & {
  frameId: string;
  sectionId: string;
  sectionTitle: string;
  fileId: string;
  fileTitle: string;
  frameTitle: string;
  source: AnnotationSource;
};

type AnnotationDraft = {
  title: string;
  reqId: string;
  detail: string;
};

type PickerKind = "version" | "role" | "scenario" | "state" | "annotationReq";

type PickerColumn = {
  text: string;
  value: string;
};

type PickerConfirmPayload = {
  selectedOptions?: PickerColumn[];
  selectedValues?: Array<string | number>;
};

const emptyDoc: GeneratedDoc = {
  id: "empty",
  title: "暂无文档",
  fileName: "",
  summary: "当前没有可展示的生成文档。",
  content: "",
};

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  theme: "base",
  themeVariables: {
    primaryColor: "#ecfeff",
    primaryTextColor: "#134e4a",
    primaryBorderColor: "#0f766e",
    lineColor: "#475569",
    secondaryColor: "#fff7ed",
    tertiaryColor: "#fdf2f8",
  },
});

const store = usePrdStore();
const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});
const draftComment = ref("");
const commentDraft = ref("");
const annotationDraft = ref<AnnotationDraft>({
  title: "",
  reqId: "",
  detail: "",
});
const editingAnnotationId = ref("");
const editingCommentId = ref("");
const activeVersionTarget = ref("draft");
const activeDocId = ref(generatedDocs[0]?.id || emptyDoc.id);
const pickerOpen = ref(false);
const activePickerKind = ref<PickerKind>("version");
const releaseDialogOpen = ref(false);
const renameDialogOpen = ref(false);
const releaseNameDraft = ref("1.0.0");
const renameNameDraft = ref("");
const isAnnotationMode = ref(false);
const isPanMode = ref(true);
const canvasZoom = ref(1);
const canvasPan = ref({ x: 0, y: 0 });
const dragStart = ref<{ clientX: number; clientY: number; panX: number; panY: number } | null>(null);
const diagramSvg = ref("");
const diagramError = ref("");
const agreementChecked = ref(true);
const loadingActionId = ref("");
const locatedAnnotationId = ref("");

let locateHighlightTimer: number | undefined;

const activeScreen = computed(() => prdData.prototype.screens[0]);
const formValues = ref<Record<string, string>>(
  Object.fromEntries(activeScreen.value.fields.map((field) => [field.id, field.value])),
);

const orderedFeatureGroups = computed(() => {
  return [...prdData.featureGroups].sort((first, second) => first.priority - second.priority);
});
const activeFile = computed(() => store.activeFile);
const activeSection = computed(() => store.activeSection);
const allAnnotations = computed<LocatedAnnotation[]>(() => {
  const deletedAnnotationIds = new Set(displayedDeletedAnnotationIds.value);
  const annotations: LocatedAnnotation[] = [];

  for (const section of prdData.boardSections) {
    const file = findFileBySectionId(section.id);
    for (const frame of section.frames) {
      const frameAnnotations = [
        ...frame.annotations,
        ...displayedCustomAnnotations.value.filter((annotation) => annotation.frameId === frame.id),
      ];

      for (const annotation of frameAnnotations) {
        if (deletedAnnotationIds.has(annotation.id)) {
          continue;
        }

        const mergedAnnotation = mergeAnnotationEdits(annotation);
        annotations.push({
          ...mergedAnnotation,
          frameId: frame.id,
          sectionId: section.id,
          sectionTitle: section.title,
          fileId: file?.id || "",
          fileTitle: file?.title || section.title,
          frameTitle: frame.title,
          source: annotationSource(mergedAnnotation),
        });
      }
    }
  }

  return annotations;
});
const selectedAnnotation = computed(() => {
  return allAnnotations.value.find((annotation) => annotation.id === store.selectedAnnotationId);
});
const visibleComments = computed(() => {
  const annotationIds = new Set(allAnnotations.value.map((annotation) => annotation.id));
  return displayedComments.value.filter((comment) => annotationIds.has(comment.annotationId));
});
const diagramFrame = computed(() => activeSection.value?.frames.find((frame) => frame.diagram));
const isDiagramSection = computed(() => {
  return activeSection.value?.type === "flowchart" || activeSection.value?.type === "mindmap";
});
const sectionKindLabel = computed(() => {
  if (activeSection.value?.type === "mindmap") {
    return "思维导图";
  }
  if (activeSection.value?.type === "flowchart") {
    return "流程图";
  }

  return "高保真快照";
});
const activeFileTitle = computed(() => activeFile.value?.title || "未选择文件");
const activeSectionDescription = computed(() => activeSection.value?.description || "请选择左侧功能文件。");
const activeSectionReqIds = computed(() => activeSection.value?.reqIds || []);
const availableVersions = computed(() => {
  return [...prdData.versionHistory, ...store.versionRecords];
});
const activeVersion = computed(() => {
  return availableVersions.value.find((version) => version.id === activeVersionTarget.value);
});
const initialVersionSnapshot = computed<VersionSnapshot>(() => ({
  customAnnotations: [],
  annotationEdits: {},
  deletedAnnotationIds: [],
  comments: prdData.comments,
}));
const activeVersionSnapshot = computed(() => {
  if (activeVersion.value?.status !== "final") {
    return undefined;
  }

  return activeVersion.value.snapshot || initialVersionSnapshot.value;
});
const isViewingFinalVersion = computed(() => activeVersion.value?.status === "final");
const canDeleteActiveVersion = computed(() => {
  return activeVersion.value?.status === "final";
});
const canRenameActiveVersion = computed(() => {
  return activeVersion.value?.status === "final";
});
const displayedCustomAnnotations = computed(() => {
  if (!isViewingFinalVersion.value) {
    return store.customAnnotations;
  }

  return activeVersionSnapshot.value?.customAnnotations || [];
});
const displayedAnnotationEdits = computed<Record<string, AnnotationPatch>>(() => {
  if (!isViewingFinalVersion.value) {
    return store.annotationEdits;
  }

  return activeVersionSnapshot.value?.annotationEdits || {};
});
const displayedDeletedAnnotationIds = computed(() => {
  if (!isViewingFinalVersion.value) {
    return store.deletedAnnotationIds;
  }

  return activeVersionSnapshot.value?.deletedAnnotationIds || [];
});
const displayedComments = computed(() => {
  if (!isViewingFinalVersion.value) {
    return store.comments;
  }

  return activeVersionSnapshot.value?.comments || prdData.comments;
});
const activeVersionDisplay = computed(() => {
  const version = activeVersion.value;
  if (!version) {
    return "当前草稿 · 未定版";
  }

  if (version.status === "draft") {
    return version.label;
  }

  return `${versionName(version)} · 定版`;
});
const activeVersionDate = computed(() => {
  if (activeVersion.value?.status === "final") {
    return `发版日期：${activeVersion.value.createdAt || "未记录"}`;
  }

  return "草稿编辑中，未发版";
});
const activeVersionRenameText = computed(() => {
  const renameHistory = activeVersion.value?.renameHistory || [];
  const latest = renameHistory[renameHistory.length - 1];
  if (!latest) {
    return "";
  }

  return `最近重命名：${latest.from} -> ${latest.to} · ${latest.renamedAt}`;
});
const versionStatusLabel = computed(() => {
  if (prdData.meta.status === "draft") {
    return "草稿，定版后进入历史";
  }

  return "定版";
});
const activeDoc = computed(() => {
  const doc = generatedDocs.find((item) => item.id === activeDocId.value);
  if (doc) {
    return doc;
  }

  return generatedDocs[0] || emptyDoc;
});
const renderedActiveDoc = computed(() => {
  if (!activeDoc.value.content) {
    return markdown.render("暂无可预览内容。");
  }

  if (activeDoc.value.fileName.endsWith(".json")) {
    return markdown.render(`\`\`\`json\n${activeDoc.value.content}\n\`\`\``);
  }

  return markdown.render(activeDoc.value.content);
});
const zoomPercent = computed(() => `${Math.round(canvasZoom.value * 100)}%`);
const canvasStageStyle = computed(() => ({
  transform: `translate(${canvasPan.value.x}px, ${canvasPan.value.y}px) scale(${canvasZoom.value})`,
}));
const isDragging = computed(() => dragStart.value !== null);

const activeTabId = computed(() => {
  if (store.activeTabId) {
    return store.activeTabId;
  }

  return activeScreen.value.tabs[0]?.id || "";
});
const activeTabModel = computed({
  get() {
    return activeTabId.value;
  },
  set(tabId: string | number) {
    store.setActiveTab(String(tabId));
    store.activeStateId = "normal";
  },
});
const visibleFields = computed(() => {
  return activeScreen.value.fields.filter((field) => fieldMatchesTab(field, activeTabId.value));
});
const visibleActions = computed(() => {
  return activeScreen.value.actions.filter((action) => actionMatchesTab(action, activeTabId.value));
});
const activeRoleLabel = computed(() => {
  return prdData.roles.find((role) => role.id === store.activeRoleId)?.label || "未选择";
});
const activeScenarioLabel = computed(() => {
  return prdData.scenarios.find((scenario) => scenario.id === store.activeScenarioId)?.label || "未选择";
});
const activeState = computed(() => {
  return prdData.states.find((state) => state.id === store.activeStateId);
});
const activeStateLabel = computed(() => activeState.value?.label || "状态未定义");
const activeStateDescription = computed(() => activeState.value?.description || "请补充状态说明。");
const agreementError = computed(() => {
  if (store.activeStateId === "validation-error" && !agreementChecked.value) {
    return "请先勾选用户协议和隐私政策";
  }

  return "";
});
const pickerTitle = computed(() => {
  const titleMap: Record<PickerKind, string> = {
    version: "选择历史版本",
    role: "选择角色",
    scenario: "选择场景",
    state: "选择状态",
    annotationReq: "选择关联需求",
  };

  return titleMap[activePickerKind.value];
});
const pickerColumns = computed<PickerColumn[]>(() => {
  if (activePickerKind.value === "version") {
    return availableVersions.value.map((version) => ({
      text: versionOptionText(version),
      value: version.id,
    }));
  }

  if (activePickerKind.value === "role") {
    return prdData.roles.map((role) => ({ text: role.label, value: role.id }));
  }

  if (activePickerKind.value === "scenario") {
    return prdData.scenarios.map((scenario) => ({ text: scenario.label, value: scenario.id }));
  }

  if (activePickerKind.value === "state") {
    return prdData.states.map((state) => ({ text: state.label, value: state.id }));
  }

  return prdData.requirements.map((requirement) => ({
    text: `${requirement.id} · ${requirement.title}`,
    value: requirement.id,
  }));
});
const annotationDraftReqLabel = computed(() => {
  if (!annotationDraft.value.reqId) {
    return "请选择关联需求";
  }

  return `${annotationDraft.value.reqId} · ${requirementTitle(annotationDraft.value.reqId)}`;
});

onMounted(async () => {
  await store.loadReviewData();
  syncSelectedAnnotationWithCurrentVersion();
  void renderMermaid();
});

watch(
  () => activeSection.value?.id,
  () => {
    void nextTick(renderMermaid);
  },
);

watch(availableVersions, (versions) => {
  const exists = versions.some((version) => version.id === activeVersionTarget.value);
  if (!exists) {
    activeVersionTarget.value = "draft";
  }
});

watch(
  () => activeVersionTarget.value,
  () => {
    void nextTick(syncSelectedAnnotationWithCurrentVersion);
  },
);

async function confirmReviewAction(title: string, message: string, confirmButtonText: string) {
  try {
    await showConfirmDialog({
      title,
      message,
      confirmButtonText,
      cancelButtonText: "取消",
    });
    return true;
  } catch {
    return false;
  }
}

function versionName(version: VersionRecord) {
  return version.name || version.label.replace(/^定版\s+\d+\s*·\s*/, "");
}

function versionOptionText(version: VersionRecord) {
  if (version.status === "draft") {
    return version.label;
  }

  return `${versionName(version)} · ${version.createdAt || "未记录日期"}`;
}

function parseVersionName(name: string) {
  const match = name.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return undefined;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function nextReleaseName() {
  const parsedVersions = availableVersions.value
    .filter((version) => version.status === "final")
    .map((version) => parseVersionName(versionName(version)))
    .filter((version): version is { major: number; minor: number; patch: number } => Boolean(version))
    .sort((first, second) => {
      if (first.major !== second.major) {
        return second.major - first.major;
      }
      if (first.minor !== second.minor) {
        return second.minor - first.minor;
      }

      return second.patch - first.patch;
    });

  const latest = parsedVersions[0];
  if (!latest) {
    return "1.0.0";
  }

  return `${latest.major}.${latest.minor}.${latest.patch + 1}`;
}

function versionNameExists(name: string, excludedVersionId = "") {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return false;
  }

  return availableVersions.value.some((version) => {
    if (version.status !== "final" || version.id === excludedVersionId) {
      return false;
    }

    return versionName(version) === normalizedName;
  });
}

function isValidVersionName(name: string) {
  return Boolean(parseVersionName(name));
}

function extractPickerValue(payload: unknown) {
  if (Array.isArray(payload)) {
    const first = payload[0] as PickerColumn | string | number | undefined;
    if (first && typeof first === "object" && "value" in first) {
      return String(first.value);
    }

    return first === undefined ? "" : String(first);
  }

  const confirmPayload = payload as PickerConfirmPayload | undefined;
  const selectedOption = confirmPayload?.selectedOptions?.[0];
  if (selectedOption?.value !== undefined) {
    return String(selectedOption.value);
  }

  const selectedValue = confirmPayload?.selectedValues?.[0];
  return selectedValue === undefined ? "" : String(selectedValue);
}

function openPicker(kind: PickerKind) {
  activePickerKind.value = kind;
  pickerOpen.value = true;
}

function handlePickerConfirm(payload: unknown) {
  const value = extractPickerValue(payload);
  if (!value) {
    pickerOpen.value = false;
    return;
  }

  if (activePickerKind.value === "version") {
    activeVersionTarget.value = value;
    handleVersionChange();
  }
  if (activePickerKind.value === "role") {
    store.activeRoleId = value;
  }
  if (activePickerKind.value === "scenario") {
    store.activeScenarioId = value;
  }
  if (activePickerKind.value === "state") {
    store.activeStateId = value;
  }
  if (activePickerKind.value === "annotationReq") {
    annotationDraft.value.reqId = value;
  }

  pickerOpen.value = false;
}

function toReqIds(reqIds: string[]) {
  return reqIds.join(" ");
}

function isGroupExpanded(groupId: string) {
  return store.expandedGroupIds.includes(groupId);
}

function selectFile(fileId: string) {
  store.selectFile(fileId);
  resetCanvas();
  void nextTick(() => {
    syncSelectedAnnotationWithCurrentVersion();
    void renderMermaid();
  });
}

function syncSelectedAnnotationWithCurrentVersion() {
  const selectedExists = allAnnotations.value.some((annotation) => annotation.id === store.selectedAnnotationId);
  if (selectedExists) {
    return;
  }

  const nextAnnotationId = allAnnotations.value[0]?.id || "";
  if (nextAnnotationId) {
    store.selectAnnotation(nextAnnotationId);
    return;
  }

  store.selectAnnotation("");
}

function fileTypeLabel(type: string) {
  if (type === "flowchart") {
    return "流程图";
  }
  if (type === "mindmap") {
    return "思维导图";
  }

  return "快照";
}

function findFileBySectionId(sectionId: string) {
  for (const group of prdData.featureGroups) {
    const file = group.files.find((item) => item.sectionId === sectionId);
    if (file) {
      return file;
    }
  }

  return undefined;
}

function annotationSource(annotation: BoardAnnotation): AnnotationSource {
  if (annotation.source === "review") {
    return "review";
  }
  if (annotation.source === "generated") {
    return "generated";
  }

  return "product";
}

function annotationTone(annotation: BoardAnnotation) {
  if (annotationSource(annotation) === "review") {
    return "review";
  }

  return "product";
}

function annotationSourceLabel(annotation: BoardAnnotation) {
  if (annotationSource(annotation) === "review") {
    return "评审标注";
  }

  return "产品标注";
}

function mergeAnnotationEdits(annotation: BoardAnnotation) {
  const patch = displayedAnnotationEdits.value[annotation.id];
  if (!patch) {
    return annotation;
  }

  return {
    ...annotation,
    ...patch,
  };
}

function annotationItemClass(annotation: BoardAnnotation) {
  const tone = annotationTone(annotation);

  return {
    active: store.selectedAnnotationId === annotation.id,
    located: locatedAnnotationId.value === annotation.id,
    product: tone === "product",
    review: tone === "review",
  };
}

function commentItemClass(comment: ReviewComment) {
  return {
    active: comment.annotationId === store.selectedAnnotationId,
    located: comment.annotationId === locatedAnnotationId.value,
  };
}

function frameAnnotations(frame: BoardFrame) {
  return allAnnotations.value.filter((annotation) => annotation.frameId === frame.id);
}

function annotationStyle(x: number, y: number) {
  return {
    left: `${x}%`,
    top: `${y}%`,
  };
}

function requirementTitle(reqId: string) {
  return prdData.requirements.find((requirement) => requirement.id === reqId)?.title || "未定义需求";
}

function fieldMatchesTab(field: PrototypeField, tabId: string) {
  if (!field.tabIds || field.tabIds.length === 0) {
    return true;
  }

  return field.tabIds.includes(tabId);
}

function actionMatchesTab(action: PrototypeAction, tabId: string) {
  if (!action.tabIds || action.tabIds.length === 0) {
    return true;
  }

  return action.tabIds.includes(tabId);
}

function snapshotTabId(frame: BoardFrame) {
  return frame.snapshot?.tabId || activeTabId.value;
}

function fieldsForSnapshot(frame: BoardFrame) {
  return activeScreen.value.fields.filter((field) => fieldMatchesTab(field, snapshotTabId(frame)));
}

function actionsForSnapshot(frame: BoardFrame) {
  return activeScreen.value.actions.filter((action) => actionMatchesTab(action, snapshotTabId(frame)));
}

function snapshotFieldValue(frame: BoardFrame, fieldId: string) {
  return frame.snapshot?.fieldValues?.[fieldId] || "";
}

function isSnapshotFieldError(frame: BoardFrame, fieldId: string) {
  if (frame.snapshot?.stateId !== "validation-error") {
    return false;
  }

  return snapshotFieldValue(frame, fieldId).trim().length === 0;
}

function snapshotStateText(frame: BoardFrame) {
  const stateId = frame.snapshot?.stateId || "normal";
  const state = prdData.states.find((item) => item.id === stateId);
  if (!state) {
    return "状态未定义";
  }

  return `${state.label}：${state.description}`;
}

function snapshotActionLabel(action: PrototypeAction, frame: BoardFrame) {
  if (action.id === "send-code" && frame.snapshot?.stateId === "code-sent") {
    return "56 秒后重试";
  }

  return action.label;
}

function fieldValue(fieldId: string) {
  return formValues.value[fieldId] || "";
}

function setFieldValue(fieldId: string, value: unknown) {
  formValues.value[fieldId] = String(value);
  if (store.activeStateId === "validation-error") {
    store.activeStateId = "normal";
  }
}

function fieldErrorMessage(fieldId: string) {
  if (store.activeStateId !== "validation-error") {
    return "";
  }

  if (fieldId === "phone-number" && activeTabId.value === "phone") {
    return "请输入正确的手机号";
  }
  if (fieldId === "sms-code" && activeTabId.value === "phone") {
    return "请输入 6 位短信验证码";
  }
  if (fieldId === "account-name" && activeTabId.value === "account") {
    return "请输入账号";
  }
  if (fieldId === "account-password" && activeTabId.value === "account") {
    return "请输入密码";
  }

  return "";
}

function buttonType(variant: PrototypeAction["variant"]) {
  if (variant === "primary") {
    return "primary";
  }
  if (variant === "secondary") {
    return "success";
  }

  return "default";
}

function actionLabel(action: PrototypeAction) {
  if (loadingActionId.value === action.id) {
    return "登录中";
  }
  if (action.id === "send-code" && store.activeStateId === "code-sent") {
    return "56 秒后重试";
  }

  return action.label;
}

function actionDisabled(action: PrototypeAction) {
  return action.id === "send-code" && store.activeStateId === "code-sent";
}

function findAnnotation(annotationId: string) {
  return allAnnotations.value.find((annotation) => annotation.id === annotationId);
}

function annotationTitle(annotationId: string) {
  const annotation = findAnnotation(annotationId);
  if (!annotation) {
    return "标注已移除";
  }

  return `${annotation.index}. ${annotation.title}`;
}

function selectAnnotation(annotationId: string) {
  store.selectAnnotation(annotationId);
  editingAnnotationId.value = "";
}

function submitComment() {
  if (isViewingFinalVersion.value) {
    return;
  }

  store.addComment(draftComment.value);
  draftComment.value = "";
}

function beginEditAnnotation(annotation: LocatedAnnotation) {
  if (isViewingFinalVersion.value) {
    return;
  }

  void locateAnnotation(annotation.id);
  editingAnnotationId.value = annotation.id;
  annotationDraft.value = {
    title: annotation.title,
    reqId: annotation.reqId,
    detail: annotation.detail,
  };
}

function saveAnnotationEdit() {
  const title = annotationDraft.value.title.trim();
  const detail = annotationDraft.value.detail.trim();
  if (!editingAnnotationId.value || !title || !detail) {
    return;
  }

  store.updateAnnotation(editingAnnotationId.value, {
    title,
    reqId: annotationDraft.value.reqId,
    detail,
  });
  editingAnnotationId.value = "";
}

function cancelAnnotationEdit() {
  editingAnnotationId.value = "";
}

async function removeAnnotation(annotationId: string) {
  if (isViewingFinalVersion.value) {
    return;
  }

  const annotation = findAnnotation(annotationId);
  const confirmed = await confirmReviewAction(
    "删除标注",
    `确认删除“${annotationTitle(annotationId)}”？关联到这个标注的临时评论也会一起删除。`,
    "确认删除",
  );
  if (!confirmed) {
    return;
  }

  store.deleteAnnotation(annotationId);
  if (editingAnnotationId.value === annotationId) {
    editingAnnotationId.value = "";
  }
  if (locatedAnnotationId.value === annotationId) {
    locatedAnnotationId.value = "";
  }
  if (annotation?.fileId) {
    store.selectFile(annotation.fileId);
  }
}

function beginEditComment(comment: ReviewComment) {
  if (isViewingFinalVersion.value) {
    return;
  }

  void locateAnnotation(comment.annotationId);
  editingCommentId.value = comment.id;
  commentDraft.value = comment.text;
}

function saveCommentEdit() {
  if (isViewingFinalVersion.value) {
    return;
  }

  store.updateComment(editingCommentId.value, commentDraft.value);
  editingCommentId.value = "";
  commentDraft.value = "";
}

function cancelCommentEdit() {
  editingCommentId.value = "";
  commentDraft.value = "";
}

async function removeComment(commentId: string) {
  if (isViewingFinalVersion.value) {
    return;
  }

  const comment = store.comments.find((item) => item.id === commentId);
  const confirmed = await confirmReviewAction(
    "删除评论",
    `确认删除这条临时评论？${comment?.text || ""}`,
    "确认删除",
  );
  if (!confirmed) {
    return;
  }

  store.deleteComment(commentId);
  if (editingCommentId.value === commentId) {
    cancelCommentEdit();
  }
}

function locateComment(comment: ReviewComment) {
  void locateAnnotation(comment.annotationId);
}

async function locateAnnotation(annotationId: string) {
  const annotation = findAnnotation(annotationId);
  if (!annotation) {
    return;
  }

  store.setView("prd");
  if (annotation.fileId && store.activeFileId !== annotation.fileId) {
    store.selectFile(annotation.fileId);
    resetCanvas();
    await nextTick();
    await renderMermaid();
  }

  store.selectAnnotation(annotationId);
  await nextTick();
  window.requestAnimationFrame(() => {
    alignAnnotationMarker(annotationId);
  });
}

function alignAnnotationMarker(annotationId: string) {
  const viewport = document.querySelector<HTMLElement>(".canvas-viewport");
  const target = document.querySelector<HTMLElement>(`[data-annotation-id="${annotationId}"]`);
  if (!viewport || !target) {
    return;
  }

  const viewportRect = viewport.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const anchorX = viewportRect.left + viewportRect.width * 0.48;
  const anchorY = viewportRect.top + viewportRect.height * 0.46;

  canvasPan.value = {
    x: canvasPan.value.x + anchorX - targetCenterX,
    y: canvasPan.value.y + anchorY - targetCenterY,
  };
  markLocatedAnnotation(annotationId);
}

function markLocatedAnnotation(annotationId: string) {
  locatedAnnotationId.value = annotationId;
  if (locateHighlightTimer) {
    window.clearTimeout(locateHighlightTimer);
  }

  locateHighlightTimer = window.setTimeout(() => {
    if (locatedAnnotationId.value === annotationId) {
      locatedAnnotationId.value = "";
    }
  }, 1400);
}

function canSubmitCurrentTab() {
  const requiredFieldsFilled = visibleFields.value.every((field) => {
    return fieldValue(field.id).trim().length > 0;
  });
  if (!requiredFieldsFilled) {
    return false;
  }

  if (!agreementChecked.value) {
    return false;
  }

  return true;
}

function handlePrototypeAction(actionId: string) {
  const action = visibleActions.value.find((item) => item.id === actionId);
  if (!action) {
    return;
  }

  if (action.id === "forgot-password") {
    store.lastInteraction = `${action.label}：${action.behavior}`;
    return;
  }

  if (action.id === "send-code") {
    const phoneDigits = fieldValue("phone-number").replace(/\D/g, "");
    if (phoneDigits.length !== 11) {
      store.activeStateId = "validation-error";
      store.lastInteraction = "获取验证码：手机号格式不正确，未发送请求。";
      return;
    }

    store.activeStateId = "code-sent";
    store.lastInteraction = `${action.label}：${action.behavior}`;
    return;
  }

  if (!canSubmitCurrentTab()) {
    store.activeStateId = "validation-error";
    store.lastInteraction = `${action.label}：字段或协议未通过校验，未发起登录。`;
    return;
  }

  loadingActionId.value = action.id;
  store.activeStateId = "loading";
  store.lastInteraction = `${action.label}：正在校验登录信息。`;
  window.setTimeout(() => {
    loadingActionId.value = "";
    if (action.targetState) {
      store.activeStateId = action.targetState;
    }
    store.lastInteraction = `${action.label}：${action.behavior}`;
  }, 450);
}

function openReleaseDialog() {
  if (isViewingFinalVersion.value) {
    activeVersionTarget.value = "draft";
    handleVersionChange();
  }

  releaseNameDraft.value = nextReleaseName();
  releaseDialogOpen.value = true;
}

async function confirmPublishVersion() {
  const versionNameValue = releaseNameDraft.value.trim();
  if (!versionNameValue) {
    return;
  }

  if (!isValidVersionName(versionNameValue)) {
    showToast("版本名称需为 X.Y.Z，例如 1.0.0");
    return;
  }

  if (versionNameExists(versionNameValue)) {
    showToast("版本名称已存在，请换一个名称");
    return;
  }

  const confirmed = await confirmReviewAction(
    "确认发版",
    `确认将当前草稿定版为“${versionNameValue}”？定版后会冻结当前标注、评论、编辑和删除记录。`,
    "确认发版",
  );
  if (!confirmed) {
    return;
  }

  try {
    const record = await store.publishVersion(versionNameValue);
    activeVersionTarget.value = record.id;
    releaseDialogOpen.value = false;
    editingAnnotationId.value = "";
    editingCommentId.value = "";
    draftComment.value = "";
    syncSelectedAnnotationWithCurrentVersion();
  } catch (error) {
    showToast(error instanceof Error ? error.message : "定版失败，未写入版本目录");
  }
}

function openRenameDialog() {
  if (!activeVersion.value || activeVersion.value.status !== "final") {
    return;
  }

  renameNameDraft.value = versionName(activeVersion.value);
  renameDialogOpen.value = true;
}

async function confirmRenameVersion() {
  const name = renameNameDraft.value.trim();
  if (!activeVersion.value || activeVersion.value.status !== "final" || !name) {
    return;
  }

  if (!isValidVersionName(name)) {
    showToast("版本名称需为 X.Y.Z，例如 1.0.0");
    return;
  }

  if (versionNameExists(name, activeVersion.value.id)) {
    showToast("版本名称已存在，请换一个名称");
    return;
  }

  try {
    await store.renameVersion(activeVersion.value.id, name);
    activeVersionTarget.value = `v${name}`;
    renameDialogOpen.value = false;
  } catch (error) {
    showToast(error instanceof Error ? error.message : "重命名版本失败");
  }
}

async function confirmDeleteActiveVersion() {
  const version = activeVersion.value;
  if (!version || version.status !== "final") {
    return;
  }

  const confirmed = await confirmReviewAction(
    "删除版本",
    `确认删除“${versionName(version)}”？删除后历史下拉中不再展示该定版记录。`,
    "确认删除",
  );
  if (!confirmed) {
    return;
  }

  try {
    await store.deleteVersion(version.id);
    activeVersionTarget.value = "draft";
    syncSelectedAnnotationWithCurrentVersion();
  } catch (error) {
    showToast(error instanceof Error ? error.message : "删除版本失败");
  }
}

function handleVersionChange() {
  const version = activeVersion.value;
  if (!version) {
    activeVersionTarget.value = "draft";
    return;
  }

  if (!version.path || version.source === "workspace") {
    store.lastInteraction = `正在查看：${version.status === "final" ? versionName(version) : version.label}`;
    editingAnnotationId.value = "";
    editingCommentId.value = "";
    draftComment.value = "";
    syncSelectedAnnotationWithCurrentVersion();
    return;
  }

  window.location.href = version.path;
}

function downloadActiveDoc() {
  if (!activeDoc.value.fileName) {
    return;
  }

  const blob = new Blob([activeDoc.value.content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = activeDoc.value.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toggleAnnotationMode() {
  if (isViewingFinalVersion.value) {
    isAnnotationMode.value = false;
    return;
  }

  isAnnotationMode.value = !isAnnotationMode.value;
  if (isAnnotationMode.value) {
    isPanMode.value = false;
  }
}

function togglePanMode() {
  isPanMode.value = !isPanMode.value;
  if (isPanMode.value) {
    isAnnotationMode.value = false;
  }
}

function zoomIn() {
  canvasZoom.value = Math.min(1.9, Number((canvasZoom.value + 0.1).toFixed(2)));
}

function zoomOut() {
  canvasZoom.value = Math.max(0.55, Number((canvasZoom.value - 0.1).toFixed(2)));
}

function resetCanvas() {
  canvasZoom.value = 1;
  canvasPan.value = { x: 0, y: 0 };
}

function startPan(event: MouseEvent) {
  if (!isPanMode.value) {
    return;
  }

  dragStart.value = {
    clientX: event.clientX,
    clientY: event.clientY,
    panX: canvasPan.value.x,
    panY: canvasPan.value.y,
  };
}

function movePan(event: MouseEvent) {
  if (!dragStart.value) {
    return;
  }

  canvasPan.value = {
    x: dragStart.value.panX + event.clientX - dragStart.value.clientX,
    y: dragStart.value.panY + event.clientY - dragStart.value.clientY,
  };
}

function endPan() {
  dragStart.value = null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function handleCanvasWheel(event: WheelEvent) {
  const viewport = event.currentTarget as HTMLElement;
  const rect = viewport.getBoundingClientRect();
  const pointerX = event.clientX - rect.left;
  const pointerY = event.clientY - rect.top;
  const stageX = (pointerX - canvasPan.value.x) / canvasZoom.value;
  const stageY = (pointerY - canvasPan.value.y) / canvasZoom.value;
  const delta = event.deltaY < 0 ? 0.08 : -0.08;
  const nextZoom = clamp(Number((canvasZoom.value + delta).toFixed(2)), 0.55, 1.9);

  canvasPan.value = {
    x: pointerX - stageX * nextZoom,
    y: pointerY - stageY * nextZoom,
  };
  canvasZoom.value = nextZoom;
}

function handleFrameClick(event: MouseEvent, frame: BoardFrame) {
  if (!isAnnotationMode.value || isViewingFinalVersion.value) {
    return;
  }

  const frameElement = event.currentTarget as HTMLElement;
  const rect = frameElement.getBoundingClientRect();
  const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 6, 94);
  const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 8, 92);
  const reqId = frame.reqIds[0] || prdData.requirements[0]?.id || "REQ-001";
  store.addAnnotation(frame.id, reqId, x, y);
}

async function renderMermaid() {
  const frame = diagramFrame.value;
  if (!frame?.diagram) {
    diagramSvg.value = "";
    diagramError.value = "";
    return;
  }

  diagramError.value = "";
  const renderId = `prd-diagram-${frame.id}-${Date.now()}`;
  try {
    const result = await mermaid.render(renderId, frame.diagram.code);
    if (diagramFrame.value?.id === frame.id) {
      diagramSvg.value = result.svg;
    }
  } catch {
    diagramSvg.value = "";
    diagramError.value = "流程图渲染失败，请检查 Mermaid 语法。";
  }
}
</script>
