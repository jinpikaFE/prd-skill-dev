<template>
  <header class="workbench-header">
    <div class="workbench-title">
      <p>PRD 原型工作台</p>
      <h1>{{ featureName }}</h1>
      <span>{{ summary }}</span>
    </div>

    <div class="workbench-toolbar">
      <div class="version-row">
        <a-select
          :value="activeVersionId"
          :options="versionOptions"
          class="history-select"
          aria-label="历史版本"
          @change="emit('versionChange', String($event))"
        />
        <span class="version-date">{{ activeVersionDate }}</span>
        <a-button type="primary" size="small" @click="emit('release')">发版</a-button>
        <a-dropdown :disabled="!canManageVersion">
          <a-button size="small"><MoreOutlined /></a-button>
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
    <a-alert v-if="readonly" message="当前为定版快照，只读查看" type="info" show-icon />
  </section>
</template>

<script setup lang="ts">
import { MoreOutlined } from "@ant-design/icons-vue";
import type { WorkspaceView } from "../../types";

type SelectOption = { label: string; value: string };

defineProps<{
  featureName: string;
  summary: string;
  view: WorkspaceView;
  activeVersionId: string;
  activeVersionDate: string;
  versionOptions: SelectOption[];
  canManageVersion: boolean;
  readonly: boolean;
  roleId: string;
  scenarioId: string;
  stateId: string;
  roleOptions: SelectOption[];
  scenarioOptions: SelectOption[];
  stateOptions: SelectOption[];
}>();

const emit = defineEmits<{
  viewChange: [view: WorkspaceView];
  versionChange: [versionId: string];
  release: [];
  rename: [];
  deleteVersion: [];
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
