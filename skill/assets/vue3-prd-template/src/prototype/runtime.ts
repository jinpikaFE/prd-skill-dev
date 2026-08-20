import { computed, ref } from "vue";
import { prdData } from "../data/prdData";
import type { PrototypeAction, PrototypeField } from "../types";

export function usePrototypeRuntime() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") === "snapshot" ? "snapshot" : "interactive";
  const frameId = params.get("frameId") || "";
  const frame = prdData.boardSections.flatMap((section) => section.frames).find((item) => item.id === frameId);
  const screen = prdData.prototype.screens[0];
  const initialTabId = frame?.snapshot?.tabId || screen.tabs[0]?.id || "";
  const activeTabId = ref(initialTabId);
  const activeStateId = ref(frame?.snapshot?.stateId || params.get("state") || prdData.states[0]?.id || "normal");
  const agreementChecked = ref(frame?.snapshot?.agreementAccepted !== false);
  const loadingActionId = ref("");
  const feedback = ref(frame?.snapshot?.message || "尚未触发原型交互");
  const formValues = ref<Record<string, string>>(
    Object.fromEntries(
      screen.fields.map((field) => [field.id, frame?.snapshot?.fieldValues?.[field.id] ?? field.value]),
    ),
  );

  const visibleFields = computed(() => screen.fields.filter((field) => matchesTab(field.tabIds)));
  const visibleActions = computed(() => screen.actions.filter((action) => matchesTab(action.tabIds)));
  const isSnapshot = computed(() => mode === "snapshot");

  function matchesTab(tabIds?: string[]) {
    return !tabIds || tabIds.length === 0 || tabIds.includes(activeTabId.value);
  }

  function emitInteraction(action: string, reqIds: string[]) {
    window.parent.postMessage(
      {
        type: "prd:prototype-interaction",
        action,
        sceneId: frame?.snapshot?.sceneId || frameId || screen.id,
        reqIds,
      },
      window.location.origin,
    );
  }

  function fieldValue(fieldId: string) {
    return formValues.value[fieldId] || "";
  }

  function setFieldValue(fieldId: string, value: unknown) {
    if (isSnapshot.value) {
      return;
    }
    formValues.value[fieldId] = String(value);
    if (activeStateId.value === "validation-error") {
      activeStateId.value = "normal";
    }
  }

  function fieldError(field: PrototypeField) {
    if (activeStateId.value !== "validation-error") {
      return "";
    }
    if (!fieldValue(field.id).trim()) {
      return `请输入${field.label}`;
    }
    if (field.inputType === "tel" && fieldValue(field.id).replace(/\D/g, "").length !== 11) {
      return "请输入正确的 11 位手机号";
    }
    return "";
  }

  function actionDisabled(action: PrototypeAction) {
    if (isSnapshot.value) {
      return true;
    }
    return action.id === "send-code" && activeStateId.value === "code-sent";
  }

  function actionLabel(action: PrototypeAction) {
    if (loadingActionId.value === action.id) {
      return "处理中";
    }
    if (action.id === "send-code" && activeStateId.value === "code-sent") {
      return "56 秒后重试";
    }
    return action.label;
  }

  function validateVisibleFields() {
    return visibleFields.value.every((field) => {
      const value = fieldValue(field.id).trim();
      if (!value) {
        return false;
      }
      if (field.inputType === "tel") {
        return value.replace(/\D/g, "").length === 11;
      }
      return true;
    });
  }

  function handleAction(action: PrototypeAction) {
    if (actionDisabled(action)) {
      return;
    }
    emitInteraction(action.label, [action.reqId]);
    if (action.id === "send-code") {
      const phoneField = visibleFields.value.find((field) => field.inputType === "tel");
      if (!phoneField || fieldError(phoneField)) {
        activeStateId.value = "validation-error";
        feedback.value = "手机号格式不正确，未发送验证码。";
        return;
      }
      activeStateId.value = "code-sent";
      feedback.value = action.behavior;
      return;
    }
    if (!validateVisibleFields() || !agreementChecked.value) {
      activeStateId.value = "validation-error";
      feedback.value = "字段或协议未通过校验，未提交操作。";
      return;
    }
    loadingActionId.value = action.id;
    activeStateId.value = "loading";
    feedback.value = `${action.label}：处理中。`;
    window.setTimeout(() => {
      loadingActionId.value = "";
      activeStateId.value = action.targetState || "normal";
      feedback.value = `${action.label}：${action.behavior}`;
    }, 450);
  }

  return {
    mode,
    screen,
    frame,
    activeTabId,
    activeStateId,
    agreementChecked,
    loadingActionId,
    feedback,
    visibleFields,
    visibleActions,
    isSnapshot,
    fieldValue,
    setFieldValue,
    fieldError,
    actionDisabled,
    actionLabel,
    handleAction,
    emitInteraction,
  };
}
