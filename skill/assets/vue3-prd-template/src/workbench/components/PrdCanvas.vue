<template>
  <section class="board-view" aria-label="PRD 标注看板">
    <div class="active-file-strip">
      <div class="active-file-info">
        <p>当前文件</p>
        <EllipsisTooltipText :text="fileTitle" class-name="active-file-title" />
        <EllipsisTooltipText :text="section?.description || ''" :rows="2" class-name="active-file-description" />
      </div>
      <div class="req-list">
        <RequirementTag
          v-for="reqId in section?.reqIds || []"
          :key="reqId"
          :req-id="reqId"
          :requirements="requirements"
        />
      </div>
    </div>

    <div class="canvas-toolbar">
      <a-space>
        <a-button :type="annotationMode ? 'primary' : 'default'" :disabled="!canAddAnnotation" @click="toggleAnnotationMode">
          <PushpinOutlined /> 添加标注
        </a-button>
        <a-button :type="panMode ? 'primary' : 'default'" @click="togglePanMode">
          <DragOutlined /> 拖动画布
        </a-button>
      </a-space>
      <a-space class="zoom-controls">
        <a-tooltip title="缩小画布">
          <a-button aria-label="缩小画布" @click="zoomOut"><MinusOutlined /></a-button>
        </a-tooltip>
        <span>{{ zoomPercent }}</span>
        <a-tooltip title="放大画布">
          <a-button aria-label="放大画布" @click="zoomIn"><PlusOutlined /></a-button>
        </a-tooltip>
        <a-button @click="resetCanvas">重置</a-button>
      </a-space>
    </div>

    <div
      ref="viewportRef"
      class="canvas-viewport"
      :class="{ 'annotation-mode': annotationMode, 'pan-mode': panMode, dragging: dragStart !== null }"
      @mousedown="startPan"
      @mousemove="movePan"
      @mouseup="endPan"
      @mouseleave="endPan"
      @wheel.prevent="handleWheel"
    >
      <div class="canvas-stage" :style="stageStyle">
        <article v-if="section" class="board-section" :data-req-ids="section.reqIds.join(' ')" >
          <header class="section-heading">
            <div>
              <p>{{ sectionTypeLabel }}</p>
              <h2>{{ section.title }}</h2>
              <span>{{ section.description }}</span>
            </div>
          </header>

          <div v-if="isDiagram" class="diagram-layout">
            <div
              v-if="section.frames[0]"
              class="diagram-surface annotation-surface"
              :data-frame-id="section.frames[0].id"
              @click="handleSurfaceClick($event, section.frames[0])"
            >
              <div v-if="diagramError" class="diagram-error">{{ diagramError }}</div>
              <div v-else class="mermaid-host" v-html="diagramSvg"></div>
              <button
                v-for="annotation in annotationsForFrame(section.frames[0].id)"
                :key="annotation.id"
                type="button"
                class="annotation-pin"
                :class="annotationClass(annotation.id)"
                :style="pinStyle(annotation)"
                :data-annotation-id="annotation.id"
                @click.stop="emit('selectAnnotation', annotation.id)"
              >{{ annotation.index }}</button>
            </div>
            <CalloutList
              :annotations="section.frames[0] ? annotationsForFrame(section.frames[0].id) : []"
              :selected-id="selectedAnnotationId"
              @select="emit('selectAnnotation', $event)"
            />
          </div>

          <div v-else class="snapshot-stack">
            <div v-for="frame in section.frames" :key="frame.id" class="snapshot-layout">
              <div
                class="prototype-shot annotation-surface"
                :style="shotStyle"
                :data-frame-id="frame.id"
                @click="handleSurfaceClick($event, frame)"
              >
                <iframe
                  :title="frame.title"
                  :src="snapshotUrl(frame)"
                  :style="iframeStyle"
                  tabindex="-1"
                />
                <button
                  v-for="annotation in annotationsForFrame(frame.id)"
                  :key="annotation.id"
                  type="button"
                  class="annotation-pin"
                  :class="annotationClass(annotation.id)"
                  :style="pinStyle(annotation)"
                  :data-annotation-id="annotation.id"
                  @click.stop="emit('selectAnnotation', annotation.id)"
                >{{ annotation.index }}</button>
              </div>

              <div class="snapshot-details">
                <div class="snapshot-meta">
                  <EllipsisTooltipText :text="frame.title" class-name="snapshot-title" />
                  <EllipsisTooltipText :text="frame.subtitle" :rows="2" class-name="snapshot-subtitle" />
                  <div><a-tag v-for="chip in frame.chips" :key="chip">{{ chip }}</a-tag></div>
                </div>
                <CalloutList
                  :annotations="annotationsForFrame(frame.id)"
                  :selected-id="selectedAnnotationId"
                  @select="emit('selectAnnotation', $event)"
                />
                <ul><li v-for="bullet in frame.bullets" :key="bullet">{{ bullet }}</li></ul>
              </div>
            </div>
          </div>

          <footer class="note-strip"><span v-for="note in section.notes" :key="note">{{ note }}</span></footer>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { DragOutlined, MinusOutlined, PlusOutlined, PushpinOutlined } from "@ant-design/icons-vue";
