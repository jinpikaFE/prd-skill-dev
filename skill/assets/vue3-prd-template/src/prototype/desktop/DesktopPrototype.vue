<template>
  <a-config-provider :locale="zhCN">
    <main class="desktop-prototype" :class="{ snapshot: runtime.isSnapshot.value }">
      <header class="desktop-header">
        <div>
          <p class="prototype-eyebrow">{{ runtime.screen.eyebrow }}</p>
          <h1>{{ runtime.screen.headline }}</h1>
          <p>{{ runtime.screen.subhead }}</p>
        </div>
        <a-tag color="blue">{{ runtime.activeStateId.value }}</a-tag>
      </header>

      <section class="desktop-panel" :data-req-ids="runtime.screen.reqIds.join(' ')">
        <a-tabs
          v-model:active-key="runtime.activeTabId.value"
          :data-req-ids="runtime.screen.reqIds.join(' ')"
          @change="runtime.emitInteraction('切换模式', runtime.screen.reqIds)"
        >
          <a-tab-pane v-for="tab in runtime.screen.tabs" :key="tab.id" :tab="tab.label" />
        </a-tabs>

        <a-form layout="vertical" class="desktop-form">
          <a-form-item
            v-for="field in runtime.visibleFields.value"
            :key="field.id"
            :label="field.label"
            :help="runtime.fieldError(field) || field.helper"
            :validate-status="runtime.fieldError(field) ? 'error' : ''"
          >
            <a-input-password
              v-if="field.inputType === 'password'"
              :value="runtime.fieldValue(field.id)"
              :placeholder="field.placeholder"
              :disabled="runtime.isSnapshot.value || field.state === 'disabled'"
              :data-req-id="field.reqId"
              @update:value="runtime.setFieldValue(field.id, $event)"
            />
            <a-input
              v-else
              :value="runtime.fieldValue(field.id)"
              :placeholder="field.placeholder"
              :disabled="runtime.isSnapshot.value || field.state === 'disabled'"
              :data-req-id="field.reqId"
              @update:value="runtime.setFieldValue(field.id, $event)"
            />
          </a-form-item>

          <a-checkbox
            v-model:checked="runtime.agreementChecked.value"
            :disabled="runtime.isSnapshot.value"
            :data-req-id="runtime.screen.legalReqId || runtime.screen.reqIds[0]"
          >
            {{ runtime.screen.legalCopy }}
          </a-checkbox>

          <a-space class="desktop-actions">
            <a-button
              v-for="action in runtime.visibleActions.value"
              :key="action.id"
              :type="action.variant === 'primary' ? 'primary' : 'default'"
              :loading="runtime.loadingActionId.value === action.id"
              :disabled="runtime.actionDisabled(action)"
              :data-req-id="action.reqId"
              @click="runtime.handleAction(action)"
            >
              {{ runtime.actionLabel(action) }}
            </a-button>
          </a-space>
        </a-form>

        <a-alert :message="runtime.feedback.value" type="info" show-icon />
      </section>
    </main>
  </a-config-provider>
</template>

<script setup lang="ts">
import zhCN from "ant-design-vue/es/locale/zh_CN";
import { usePrototypeRuntime } from "../runtime";
import "../prototype.css";

const runtime = usePrototypeRuntime();
</script>
