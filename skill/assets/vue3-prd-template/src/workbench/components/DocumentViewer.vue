<template>
  <section class="docs-view" aria-label="文档查看">
    <a-menu mode="inline" :selected-keys="[activeDocId]" class="doc-menu" @click="selectDoc">
      <a-menu-item v-for="doc in docs" :key="doc.id">
        <template #icon><FileTextOutlined /></template>
        <EllipsisTooltipText :text="doc.title" class-name="doc-menu-title" />
      </a-menu-item>
    </a-menu>

    <article class="doc-reader">
      <header>
        <div>
          <p>生成文档</p>
          <EllipsisTooltipText :text="activeDoc.title" class-name="document-title" />
          <span class="document-summary">{{ activeDoc.summary }}</span>
        </div>
        <a-tooltip :title="activeDoc.fileName || undefined">
          <a-button type="primary" ghost @click="download">下载 {{ activeDoc.fileName }}</a-button>
        </a-tooltip>
      </header>
      <div class="markdown-preview" v-html="renderedContent"></div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { FileTextOutlined } from "@ant-design/icons-vue";
import MarkdownIt from "markdown-it";
import { computed, ref } from "vue";
import type { GeneratedDoc } from "../../types";
import EllipsisTooltipText from "./internal/EllipsisTooltipText.vue";

const props = defineProps<{ docs: GeneratedDoc[] }>();
const activeDocId = ref(props.docs[0]?.id || "");
const markdown = new MarkdownIt({ html: false, linkify: true, typographer: true });
const emptyDoc: GeneratedDoc = { id: "empty", title: "暂无文档", fileName: "", summary: "", content: "" };
const activeDoc = computed(() => props.docs.find((doc) => doc.id === activeDocId.value) || emptyDoc);
const renderedContent = computed(() => markdown.render(activeDoc.value.content));

function selectDoc(info: { key: string | number }) {
  activeDocId.value = String(info.key);
}

function download() {
  if (!activeDoc.value.fileName) {
    return;
  }
  const blob = new Blob([activeDoc.value.content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = activeDoc.value.fileName;
  link.click();
  URL.revokeObjectURL(url);
}
</script>