import mermaid from "mermaid";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import type { BoardAnnotation, BoardFrame, BoardSection, Requirement, TargetPlatform } from "../../types";
import type { LocatedAnnotation } from "../types";
import CalloutList from "./internal/CalloutList.vue";
import EllipsisTooltipText from "./internal/EllipsisTooltipText.vue";
import RequirementTag from "./internal/RequirementTag.vue";

const props = defineProps<{
  fileTitle: string;
  section?: BoardSection;
  annotations: LocatedAnnotation[];
  selectedAnnotationId: string;
  canAddAnnotation: boolean;
  platform: TargetPlatform;
  viewportWidth: number;
  viewportHeight: number;
  prototypeBaseUrl: string;
  roleId: string;
  scenarioId: string;
  stateId: string;
  requirements: Requirement[];
}>();

const emit = defineEmits<{
  selectAnnotation: [id: string];
  addAnnotation: [payload: { frameId: string; reqId: string; x: number; y: number }];
}>();

const viewportRef = ref<HTMLElement>();
const annotationMode = ref(false);
const panMode = ref(true);
const zoom = ref(1);
const pan = ref({ x: 0, y: 0 });
const dragStart = ref<{ clientX: number; clientY: number; x: number; y: number } | null>(null);
const diagramSvg = ref("");
const diagramError = ref("");
const locatedId = ref("");
let locateTimer: number | undefined;

const isDiagram = computed(() => props.section?.type === "flowchart" || props.section?.type === "mindmap");
const sectionTypeLabel = computed(() => {
  if (props.section?.type === "flowchart") return "功能流程图";
  if (props.section?.type === "mindmap") return "功能思维导图";
  return "高保真操作快照";
});
const zoomPercent = computed(() => `${Math.round(zoom.value * 100)}%`);
const stageStyle = computed(() => ({ transform: `translate(${pan.value.x}px, ${pan.value.y}px) scale(${zoom.value})` }));
const displayWidth = computed(() => props.platform === "mobile" ? Math.min(props.viewportWidth, 430) : Math.min(props.viewportWidth, 960));
const displayScale = computed(() => displayWidth.value / props.viewportWidth);
const displayHeight = computed(() => Math.round(props.viewportHeight * displayScale.value));
const shotStyle = computed(() => ({ width: `${displayWidth.value}px`, height: `${displayHeight.value}px` }));
const iframeStyle = computed(() => ({
  width: `${props.viewportWidth}px`,
  height: `${props.viewportHeight}px`,
  transform: `scale(${displayScale.value})`,
  transformOrigin: "top left",
}));

mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });

function annotationsForFrame(frameId: string) {
  return props.annotations.filter((annotation) => annotation.frameId === frameId);
}

function pinStyle(annotation: BoardAnnotation) {
  return { left: `${annotation.x}%`, top: `${annotation.y}%` };
}

