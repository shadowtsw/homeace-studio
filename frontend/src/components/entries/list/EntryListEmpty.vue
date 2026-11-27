<template>
  <div class="entry-list-empty">
    <template v-if="reason.kind === 'filtered'">
      <p class="entry-list-empty__first">{{ firstLine }}</p>
      <p>{{ hiddenLine }}</p>
      <button type="button" class="btn btn--small entry-list-empty__show" @click="showHidden">
        <template v-if="reason.hides === 'entries'">
          <span class="mdi mdi-filter-off-outline" />{{ t("list.filtered.showAll") }}
        </template>
        <template v-else>
          <span class="mdi mdi-devices" />{{ t("list.filtered.showEntities") }}
        </template>
      </button>
    </template>
    <p v-else>{{ reason.kind === "emptyFolder" ? t("list.emptyFolder") : t("list.empty") }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { LIST_SCOPES, SCOPE_ALL, SCOPE_ENTITIES, type ListScope } from "@/constants/entries";
import { emptyListReason } from "@/utils/entries/emptyList";
import { formatNumber } from "@/utils/formatNumber";

/**
 * What an empty list says: what the filters hide here (with a way back), that the folder is still
 * empty, or that there is nothing.
 */
const props = defineProps<{
  scopes: readonly ListScope[];
  /** What each filter would show here (folder and search), as on the filter tabs. */
  counts: Record<ListScope, number>;
  /** The open folder or area as the list title names it; null for "Alle Einträge". */
  place: string | null;
  search: string;
  isRealCategory: boolean;
}>();

const emit = defineEmits<{
  selectScope: [scope: ListScope];
  toggleScope: [scope: ListScope];
}>();

const { t, locale } = useI18n();

const isSearching = computed(() => props.search.trim() !== "");
const reason = computed(() =>
  emptyListReason({
    scopes: props.scopes,
    counts: props.counts,
    isRealCategory: props.isRealCategory,
    isSearching: isSearching.value,
  }),
);
/** The chosen filters in the order of the filter bar. */
const chosen = computed(() => LIST_SCOPES.filter((scope) => props.scopes.includes(scope)));

/** "Keine Szenen in „Arbeitszimmer“." or "Nichts gefunden für „xyz“." */
const firstLine = computed(() => {
  if (isSearching.value) return t("list.filtered.noHits", { search: props.search.trim() });

  // "Szenen oder Skripte" in the UI language
  const kinds = new Intl.ListFormat(locale.value, { type: "disjunction" }).format(
    chosen.value.map((scope) => t(`list.filtered.kinds.${scope}`)),
  );

  return props.place === null
    ? t("list.filtered.none", { kinds })
    : t("list.filtered.noneIn", { kinds, place: props.place });
});

/** "Der Filter „Szenen“ blendet 35 andere Einträge aus." */
const hiddenLine = computed(() => {
  if (reason.value.kind !== "filtered") return "";

  const { hides, count } = reason.value;
  const key = hides === "entries" ? "list.filtered.otherEntries" : "list.filtered.entities";
  const hidden = t(key, { count: formatNumber({ value: count, locale: locale.value }) }, count);
  const names = chosen.value.map((scope) => t(`scope.${scope}`)).join(", ");

  return t("list.filtered.hides", { names, hidden }, chosen.value.length);
});

/** Back to every entry ("Alle"); when only entities are hidden, their filter is added. */
function showHidden(): void {
  if (reason.value.kind === "filtered" && reason.value.hides === "entries") {
    emit("selectScope", SCOPE_ALL);
  } else {
    emit("toggleScope", SCOPE_ENTITIES);
  }
}
</script>

<style scoped>
.entry-list-empty {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 40px 20px;
  color: var(--muted);
  text-align: center;
}

.entry-list-empty p {
  max-width: 46ch;
  margin: 0;
}

.entry-list-empty__first {
  color: var(--fg);
  font-weight: 600;
}

.entry-list-empty__show {
  margin-top: 8px;
}

.entry-list-empty__show .mdi {
  margin-right: 6px;
}
</style>
