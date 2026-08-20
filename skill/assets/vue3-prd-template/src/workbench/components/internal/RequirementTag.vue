<template>
  <a-tooltip placement="top">
    <template #title>
      <div class="requirement-tooltip-content">
        <strong>{{ reqId }} · {{ requirement?.title || "未匹配需求" }}</strong>
        <p>{{ requirement?.description || "暂无需求说明" }}</p>
        <small v-if="firstAcceptanceCriterion">验收：{{ firstAcceptanceCriterion }}</small>
      </div>
    </template>
    <a-tag
      :color="color"
      class="requirement-tag"
      tabindex="0"
      :aria-label="`${reqId} 需求详情`"
    >{{ tagText }}</a-tag>
  </a-tooltip>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Requirement } from "../../../types";

const props = withDefaults(defineProps<{
  reqId: string;
  requirements: Requirement[];
  color?: string;
  showTitle?: boolean;
}>(), {
  color: "blue",
  showTitle: false,
});

const requirement = computed(() => props.requirements.find((item) => item.id === props.reqId));
const firstAcceptanceCriterion = computed(() => requirement.value?.acceptanceCriteria[0] || "");
const tagText = computed(() => {
  if (!props.showTitle || !requirement.value) return props.reqId;
  return `${props.reqId} · ${requirement.value.title}`;
});
</script>

<style scoped>
.requirement-tag {
  cursor: help;
}

.requirement-tooltip-content {
  max-width: 320px;
}

.requirement-tooltip-content strong,
.requirement-tooltip-content small {
  display: block;
}

.requirement-tooltip-content p {
  margin: 6px 0 0;
  line-height: 1.6;
}

.requirement-tooltip-content small {
  margin-top: 8px;
  color: rgb(255 255 255 / 75%);
  line-height: 1.5;
}
</style>
