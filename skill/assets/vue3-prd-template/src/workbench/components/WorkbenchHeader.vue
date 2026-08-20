<template>
  <header class="workbench-header">
    <div class="workbench-title">
      <p>PRD 原型工作台</p>
      <EllipsisTooltipText :text="featureName" class-name="workbench-title-name" />
      <span>{{ summary }}</span>
    </div>

    <div class="workbench-toolbar">
      <div class="version-row">
        <a-select
          :value="activeVersionId"
          :options="renderedVersionOptions"
          class="history-select"
          aria-label="历史版本"
          @change="emit('versionChange', String($event))"
        />
        <EllipsisTooltipText :text="activeVersionDate" class-name="version-date" />
        <a-tooltip v-if="canOpenFolder" title="打开当前原型所在文件夹">
          <a-button size="small" aria-label="打开当前原型所在文件夹" @click="emit('openFolder')">
            <FolderOpenOutlined />
          </a-button>
        </a-tooltip>
        <a-button v-if="canRelease" type="primary" size="small" @click="emit('release')">发版</a-button>
        <a-button v-if="canPackage" size="small" @click="emit('package')"><FileZipOutlined /> 生成发布包</a-button>
        <a-dropdown v-if="canManageVersion">
          <a-tooltip title="版本操作">
            <a-button size="small" aria-label="版本操作"><MoreOutlined /></a-button>
          </a-tooltip>
          <template #overlay>
            <a-menu>
              <a-menu-item key="rename" @click="emit('rename')">重命名版本</a-menu-item>
              <a-menu-item key="delete" danger @click="emit('deleteVersion')">删除版本</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>

      <a-segmented
        :value="view"
        :options="viewOptions"
        @change="emit('viewChange', $event as WorkspaceView)"
      />
    </div>
  </header>

  <section class="context-filters" aria-label="场景控制">
    <label>
      <span>角色</span>
      <a-select :value="roleId" :options="roleOptions" @change="emit('roleChange', String($event))" />
    </label>
    <label>
      <span>场景</span>
      <a-select :value="scenarioId" :options="scenarioOptions" @change="emit('scenarioChange', String($event))" />
    </label>
    <label>
      <span>状态</span>
      <a-select :value="stateId" :options="stateOptions" @change="emit('stateChange', String($event))" />
    </label>
    <a-alert v-if="reviewModeMessage" :message="reviewModeMessage" type="info" show-icon />
  </section>
</template>

<script setup lang="ts">
import { FileZipOutlined, FolderOpenOutlined, MoreOutlined } from "@ant-design/icons-vue";
import { computed, h } from "vue";
import type { WorkspaceView } from "../../types";
import EllipsisTooltipText from "./internal/EllipsisTooltipText.vue";

type SelectOption = { label: string; value: string };

const props = defineProps<{
  featureName: string;
  summary: string;
  view: WorkspaceView;
  activeVersionId: string;
  activeVersionDate: string;
  versionOptions: SelectOption[];
  canManageVersion: boolean;
  canRelease: boolean;
  canPackage: boolean;
  canOpenFolder: boolean;
  reviewModeMessage: string;
  roleId: string;
  scenarioId: string;
  stateId: string;
  roleOptions: SelectOption[];
  scenarioOptions: SelectOption[];
  stateOptions: SelectOption[];
}>();

const renderedVersionOptions = computed(() => props.versionOptions.map((option) => ({
  ...option,
  label: h(EllipsisTooltipText, {
    text: option.label,
    className: "history-option-label",
  }),
})));

const emit = defineEmits<{
  viewChange: [view: WorkspaceView];
  versionChange: [versionId: string];
  release: [];
  rename: [];
  deleteVersion: [];
  openFolder: [];
  package: [];
  roleChange: [id: string];
  scenarioChange: [id: string];
  stateChange: [id: string];
}>();

const viewOptions = [
  { label: "PRD 标注", value: "prd" },
  { label: "高保真原型", value: "prototype" },
  { label: "文档查看", value: "docs" },
];
</script>
