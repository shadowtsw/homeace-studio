<template>
  <div ref="menuRoot" class="scene-row__menu">
    <button
      type="button"
      class="icon-btn"
      :aria-label="t('scene.more')"
      :aria-expanded="isMenuOpen"
      @click="isMenuOpen = !isMenuOpen"
    >
      <span class="mdi mdi-dots-vertical" />
    </button>
    <div v-if="isMenuOpen" class="scene-row__popup" role="menu">
      <button type="button" role="menuitem" :disabled="!canTakeCurrent" @click="pick('take')">
        <span class="mdi mdi-download-outline" />
        <span>
          {{ t("scene.takeCurrent") }}<small>{{ t("scene.takeCurrentHint") }}</small>
        </span>
      </button>
      <button type="button" role="menuitem" class="is-danger" @click="pick('remove')">
        <span class="mdi mdi-delete-outline" />
        <span>{{ t("scene.remove") }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import { ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

/** The ⋮ menu of a scene device: take its current state, or remove it from the scene. */
defineProps<{
  /** False while HA has no current state of the device. */
  canTakeCurrent: boolean;
}>();

const emit = defineEmits<{
  takeCurrent: [];
  remove: [];
}>();

const { t } = useI18n();
const isMenuOpen = ref(false);
const menuRoot = useTemplateRef("menuRoot");
onClickOutside(menuRoot, () => (isMenuOpen.value = false));

function pick(action: "take" | "remove"): void {
  isMenuOpen.value = false;
  if (action === "take") emit("takeCurrent");
  else emit("remove");
}
</script>

<style scoped>
.scene-row__menu {
  position: relative;
}

.scene-row__popup {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 20;
  display: grid;
  min-width: 250px;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.scene-row__popup button {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--fg);
  font: 500 13px var(--font-body);
  text-align: left;
  cursor: pointer;
}

.scene-row__popup button:hover:not(:disabled) {
  background: var(--sunken);
}

.scene-row__popup button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.scene-row__popup small {
  display: block;
  color: var(--muted);
  font-size: 11.5px;
}

.scene-row__popup .is-danger {
  color: var(--err);
}
</style>
