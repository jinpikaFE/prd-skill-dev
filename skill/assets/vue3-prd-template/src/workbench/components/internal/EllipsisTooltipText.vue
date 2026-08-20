<template>
  <a-tooltip v-bind="tooltipProps" :title="resolvedTooltipTitle">
    <span
      ref="textRef"
      class="ellipsis-tooltip-text"
      :class="[isSingleLine ? 'single-line' : 'multi-line', className]"
      :style="textStyle"
    >{{ text }}</span>
  </a-tooltip>
</template>

<script setup lang="ts">
import type { TooltipProps } from "ant-design-vue";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = withDefaults(defineProps<{
  text: string;
  rows?: number;
  className?: string;
  tooltipTitle?: string;
  tooltipTrigger?: "overflow" | "always";
  tooltipProps?: Omit<TooltipProps, "title">;
}>(), {
  rows: 1,
  className: "",
  tooltipTitle: undefined,
  tooltipTrigger: "overflow",
  tooltipProps: undefined,
});

const textRef = ref<HTMLElement>();
const isOverflow = ref(false);
const normalizedRows = computed(() => Math.max(1, Math.floor(props.rows)));
const isSingleLine = computed(() => normalizedRows.value === 1);
const textStyle = computed(() => {
  if (isSingleLine.value) return undefined;
  return { WebkitLineClamp: String(normalizedRows.value) };
});
const resolvedTooltipTitle = computed(() => {
  if (props.tooltipTrigger === "always") return props.tooltipTitle || props.text;
  if (!isOverflow.value) return undefined;
  return props.tooltipTitle || props.text;
});

let resizeObserver: ResizeObserver | undefined;

function updateOverflow() {
  const element = textRef.value;
  if (!element) return;
  const horizontalOverflow = element.scrollWidth > element.clientWidth;
  const verticalOverflow = element.scrollHeight > element.clientHeight;
  isOverflow.value = isSingleLine.value ? horizontalOverflow : horizontalOverflow || verticalOverflow;
}

function observeSize() {
  const element = textRef.value;
  if (!element) return;
  updateOverflow();
  if (typeof ResizeObserver === "undefined") {
    window.addEventListener("resize", updateOverflow);
    return;
  }
  resizeObserver = new ResizeObserver(updateOverflow);
  resizeObserver.observe(element);
}

onMounted(() => {
  void nextTick(observeSize);
});

watch([() => props.text, normalizedRows], () => {
  void nextTick(updateOverflow);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener("resize", updateOverflow);
});
</script>

<style scoped>
.ellipsis-tooltip-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.single-line {
  display: block;
  white-space: nowrap;
}

.multi-line {
  display: -webkit-box;
  white-space: normal;
  -webkit-box-orient: vertical;
}
</style>
