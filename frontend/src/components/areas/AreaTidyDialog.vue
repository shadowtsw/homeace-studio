<template>
  <DialogFrame :title="t('areas.tidy.title')" is-wide @close="emit('cancel')" @submit="submit">
    <p class="area-tidy__intro">{{ t("areas.tidy.intro") }}</p>

    <div class="area-tidy__scope" role="radiogroup" :aria-label="t('areas.tidy.title')">
      <button
        type="button"
        role="radio"
        :aria-checked="isOnlyUncategorized"
        :class="{ 'area-tidy__scope--active': isOnlyUncategorized }"
        @click="isOnlyUncategorized = true"
      >
        {{ t("areas.tidy.onlyLoose") }}<span>{{ looseCount }}</span>
      </button>
      <button
        type="button"
        role="radio"
        :aria-checked="!isOnlyUncategorized"
        :class="{ 'area-tidy__scope--active': !isOnlyUncategorized }"
        @click="isOnlyUncategorized = false"
      >
        {{ t("areas.tidy.all") }}<span>{{ candidates.length }}</span>
      </button>
    </div>

    <div class="area-tidy__list">
      <p v-if="groups.length === 0" class="area-tidy__nothing">{{ t("areas.tidy.nothing") }}</p>
      <div v-for="group in groups" :key="group.to" class="area-tidy__group">
        <div class="area-tidy__group-head">
          <span class="mdi mdi-folder-outline" />
          {{ group.to }}
          <span v-if="group.isNewFolder" class="area-tidy__new">{{
            t("areas.tidy.newFolder")
          }}</span>
          <small>{{ group.moves.length }}</small>
        </div>
        <label v-for="move in group.moves" :key="move.entry.entityId" class="area-tidy__row">
          <input
            type="checkbox"
            :checked="!skipped.has(move.entry.entityId)"
            :aria-label="t('areas.tidy.toggle', { name: move.entry.name })"
            @change="toggle(move.entry.entityId)"
          />
          <span class="area-tidy__icon" :class="`kind-${move.entry.kind}`">
            <span class="mdi" :class="ENTRY_KIND_ICON[move.entry.kind]" />
          </span>
          <span class="area-tidy__main">
            <span>{{ move.entry.name }}</span>
            <small>{{ rowNote(move) }}</small>
          </span>
          <select
            v-if="move.areas.length > 1"
            class="field-input area-tidy__pick"
            :value="move.area.areaId"
            :title="t('areas.tidy.pickArea')"
            :aria-label="t('areas.tidy.pickArea')"
            @change="pick(move.entry.entityId, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="area in move.areas" :key="area.areaId" :value="area.areaId">
              {{ area.name }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <p class="area-tidy__summary">{{ summary }}</p>

    <template #buttons>
      <button class="btn" type="button" :disabled="isBusy" @click="emit('cancel')">
        {{ t("common.cancel") }}
      </button>
      <button class="btn btn--primary" type="submit" :disabled="isBusy || chosen.length === 0">
        {{ isBusy ? t("areas.tidy.running") : t("areas.tidy.apply") }}
      </button>
    </template>
  </DialogFrame>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import DialogFrame from "@/components/common/DialogFrame.vue";
import { ENTRY_KIND_ICON } from "@/constants/entries";
import type { EntryAreaLink } from "@/services/entryAreasService";
import type { Entry } from "@/types/entry";
import { planAreaTidy, tidyCandidates, type TidyMove } from "@/utils/areas/areaTidy";

/** "Ordnung in einem Klick": sorts entries into the folders of their areas, after a preview. */
const props = defineProps<{
  entries: readonly Entry[];
  linksOf: (entityId: string) => readonly EntryAreaLink[];
  folderPaths: readonly string[];
  isBusy: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  /** The ticked moves, grouped by folder in display order. */
  confirm: [moves: TidyMove[]];
}>();

const { t } = useI18n();

const isOnlyUncategorized = ref(true);
const picks = ref<Record<string, string>>({});
/** Rows the user unticked. */
const skipped = ref(new Set<string>());

const candidates = computed(() => tidyCandidates(props));
const looseCount = computed(
  () => candidates.value.filter((entry) => entry.categoryPath === null).length,
);
const plan = computed(() =>
  planAreaTidy({
    entries: props.entries,
    linksOf: props.linksOf,
    folderPaths: props.folderPaths,
    isOnlyUncategorized: isOnlyUncategorized.value,
    picks: picks.value,
  }),
);
const groups = computed(() => {
  const byFolder = new Map<string, TidyMove[]>();

  for (const move of plan.value) byFolder.set(move.to, [...(byFolder.get(move.to) ?? []), move]);

  return [...byFolder]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map(([to, moves]) => ({ to, moves, isNewFolder: moves[0]?.isNewFolder ?? false }));
});
const chosen = computed(() =>
  groups.value
    .flatMap((group) => group.moves)
    .filter((move) => !skipped.value.has(move.entry.entityId)),
);

const summary = computed(() => {
  if (chosen.value.length === 0) return t("areas.tidy.noneSelected");

  const folders = new Set(chosen.value.map((move) => move.to));
  const fresh = new Set(chosen.value.filter((move) => move.isNewFolder).map((move) => move.to));

  const freshText =
    fresh.size === 0
      ? ""
      : t(
          fresh.size === folders.size ? "areas.tidy.freshAll" : "areas.tidy.fresh",
          { count: fresh.size },
          fresh.size,
        );
  const count = chosen.value.length;

  return t(
    "areas.tidy.summary",
    {
      count,
      folders: t("areas.tidy.folders", { count: folders.size }, folders.size),
      fresh: freshText,
    },
    count,
  );
});

/** "jetzt in Licht · über Bewegungsmelder Terrasse". */
function rowNote(move: TidyMove): string {
  const where = move.entry.categoryPath
    ? t("areas.tidy.now", { path: move.entry.categoryPath })
    : t("areas.tidy.loose");
  const via =
    move.area.via && move.area.source !== "own"
      ? t(`areas.via.${move.area.source}`, { name: move.area.via.name })
      : "";

  return [where, via].filter(Boolean).join(" · ");
}

function toggle(entityId: string): void {
  const next = new Set(skipped.value);
  if (next.has(entityId)) next.delete(entityId);
  else next.add(entityId);
  skipped.value = next;
}

function pick(entityId: string, areaId: string): void {
  picks.value = { ...picks.value, [entityId]: areaId };
}

function submit(): void {
  if (chosen.value.length > 0 && !props.isBusy) emit("confirm", chosen.value);
}
</script>

<style scoped>
.area-tidy__intro {
  margin: 0 0 12px;
  color: var(--muted);
}

.area-tidy__scope {
  display: inline-flex;
  gap: 2px;
  margin-bottom: 12px;
  padding: 3px;
  border-radius: 10px;
  background: var(--sunken);
}

.area-tidy__scope button {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--muted);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}

