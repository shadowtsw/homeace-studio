<template>
  <div ref="root" class="quick-menu" role="menu" :style="style" :aria-label="title">
    <div class="quick-menu__title">{{ title }}</div>
    <template v-for="item in items" :key="item.id">
      <div v-if="item.isNote" class="quick-menu__note">
        <span v-if="item.icon" class="mdi" :class="item.icon" />
        <span>{{ item.label }}</span>
      </div>
      <button
        v-else
        type="button"
        role="menuitem"
        class="quick-menu__item"
        :style="{ '--depth': item.depth ?? 0 }"
        @click="emit('pick', item.id)"
      >
        <span v-if="item.icon" class="mdi" :class="item.icon" />
        <span class="quick-menu__text">
          {{ item.label }}
          <small v-if="item.sub">{{ item.sub }}</small>
        </span>
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, onKeyStroke, useEventListener } from "@vueuse/core";
import { onMounted, ref, useTemplateRef } from "vue";

import { usePlainEntityDrag } from "@/composables/usePlainEntityDrag";

/** One line of the menu; a note explains why something is not offered. */
export type QuickMenuItem = {
  id: string;
  label: string;
  sub?: string;
  icon?: string;
  /** Indentation for nested targets (a branch inside "Dann"). */
  depth?: number;
  isNote?: boolean;
};

const props = defineProps<{
  anchor: HTMLElement;
  title: string;
  items: QuickMenuItem[];
}>();

const emit = defineEmits<{ pick: [id: string]; close: [] }>();

/** Width of the menu and its distance to the anchor and the window edges. */
const MENU = { width: 320, gap: 6, margin: 12 };

const root = useTemplateRef("root");
const style = ref<Record<string, string>>({});
const drag = usePlainEntityDrag();

/** Below the anchor, or above when there is more room; always inside the window. */
function place(): void {
  // Room around the anchor
  const box = props.anchor.getBoundingClientRect();
  const height = root.value?.offsetHeight ?? 0;
  const below = window.innerHeight - box.bottom - MENU.gap - MENU.margin;
  const opensUp = height > below && box.top > below;

  // Left edge kept inside the window
  const width = Math.min(MENU.width, window.innerWidth - 2 * MENU.margin);
  const left = Math.min(Math.max(MENU.margin, box.left), window.innerWidth - width - MENU.margin);
  const top = opensUp ? Math.max(MENU.margin, box.top - height - MENU.gap) : box.bottom + MENU.gap;

  style.value = { left: `${left}px`, top: `${top}px`, width: `${width}px` };
}

onMounted(place);
onClickOutside(root, () => emit("close"));
onKeyStroke("Escape", () => emit("close"));
useEventListener(window, "resize", () => emit("close"));
// It sits fixed in the window, so a scroll closes it; not right after a drop, when the page settles
useEventListener(
  document,
  "scroll",
  (event: Event) => {
    if (!root.value?.contains(event.target as Node) && !drag.isSettling()) emit("close");
  },
  { capture: true, passive: true },
);
</script>

<style scoped>
.quick-menu {
  position: fixed;
  z-index: 120;
  display: grid;
  gap: 1px;
  max-height: min(460px, 75vh);
  overflow: auto;
  padding: 6px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.quick-menu__title {
  padding: 6px 8px 8px;
  color: var(--faint);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.quick-menu__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 9px 8px calc(9px + var(--depth) * 18px);
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--fg);
  font: inherit;
  font-size: 13.5px;
  text-align: left;
  cursor: pointer;
}

.quick-menu__item:hover,
.quick-menu__item:focus-visible {
  background: var(--sunken);
}

.quick-menu__item .mdi,
.quick-menu__note .mdi {
  color: var(--muted);
  font-size: 17px;
}

.quick-menu__text small {
  display: block;
  color: var(--muted);
  font-size: 12px;
}

.quick-menu__note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 9px;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.4;
}
</style>
