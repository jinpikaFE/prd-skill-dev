<template>
  <aside class="review-panel" aria-label="标注与评论列表">
    <section class="selected-annotation">
      <div class="panel-heading">
        <strong>当前标注</strong>
        <a-tag v-if="selectedAnnotation" :color="selectedAnnotation.source === 'product' ? 'gold' : 'blue'">
          {{ selectedAnnotation.source === "product" ? "产品标注" : "生成标注" }}
        </a-tag>
      </div>
      <template v-if="selectedAnnotation">
        <h2>{{ selectedAnnotation.index }}. {{ selectedAnnotation.title }}</h2>
        <p>{{ selectedAnnotation.detail }}</p>
        <RequirementTag
          :req-id="selectedAnnotation.reqId"
          :requirements="requirements"
          show-title
        />
        <a-space v-if="canManageAnnotations" class="selected-actions">
          <a-button size="small" @click="beginAnnotationEdit(selectedAnnotation)"><EditOutlined /> 编辑</a-button>
          <a-button size="small" danger @click="emit('deleteAnnotation', selectedAnnotation.id)"><DeleteOutlined /> 删除</a-button>
        </a-space>
      </template>
      <a-empty v-else :image="simpleImage" description="请选择一个标注" />
    </section>

    <section class="comment-editor">
      <div class="panel-heading"><strong>添加评论</strong><span>匿名评审 · 记录日期</span></div>
      <a-textarea v-model:value="commentText" :disabled="!canAddComments || !selectedAnnotation" :rows="3" placeholder="记录问题、讨论或待确认项" />
      <a-button
        type="primary"
        block
        :disabled="!canAddComments || !selectedAnnotation || !commentText.trim()"
        @click="submitComment"
      >添加评论</a-button>
    </section>

    <section class="review-list-section">
      <div class="panel-heading"><strong>全部标注</strong><a-badge :count="annotations.length" /></div>
      <div class="review-list">
        <button
          v-for="annotation in annotations"
          :key="annotation.id"
          type="button"
          class="review-list-item annotation-item"
          :class="{ active: annotation.id === selectedAnnotation?.id }"
          @click="emit('locateAnnotation', annotation.id)"
        >
          <span>{{ annotation.index }}</span>
          <div>
            <EllipsisTooltipText :text="annotation.title" class-name="review-item-title" />
            <EllipsisTooltipText
              :text="`${annotation.reqId} · ${annotation.detail}`"
              :rows="2"
              class-name="review-item-detail"
            />
          </div>
        </button>
      </div>
    </section>

    <section class="review-list-section comments-section">
      <div class="panel-heading"><strong>全部评论</strong><a-badge :count="comments.length" /></div>
      <div class="review-list">
        <article v-for="comment in comments" :key="comment.id" class="comment-item">
          <button type="button" @click="emit('locateComment', comment)">
            <strong>{{ annotationTitle(comment.annotationId) }}</strong>
            <p>{{ comment.text }}</p>
            <small>{{ commentMeta(comment) }}</small>
          </button>
          <a-space v-if="canManageComments" size="small">
            <a-tooltip title="编辑评论">
              <a-button type="text" size="small" aria-label="编辑评论" @click="beginCommentEdit(comment)">
                <EditOutlined />
              </a-button>
            </a-tooltip>
            <a-tooltip title="删除评论">
              <a-button type="text" size="small" danger aria-label="删除评论" @click="emit('deleteComment', comment.id)">
                <DeleteOutlined />
              </a-button>
            </a-tooltip>
          </a-space>
        </article>
      </div>
    </section>

    <a-modal v-model:open="annotationEditOpen" title="编辑产品标注" ok-text="保存" cancel-text="取消" @ok="saveAnnotation">
      <a-form layout="vertical">
        <a-form-item label="标注标题"><a-input v-model:value="annotationDraft.title" /></a-form-item>
        <a-form-item label="关联需求">
          <a-select v-model:value="annotationDraft.reqId" :options="requirementOptions" />
        </a-form-item>
        <a-form-item label="标注说明"><a-textarea v-model:value="annotationDraft.detail" :rows="4" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="commentEditOpen" title="编辑评论" ok-text="保存" cancel-text="取消" @ok="saveComment">
      <a-textarea v-model:value="commentDraft.text" :rows="4" />
    </a-modal>
  </aside>
