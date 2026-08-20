<template>
  <aside class="callout-stack">
    <button
      v-for="annotation in annotations"
      :key="annotation.id"
      type="button"
      class="callout-item"
      :class="{ active: annotation.id === selectedId }"
      @click="emit('select', annotation.id)"
    >
      <span class="callout-index">{{ annotation.index }}</span>
      <EllipsisTooltipText :text="annotation.title" class-name="callout-title" />
      <EllipsisTooltipText
        :text="`${annotation.source === 'product' ? '产品标注' : '生成标注'} · ${annotation.reqId} · ${annotation.detail}`"
        :rows="2"
        class-name="callout-detail"
      />
    </button>
  </aside>
</template>

<script setup lang="ts">
import type { LocatedAnnotation } from "../../types";
import EllipsisTooltipText from "./EllipsisTooltipText.vue";

defineProps<{ annotations: LocatedAnnotation[]; selectedId: string }>();
const emit = defineEmits<{ select: [id: string] }>();
</script>
