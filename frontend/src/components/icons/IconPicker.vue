<template>
  <div ref="panel" class="icon-picker" role="dialog" :aria-label="t('icons.title')" :style="style">
    <div class="icon-picker__title">{{ t("icons.title") }}</div>
    <p v-if="hint" class="icon-picker__hint" :class="{ 'icon-picker__hint--warn': hint.isWarn }">
      <span class="mdi" :class="hint.isWarn ? 'mdi-alert-outline' : 'mdi-information-outline'" />
      {{ hint.text }}
    </p>
    <input
      ref="search"
      v-model="query"
      class="field-input icon-picker__search"
      :placeholder="t('icons.search')"
      autocomplete="off"
      @keydown.enter.prevent="apply(selected)"
    />
    <div class="icon-picker__packs">
      <button
        v-for="filter in filters"
        :key="filter.pack ?? 'all'"
        type="button"
        class="icon-picker__pack"
        :class="{ 'icon-picker__pack--on': pack === filter.pack }"
        @click="pack = filter.pack"
      >
        {{ filter.label }} <small>{{ filter.count.toLocaleString(locale) }}</small>
      </button>
    </div>

    <div ref="grid" class="icon-picker__grid" data-own-scroll>
      <button
        v-for="icon in shown"
        :key="icon"
        type="button"
        class="icon-picker__cell"
        :class="{ 'icon-picker__cell--on': icon === selected }"
        :title="icon"
        :aria-label="icon"
        :aria-pressed="icon === selected"
        @click="selected = icon"
        @dblclick="apply(icon)"
      >
        <AppIcon :icon="icon" fallback="mdi-help" />
      </button>
      <p v-if="hits.length > ICON_SEARCH_LIMIT" class="icon-picker__more">
        {{ t("icons.more", { count: (hits.length - ICON_SEARCH_LIMIT).toLocaleString(locale) }) }}
      </p>
      <p v-if="hits.length === 0" class="icon-picker__more">{{ t("icons.none") }}</p>
    </div>

    <div class="icon-picker__foot">
      <span class="icon-picker__selected">
        <AppIcon :icon="selected" :fallback="selected ? 'mdi-help' : 'mdi-cancel'" />
        <code>{{ selected || t("icons.standard") }}</code>
      </span>
      <button
        v-if="value"
        type="button"
        class="btn"
        :title="t('icons.removeHint')"
        @click="apply('')"
      >
        {{ t("icons.remove") }}
      </button>
      <button type="button" class="btn" @click="emit('close')">{{ t("icons.cancel") }}</button>
      <button type="button" class="btn btn--primary" :disabled="!selected" @click="apply(selected)">
        {{ t("icons.apply") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, onKeyStroke, useEventListener } from "@vueuse/core";
import { computed, nextTick, onMounted, ref, toRef, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import AppIcon from "@/components/common/AppIcon.vue";
import { useCloseWhenFieldScrolls } from "@/composables/useCloseWhenFieldScrolls";
import { useNoCoverPlacement } from "@/composables/useNoCoverPlacement";
import { usePageScrollLock } from "@/composables/usePageScrollLock";
import { useIconPacksStore } from "@/stores/iconPacksStore";
import { ICON_SEARCH_LIMIT, MDI_PACK, searchIcons } from "@/utils/haIcon";

const props = defineProps<{
  /** The icon field it belongs to: the search opens next to it and never covers it. */
  field: HTMLElement;
  /** The icon the field holds now. */
  value: string;
}>();

const emit = defineEmits<{
  /** The chosen icon; "" goes back to the standard icon. */
  pick: [icon: string];
  close: [];
}>();

const { t, locale } = useI18n();
const packs = useIconPacksStore();
const query = ref("");
const pack = ref<string | null>(null);
const selected = ref(props.value.trim());
const panel = useTemplateRef("panel");
const search = useTemplateRef("search");
const grid = useTemplateRef("grid");
const placement = useNoCoverPlacement(toRef(props, "field"), panel);
const style = placement.style;

/** Every icon as "pack:name", pack icons first (they are the reason to open the search). */
const allIcons = computed(() => [
  ...packs.packs.flatMap((prefix) =>
    (packs.packIcons[prefix] ?? []).map((name) => `${prefix}:${name}`),
  ),
  ...packs.standardIcons().map((name) => `${MDI_PACK}:${name}`),
]);
const countFor = (prefix: string | null): number =>
  searchIcons({ icons: allIcons.value, query: query.value, pack: prefix }).length;
const filters = computed(() => [
  { pack: null, label: t("icons.all"), count: countFor(null) },
  { pack: MDI_PACK, label: t("icons.standardPack"), count: countFor(MDI_PACK) },
  ...packs.packs.map((prefix) => ({ pack: prefix, label: prefix, count: countFor(prefix) })),
]);
const hits = computed(() =>
  searchIcons({ icons: allIcons.value, query: query.value, pack: pack.value }),
);
const shown = computed(() => hits.value.slice(0, ICON_SEARCH_LIMIT));

/** Outside HA there are no packs; in HA, a pack resource that did not load says what helps. */
const hint = computed(() => {
  if (packs.isPackMissing) return { text: t("icons.hintOpenDashboard"), isWarn: true };
  if (!packs.isInHa && packs.packs.length === 0)
    return { text: t("icons.hintOutsideHa"), isWarn: false };
  return null;
});

/** The same icon again changes nothing, so it just closes. */
function apply(icon: string): void {
  if (icon === props.value) emit("close");
  else emit("pick", icon);
}

// A new search starts at the top of the grid
watch([query, pack], () => grid.value?.scrollTo({ top: 0 }));

onMounted(async () => {
  await nextTick();
  placement.place();
  // Without scrolling: the page behind would move, and an open label picker would take that for
  // the user scrolling away
  search.value?.focus({ preventScroll: true });
  await packs.loadPackIcons();
});

// Only the button that opens it is not "outside" (it toggles the search)
onClickOutside(panel, () => emit("close"), { ignore: ["[data-icon-toggle]"] });
// On the panel, and not further: inside the label picker, Escape must not also leave its form
onKeyStroke(
  "Escape",
  (event) => {
    event.stopPropagation();
    emit("close");
  },
  { target: panel },
);
useEventListener(window, "resize", () => emit("close"));
useCloseWhenFieldScrolls({
  field: toRef(props, "field"),
  isOwnScroll: placement.isOwnScroll,
  onClose: () => emit("close"),
});
usePageScrollLock();
</script>

<style scoped>
.icon-picker {
  position: fixed;
  z-index: 130;
  display: flex;
  flex-direction: column;
  width: min(440px, calc(100vw - 24px));
  max-height: min(560px, calc(100vh - 24px));
  padding: 10px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.icon-picker__title {
  padding: 2px 4px 8px;
  color: var(--faint);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.icon-picker__hint {
  display: flex;
  gap: 6px;
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: 9px;
  background: var(--sunken);
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.4;
}

.icon-picker__hint--warn {
  color: var(--warn);
}

.icon-picker__search {
  margin-bottom: 8px;
}

.icon-picker__packs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.icon-picker__pack {
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: none;
  color: var(--muted);
  font: inherit;
  font-size: 12.5px;
  cursor: pointer;
}

.icon-picker__pack--on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--fg);
}

.icon-picker__pack small {
  color: var(--faint);
}

.icon-picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  align-content: start;
  gap: 4px;
  height: 236px;
  min-height: 120px;
  padding: 2px;
  overflow: auto;
  /* At its ends the scroll does not go on to the page behind */
  overscroll-behavior: contain;
}

.icon-picker__cell {
  display: grid;
  place-items: center;
  height: 40px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: none;
  color: var(--fg);
  font-size: 22px;
  cursor: pointer;
}

.icon-picker__cell:hover {
  background: var(--sunken);
}

.icon-picker__cell--on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.icon-picker__more {
  grid-column: 1 / -1;
  margin: 0;
  padding: 10px 6px;
  color: var(--muted);
  font-size: 12.5px;
}

.icon-picker__foot {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
}

.icon-picker__selected {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 20px;
}

.icon-picker__selected code {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