.area-tidy__scope span {
  color: var(--faint);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.area-tidy__scope .area-tidy__scope--active {
  background: var(--surface);
  color: var(--fg);
  box-shadow: 0 1px 2px rgb(0 0 0 / 12%);
}

.area-tidy__list {
  overflow: auto;
  min-height: 0;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.area-tidy__nothing {
  margin: 0;
  padding: 14px;
  color: var(--muted);
}

.area-tidy__group + .area-tidy__group {
  border-top: 1px solid var(--line);
}

.area-tidy__group-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px 4px;
  font-weight: 700;
}

.area-tidy__group-head .mdi {
  color: var(--faint);
  font-size: 17px;
}

.area-tidy__group-head small {
  margin-left: auto;
  color: var(--faint);
  font-weight: 500;
}

.area-tidy__new {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
}

.area-tidy__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  cursor: pointer;
}

.area-tidy__row:hover {
  background: var(--sunken);
}

.area-tidy__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  font-size: 16px;
}

.area-tidy__main {
  display: grid;
  flex: 1;
  min-width: 0;
}

.area-tidy__main small {
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.area-tidy__pick {
  width: auto;
  max-width: 40%;
  height: 30px;
  padding: 0 8px;
}

.area-tidy__summary {
  margin: 10px 2px 0;
  color: var(--muted);
}
</style>