function annotationClass(id: string) {
  return { active: id === props.selectedAnnotationId, located: id === locatedId.value };
}

function snapshotUrl(frame: BoardFrame) {
  const params = new URLSearchParams({
    mode: "snapshot",
    frameId: frame.id,
    role: props.roleId,
    scenario: props.scenarioId,
    state: frame.snapshot?.stateId || props.stateId,
  });
  return `${props.prototypeBaseUrl}?${params.toString()}`;
}

function toggleAnnotationMode() {
  if (!props.canAddAnnotation) return;
  annotationMode.value = !annotationMode.value;
  panMode.value = !annotationMode.value;
}

function togglePanMode() {
  panMode.value = true;
  annotationMode.value = false;
}

function handleSurfaceClick(event: MouseEvent, frame: BoardFrame) {
  if (!annotationMode.value || !props.canAddAnnotation) return;
  const surface = event.currentTarget as HTMLElement;
  const rect = surface.getBoundingClientRect();
  emit("addAnnotation", {
    frameId: frame.id,
    reqId: frame.reqIds[0] || props.section?.reqIds[0] || "REQ-001",
    x: clamp(((event.clientX - rect.left) / rect.width) * 100, 2, 98),
    y: clamp(((event.clientY - rect.top) / rect.height) * 100, 2, 98),
  });
  annotationMode.value = false;
  panMode.value = true;
}

function zoomIn() { zoom.value = clamp(zoom.value + 0.1, 0.5, 2); }
function zoomOut() { zoom.value = clamp(zoom.value - 0.1, 0.5, 2); }
function resetCanvas() { zoom.value = 1; pan.value = { x: 0, y: 0 }; }
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }

function startPan(event: MouseEvent) {
  if (!panMode.value || event.button !== 0) return;
  dragStart.value = { clientX: event.clientX, clientY: event.clientY, x: pan.value.x, y: pan.value.y };
}

function movePan(event: MouseEvent) {
  if (!dragStart.value) return;
  pan.value = {
    x: dragStart.value.x + event.clientX - dragStart.value.clientX,
    y: dragStart.value.y + event.clientY - dragStart.value.clientY,
  };
}

function endPan() { dragStart.value = null; }

function handleWheel(event: WheelEvent) {
  zoom.value = clamp(zoom.value + (event.deltaY > 0 ? -0.08 : 0.08), 0.5, 2);
}

async function renderDiagram() {
  diagramSvg.value = "";
  diagramError.value = "";
  const code = props.section?.frames[0]?.diagram?.code;
  if (!code) return;
  try {
    const result = await mermaid.render(`prd-diagram-${Date.now()}`, code);
    diagramSvg.value = result.svg;
  } catch (error) {
    diagramError.value = error instanceof Error ? error.message : "流程图渲染失败";
  }
}

async function locateAnnotation(id: string) {
  await nextTick();
  const viewport = viewportRef.value;
  const target = viewport?.querySelector<HTMLElement>(`[data-annotation-id="${id}"]`);
  if (!viewport || !target) return;
  const viewportRect = viewport.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  pan.value = {
    x: pan.value.x + viewportRect.left + viewportRect.width * 0.48 - (targetRect.left + targetRect.width / 2),
    y: pan.value.y + viewportRect.top + viewportRect.height * 0.46 - (targetRect.top + targetRect.height / 2),
  };
  locatedId.value = id;
  if (locateTimer) window.clearTimeout(locateTimer);
  locateTimer = window.setTimeout(() => { locatedId.value = ""; }, 1400);
}

defineExpose({ locateAnnotation, resetCanvas });
watch(() => props.section?.id, () => { resetCanvas(); void renderDiagram(); });
watch(() => props.canAddAnnotation, (canAddAnnotation) => {
  if (canAddAnnotation) return;
  annotationMode.value = false;
  panMode.value = true;
  dragStart.value = null;
});
onMounted(() => { void renderDiagram(); });
</script>
