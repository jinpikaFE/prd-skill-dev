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
      <span>{{ annotation.index }}</span>
      <strong>{{ annotation.title }}</strong>
      <small>{{ annotation.source === 'product' ? '产品标注' : '生成标注' }} · {{ annotation.reqId }} · {{ annotation.detail }}</small>
    </button>
  </aside>
</template>

<script setup lang="ts">
import type { LocatedAnnotation } from "../../types";

defineProps<{ annotations: LocatedAnnotation[]; selectedId: string }>();
const emit = defineEmits<{ select: [id: string] }>();
</script>
