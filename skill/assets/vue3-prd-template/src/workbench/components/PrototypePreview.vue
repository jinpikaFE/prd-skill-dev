<template>
  <section class="prototype-view" aria-label="高保真原型">
    <div class="prototype-stage" :class="`platform-${platform}`">
      <iframe
        title="高保真交互原型"
        :src="prototypeUrl"
        :style="frameStyle"
        data-testid="prototype-iframe"
      />
    </div>
    <aside class="prototype-console">
      <p>交互反馈</p>
      <strong>{{ feedback }}</strong>
      <span>原型端：{{ platform === 'mobile' ? '移动端 · Vant' : '桌面端 · Ant Design Vue' }}</span>
      <span>当前角色：{{ roleLabel }}</span>
      <span>当前场景：{{ scenarioLabel }}</span>
      <span>当前状态：{{ stateLabel }}</span>
      <div>
        <a-tag v-for="reqId in reqIds" :key="reqId" color="blue">{{ reqId }}</a-tag>
      </div>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TargetPlatform } from "../../types";

const props = defineProps<{
  platform: TargetPlatform;
  width: number;
  height: number;
  prototypeBaseUrl: string;
  roleId: string;
  scenarioId: string;
  stateId: string;
  roleLabel: string;
  scenarioLabel: string;
  stateLabel: string;
  feedback: string;
  reqIds: string[];
}>();

const prototypeUrl = computed(() => {
  const params = new URLSearchParams({
    mode: "interactive",
    role: props.roleId,
    scenario: props.scenarioId,
    state: props.stateId,
  });
  return `${props.prototypeBaseUrl}?${params.toString()}`;
});

const frameStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
}));
</script>
