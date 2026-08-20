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
        <a-tag>{{ selectedAnnotation.reqId }} · {{ requirementTitle(selectedAnnotation.reqId) }}</a-tag>
        <a-space v-if="!readonly" class="selected-actions">
          <a-button size="small" @click="beginAnnotationEdit(selectedAnnotation)"><EditOutlined /> 编辑</a-button>
          <a-button size="small" danger @click="emit('deleteAnnotation', selectedAnnotation.id)"><DeleteOutlined /> 删除</a-button>
        </a-space>
      </template>
      <a-empty v-else :image="simpleImage" description="请选择一个标注" />
    </section>

    <section class="comment-editor">
      <div class="panel-heading"><strong>添加评论</strong><span>临时评审记录</span></div>
      <a-textarea v-model:value="commentText" :disabled="readonly || !selectedAnnotation" :rows="3" placeholder="记录问题、讨论或待确认项" />
      <a-button
        type="primary"
        block
        :disabled="readonly || !selectedAnnotation || !commentText.trim()"
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
          <div><strong>{{ annotation.title }}</strong><small>{{ annotation.reqId }} · {{ annotation.detail }}</small></div>
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
            <small>{{ comment.author }} · {{ comment.createdAt }}</small>
          </button>
          <a-space v-if="!readonly" size="small">
            <a-button type="text" size="small" @click="beginCommentEdit(comment)"><EditOutlined /></a-button>
            <a-button type="text" size="small" danger @click="emit('deleteComment', comment.id)"><DeleteOutlined /></a-button>
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

const props = defineProps<{
  annotations: LocatedAnnotation[];
  comments: ReviewComment[];
  selectedAnnotation?: LocatedAnnotation;
  requirements: Requirement[];
  readonly: boolean;
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

function requirementTitle(reqId: string) {
  return props.requirements.find((item) => item.id === reqId)?.title || "未匹配需求";
}

function annotationTitle(annotationId: string) {
  const annotation = props.annotations.find((item) => item.id === annotationId);
  return annotation ? `${annotation.index}. ${annotation.title}` : "标注已移除";
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
