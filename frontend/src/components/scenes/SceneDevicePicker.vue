<template>
  <div ref="root" class="scene-device-picker">
    <button ref="button" class="btn" type="button" @click="toggle">
      <span class="mdi mdi-plus" /> {{ t("scene.add") }}
    </button>
    <div v-if="isOpen" ref="panel" class="scene-device-picker__panel" :style="panelStyle">
      <div class="scene-device-picker__head">
        <span class="scene-device-picker__title">{{ t("scene.add") }}</span>
        <PopoverClose @close="isOpen = false" />
      </div>
      <!-- Suggestions come from the scene's area; devices already in it keep their tick. -->
      <EntityPicker
        :entities="lookups.entities"
        :selected="selected"
        :domains="SCENE_DOMAINS"
        :used-ids="[]"
        :area-id="areaId"
        :can-pick-area="false"
        :is-technical-details-visible="isTechnicalDetailsVisible"
        @pick="pick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, useEventListener } from "@vueuse/core";
import { ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import PopoverClose from "@/components/common/PopoverClose.vue";
import EntityPicker from "@/components/flow/EntityPicker.vue";
import { useLookupsStore } from "@/stores/lookupsStore";

defineProps<{
  /** The devices already in the scene. */
  selected: string[];
  /** The scene's area, for the suggestions. */
  areaId: string | null;
  isTechnicalDetailsVisible: boolean;
}>();

const emit = defineEmits<{ pick: [deviceId: string] }>();

/** Device kinds a scene editor offers to add; others can be in a scene and stay as they are. */
const SCENE_DOMAINS = ["light", "switch", "cover", "climate", "fan", "media_player"];
/** Size of the picker and its distance to the button and the window edges. */
const PANEL = { width: 460, height: 460, gap: 6, margin: 12 };

const { t } = useI18n();
const lookups = useLookupsStore();

const isOpen = ref(false);
const panelStyle = ref<Record<string, string>>({});
const root = useTemplateRef("root");
const button = useTemplateRef("button");
const panel = useTemplateRef("panel");

onClickOutside(root, () => (isOpen.value = false));

/**
 * Places the picker next to its button within the window: below when it fits there, otherwise on the
 * side with more room, never taller than that room. Its height stays the same while it is open.
 */
function place(): void {
  // Room below and above the button
  const box = button.value?.getBoundingClientRect();
  if (!box) return;

  const below = window.innerHeight - box.bottom - PANEL.gap - PANEL.margin;
  const above = box.top - PANEL.gap - PANEL.margin;
  const opensUp = below < PANEL.height && above > below;

  // Width and left edge, kept inside the window
  const width = Math.min(PANEL.width, window.innerWidth - 2 * PANEL.margin);
  const rightmostLeft = window.innerWidth - width - PANEL.margin;
  const left = Math.min(Math.max(PANEL.margin, box.left), rightmostLeft);

  panelStyle.value = {
    left: `${left}px`,
    width: `${width}px`,
    height: `${Math.min(PANEL.height, opensUp ? above : below)}px`,
    ...(opensUp
      ? { bottom: `${window.innerHeight - box.top + PANEL.gap}px` }
      : { top: `${box.bottom + PANEL.gap}px` }),
  };
}

async function toggle(): Promise<void> {
  isOpen.value = !isOpen.value;
  if (!isOpen.value) return;

  place();
  await lookups.loadEntities();
}

function pick(deviceId: string): void {
  isOpen.value = false;
  emit("pick", deviceId);
}

// The picker stays at its place in the window, so it closes when the details scroll or the window
// changes size (scrolling inside the picker itself is fine).
useEventListener(
  document,
  "scroll",
  (event: Event) => {
    const isInsidePanel = panel.value?.contains(event.target as Node) ?? false;
    if (isOpen.value && !isInsidePanel) isOpen.value = false;
  },
  { capture: true, passive: true },
);
useEventListener(window, "resize", () => (isOpen.value = false));
</script>

<style scoped>
.scene-device-picker {
  position: relative;
}

/* Fixed in the window; place() sets where and how big. */
.scene-device-picker__panel {
  position: fixed;
  z-index: 50;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.scene-device-picker__head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 2px 2px 6px;
}

.scene-device-picker__title {
  color: var(--faint);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
</style>
