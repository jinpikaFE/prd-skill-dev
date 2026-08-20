<template>
  <main class="mobile-prototype" :class="{ snapshot: runtime.isSnapshot.value }">
    <div class="mobile-status"><span>9:41</span><span>5G&nbsp;&nbsp;100%</span></div>
    <section class="mobile-content" :data-req-ids="runtime.screen.reqIds.join(' ')">
      <p class="prototype-eyebrow">{{ runtime.screen.eyebrow }}</p>
      <h1>{{ runtime.screen.headline }}</h1>
      <p class="prototype-subhead">{{ runtime.screen.subhead }}</p>

      <van-tabs
        v-model:active="runtime.activeTabId.value"
        type="card"
        shrink
        :disabled="runtime.isSnapshot.value"
        :data-req-ids="runtime.screen.reqIds.join(' ')"
        @change="runtime.emitInteraction('切换模式', runtime.screen.reqIds)"
      >
        <van-tab v-for="tab in runtime.screen.tabs" :key="tab.id" :title="tab.label" :name="tab.id" />
      </van-tabs>

      <van-form class="mobile-form">
        <div v-for="field in runtime.visibleFields.value" :key="field.id" class="field-shell">
          <van-field
            :model-value="runtime.fieldValue(field.id)"
            :type="field.inputType || 'text'"
            :label="field.label"
            :placeholder="field.placeholder"
            :error-message="runtime.fieldError(field)"
            :readonly="runtime.isSnapshot.value || field.state === 'readonly'"
            :disabled="field.state === 'disabled'"
            :data-req-id="field.reqId"
            @update:model-value="runtime.setFieldValue(field.id, $event)"
          />
          <small v-if="field.helper">{{ field.helper }}</small>
        </div>

        <van-checkbox
          v-model="runtime.agreementChecked.value"
          shape="square"
          icon-size="16px"
          :disabled="runtime.isSnapshot.value"
          :data-req-id="runtime.screen.legalReqId || runtime.screen.reqIds[0]"
        >
          {{ runtime.screen.legalCopy }}
        </van-checkbox>

        <div class="mobile-actions">
          <van-button
            v-for="action in runtime.visibleActions.value"
            :key="action.id"
            block
            round
            :plain="action.variant === 'ghost'"
            :type="buttonType(action.variant)"
            :loading="runtime.loadingActionId.value === action.id"
            :disabled="runtime.actionDisabled(action)"
            :data-req-id="action.reqId"
            @click="runtime.handleAction(action)"
          >
            {{ runtime.actionLabel(action) }}
          </van-button>
        </div>
      </van-form>
      <p class="prototype-feedback">{{ runtime.feedback.value }}</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Button as VanButton, Checkbox as VanCheckbox, Field as VanField, Form as VanForm, Tab as VanTab, Tabs as VanTabs } from "vant";
import "vant/lib/index.css";
import { usePrototypeRuntime } from "../runtime";
import type { PrototypeAction } from "../../types";
import "../prototype.css";

const runtime = usePrototypeRuntime();

function buttonType(variant: PrototypeAction["variant"]) {
  if (variant === "primary") {
    return "primary";
  }
  if (variant === "secondary") {
    return "success";
  }
  return "default";
}
</script>
