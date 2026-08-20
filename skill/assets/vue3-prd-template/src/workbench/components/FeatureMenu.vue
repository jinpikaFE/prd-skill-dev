<template>
  <aside class="feature-rail" aria-label="功能清单">
    <div class="brand-block">
      <span>PRD 工作台</span>
      <strong>{{ featureName }}</strong>
      <small>{{ version }} · {{ statusLabel }}</small>
    </div>

    <a-menu
      class="feature-menu"
      mode="inline"
      :selected-keys="[activeFileId]"
      :open-keys="openKeys"
      @click="handleSelect"
      @open-change="handleOpenChange"
    >
      <a-sub-menu v-for="group in orderedGroups" :key="group.id">
        <template #icon><FolderOutlined /></template>
        <template #title>{{ group.title }}</template>
        <a-menu-item v-for="file in group.files" :key="file.id" :title="file.description">
          <template #icon><FileOutlined /></template>
          {{ file.title }}
        </a-menu-item>
      </a-sub-menu>
    </a-menu>
  </aside>
</template>

<script setup lang="ts">
import { FileOutlined, FolderOutlined } from "@ant-design/icons-vue";
import { computed } from "vue";
import type { FeatureGroup } from "../../types";

const props = defineProps<{
  featureName: string;
  version: string;
  statusLabel: string;
  featureGroups: FeatureGroup[];
  activeFileId: string;
  openKeys: string[];
}>();

const emit = defineEmits<{
  select: [fileId: string];
  "update:openKeys": [keys: string[]];
}>();

const orderedGroups = computed(() => [...props.featureGroups].sort((a, b) => a.priority - b.priority));

function handleSelect(info: { key: string | number }) {
  emit("select", String(info.key));
}

function handleOpenChange(keys: Array<string | number>) {
  emit("update:openKeys", keys.map(String));
}
</script>
