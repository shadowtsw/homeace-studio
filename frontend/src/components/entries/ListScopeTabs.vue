<template>
  <div
    ref="root"
    class="list-scope-tabs"
    :class="{ 'list-scope-tabs--narrowed': isListNarrowed(scopes) }"
    role="group"
    :aria-label="t('scopeMenu.label')"
  >
    <button
      v-for="option in LIST_SCOPES"
      :key="option"
      type="button"
      :aria-pressed="scopes.includes(option)"
      :class="{ 'entry-list__scope--active': scopes.includes(option) }"
      :title="t('scopeMenu.hint', { name: t(`scope.${option}`), key: modifierKey })"
      @click="(event: MouseEvent) => onClick(event, option)"
      @contextmenu.prevent="(event: MouseEvent) => openMenu(event, option)"
      @pointerdown="(event: PointerEvent) => startLongPress(event, option)"
    >
      <span v-if="option === SCOPE_ENTITIES" class="mdi mdi-devices" />
      {{ t(`scope.${option}`) }}<span class="list-scope-tabs__count">{{ counts[option] }}</span>
    </button>

    <div v-if="menu" class="list-scope-tabs__menu" role="menu" :style="menu.style">
      <button type="button" role="menuitem" @click="choose('select', menu.scope)">
        <span class="mdi mdi-filter-outline" />
        {{ t("scopeMenu.only", { name: t(`scope.${menu.scope}`) }) }}
      </button>
      <button type="button" role="menuitem" @click="choose('toggle', menu.scope)">
        <span
          class="mdi"
          :class="
            scopes.includes(menu.scope) ? 'mdi-minus-circle-outline' : 'mdi-plus-circle-outline'
          "
        />
        <span>
          {{
            scopes.includes(menu.scope)
              ? t("scopeMenu.remove", { name: t(`scope.${menu.scope}`) })
              : t("scopeMenu.add", { name: t(`scope.${menu.scope}`) })
          }}
          <small v-if="hasKeyboard">{{ t("scopeMenu.faster", { key: modifierKey }) }}</small>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, useEventListener } from "@vueuse/core";
import { ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import { useModifierKey } from "@/composables/useModifierKey";
import { LIST_SCOPES, SCOPE_ENTITIES, type ListScope } from "@/constants/entries";
import { isListNarrowed } from "@/utils/entries/emptyList";

defineProps<{
  scopes: readonly ListScope[];
  counts: Record<ListScope, number>;
}>();

const emit = defineEmits<{
  /** A plain click: only this filter. */
  select: [scope: ListScope];
  /** Strg/⌘+Klick, right-click or long press menu: add or remove it. */
  toggle: [scope: ListScope];
}>();

/** Long enough to tell a long press from a tap. */
const LONG_PRESS_MS = 500;
const { t } = useI18n();
/** On a Mac, Ctrl+click is the right-click; there the Command key adds a filter. */
const modifierKey = useModifierKey();
const hasKeyboard = matchMedia("(hover: hover)").matches;

const root = useTemplateRef("root");
const menu = ref<{ scope: ListScope; style: Record<string, string> } | null>(null);
let pressTimer: ReturnType<typeof setTimeout> | undefined;
/** The click after a long press only lifts the finger; it must not choose the filter as well. */
let isPressHandled = false;

function onClick(event: MouseEvent, scope: ListScope): void {
  if (isPressHandled) {
    isPressHandled = false;
    return;
  }

  if (event.ctrlKey || event.metaKey) emit("toggle", scope);
  else emit("select", scope);
}

function openMenu(event: MouseEvent | PointerEvent, scope: ListScope): void {
  // On touch the long press opened it already; the context menu event follows on some phones
  if (menu.value?.scope === scope && isPressHandled) return;

  const button = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const box = root.value?.getBoundingClientRect();
  const left = box ? button.left - box.left : 0;
  const top = box ? button.bottom - box.top + 4 : 0;
  menu.value = { scope, style: { left: `${Math.max(0, left)}px`, top: `${top}px` } };
}

function startLongPress(event: PointerEvent, scope: ListScope): void {
  if (event.pointerType === "mouse") return;

  isPressHandled = false;
  clearTimeout(pressTimer);
  const target = event.currentTarget as HTMLElement;
  pressTimer = setTimeout(() => {
    isPressHandled = true;
    openMenu({ currentTarget: target } as unknown as PointerEvent, scope);
  }, LONG_PRESS_MS);
}

/** The scope is passed in: the menu closes first, and with it `menu`. */
function choose(action: "select" | "toggle", scope: ListScope): void {
  menu.value = null;
  if (action === "select") emit("select", scope);
  else emit("toggle", scope);
}

// A finger that lifts or moves away is no long press
for (const name of ["pointerup", "pointercancel", "scroll"]) {
  useEventListener(document, name, () => clearTimeout(pressTimer), {
    capture: true,
    passive: true,
  });
}
onClickOutside(root, () => (menu.value = null));
</script>

<style scoped>
/* Wraps instead of scrolling, so no filter (like "Entitäten") hides at the right edge. */
.list-scope-tabs {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 3px;
  border-radius: 9px;
  background: var(--sunken);
}

.list-scope-tabs > button {
  display: inline-flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 5px 8px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  -webkit-touch-callout: none;
}

.list-scope-tabs__count {
  color: var(--faint);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.list-scope-tabs > .entry-list__scope--active {
  background: var(--surface);
  color: var(--fg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

/* A filter other than "Alle" hides entries: a fine accent border, so an empty list is no surprise. */
.list-scope-tabs--narrowed > .entry-list__scope--active {
  color: var(--accent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent),
    0 1px 2px rgba(0, 0, 0, 0.08);
}

.list-scope-tabs--narrowed > .entry-list__scope--active .list-scope-tabs__count {
  color: color-mix(in srgb, var(--accent) 70%, var(--faint));
}

.list-scope-tabs__menu {
  position: absolute;
  z-index: 40;
  display: grid;
  gap: 1px;
  min-width: 220px;
  padding: 6px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.list-scope-tabs__menu button {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 9px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--fg);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.list-scope-tabs__menu button:hover {
  background: var(--sunken);
}

.list-scope-tabs__menu .mdi {
  color: var(--muted);
  font-size: 16px;
}

.list-scope-tabs__menu small {
  display: block;
  color: var(--muted);
  font-size: 11.5px;
}
</style>