</template>

<script setup lang="ts">
import { DeleteOutlined, EditOutlined } from "@ant-design/icons-vue";
import { Empty } from "ant-design-vue";
import { computed, reactive, ref } from "vue";
import type { AnnotationPatch, Requirement, ReviewComment } from "../../types";
import type { LocatedAnnotation } from "../types";
import EllipsisTooltipText from "./internal/EllipsisTooltipText.vue";
import RequirementTag from "./internal/RequirementTag.vue";

const props = defineProps<{
  annotations: LocatedAnnotation[];
  comments: ReviewComment[];
  selectedAnnotation?: LocatedAnnotation;
  requirements: Requirement[];
  canManageAnnotations: boolean;
  canAddComments: boolean;
  canManageComments: boolean;
}>();

const emit = defineEmits<{
  locateAnnotation: [id: string];
  locateComment: [comment: ReviewComment];
  addComment: [text: string];
  updateAnnotation: [id: string, patch: AnnotationPatch];
  deleteAnnotation: [id: string];
  updateComment: [id: string, text: string];
  deleteComment: [id: string];
}>();

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE;
const commentText = ref("");
const annotationEditOpen = ref(false);
const commentEditOpen = ref(false);
const annotationDraft = reactive({ id: "", title: "", reqId: "", detail: "" });
const commentDraft = reactive({ id: "", text: "" });
const requirementOptions = computed(() => props.requirements.map((item) => ({ label: `${item.id} · ${item.title}`, value: item.id })));

function annotationTitle(annotationId: string) {
  const annotation = props.annotations.find((item) => item.id === annotationId);
  return annotation ? `${annotation.index}. ${annotation.title}` : "标注已移除";
}

function formatCommentDate(comment: ReviewComment) {
  const createdAt = comment.createdAt?.trim() || "";
  const normalized = createdAt.replace(/^(\d{4})\/(\d{2})\/(\d{2})/, "$1-$2-$3");
  const parsedTime = Date.parse(normalized);
  if (Number.isFinite(parsedTime)) return formatTimestamp(parsedTime);
  const timestamp = Number(comment.id.match(/^comment-(\d{13})/)?.[1]);
  if (Number.isFinite(timestamp) && timestamp > 0) {
    return formatTimestamp(timestamp);
  }
  return "日期未记录";
}

function formatTimestamp(timestamp: number) {
  if (!Number.isFinite(timestamp)) return "日期未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function commentMeta(comment: ReviewComment) {
  const date = `创建时间：${formatCommentDate(comment)}`;
  const updateTime = comment.updatedAt ? ` · 编辑时间：${formatTimestamp(Date.parse(comment.updatedAt))}` : "";
  const author = comment.author ? `${comment.author} · ` : "";
  return `${author}${date}${updateTime}`;
}

function submitComment() {
  emit("addComment", commentText.value);
  commentText.value = "";
}

function beginAnnotationEdit(annotation: LocatedAnnotation) {
  annotationDraft.id = annotation.id;
  annotationDraft.title = annotation.title;
  annotationDraft.reqId = annotation.reqId;
  annotationDraft.detail = annotation.detail;
  annotationEditOpen.value = true;
}

function saveAnnotation() {
  if (!annotationDraft.id || !annotationDraft.title.trim() || !annotationDraft.detail.trim()) return;
  emit("updateAnnotation", annotationDraft.id, {
    title: annotationDraft.title.trim(),
    reqId: annotationDraft.reqId,
    detail: annotationDraft.detail.trim(),
  });
  annotationEditOpen.value = false;
}

function beginCommentEdit(comment: ReviewComment) {
  commentDraft.id = comment.id;
  commentDraft.text = comment.text;
  commentEditOpen.value = true;
}

function saveComment() {
  if (!commentDraft.id || !commentDraft.text.trim()) return;
  emit("updateComment", commentDraft.id, commentDraft.text.trim());
  commentEditOpen.value = false;
}
</script>
