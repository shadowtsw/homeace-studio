<template>
  <p v-if="!entry.isInRegistry" class="entry-properties__hint">
    <span class="mdi mdi-information-outline" /> {{ t("detail.notInRegistry") }}
  </p>

  <template v-else>
    <CategoryMoveField
      class="entry-properties__section"
      :current-path="entry.categoryPath"
      :all-paths="allCategoryPaths"
      :is-disabled="isBusy"
      @move="(path) => emit('move', path)"
    />

    <section class="entry-properties__section">
      <h3>{{ t("detail.identity") }}</h3>
      <EntryEditForm
        :entry="entry"
        :areas="areas"
        :labels="labels"
        :fallback-icon="ENTRY_KIND_ICON[entry.kind]"
        :is-busy="isBusy"
        @save="(changes) => emit('save', changes)"
      />
      <div class="entry-properties__card entry-properties__entity-id">
        <EntityIdField
          :entry="entry"
          :is-busy="isBusy"
          @rename="(preset) => emit('renameId', preset)"
        />
      </div>
    </section>

    <section class="entry-properties__section">
      <h3>{{ t("visibility.title") }}</h3>
      <div class="entry-properties__card">
        <EntryVisibilityForm
          :entry="entry"
          :is-busy="isBusy"
          @save="(changes) => emit('save', changes)"
          @ask-disable="emit('askDisable')"
        />
      </div>
    </section>
  </template>

  <section class="entry-properties__section">
    <h3>{{ t("detail.own") }}</h3>
    <div class="entry-properties__card entry-properties__card--padded">
      <NoteField :note="entry.note" @save="(note) => emit('saveNote', note)" />
    </div>
  </section>

  <section class="entry-properties__section">
    <h3>{{ t("detail.status") }}</h3>
    <dl class="entry-properties__card">
      <div v-for="row in statusRows" :key="row.label" class="entry-properties__row">
        <dt>{{ row.label }}</dt>
        <dd :class="{ mono: row.isMono }">{{ row.value }}</dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { ENTRY_KIND_ICON } from "@/constants/entries";
import type { Area, Entry, EntryChanges, Label } from "@/types/entry";

import CategoryMoveField from "./CategoryMoveField.vue";
import EntityIdField from "./EntityIdField.vue";
import EntryEditForm from "./EntryEditForm.vue";
import EntryVisibilityForm from "./EntryVisibilityForm.vue";
import NoteField from "./NoteField.vue";

type DetailRow = { label: string; value: string; isMono?: boolean };

/** The properties tab of an entry: folder, identity, visibility, own note and status. */
const props = defineProps<{
  entry: Entry;
  /** All folder paths, as suggestions for moving. */
  allCategoryPaths: string[];
  areas: Area[];
  labels: Label[];
  /** A request is running; the controls are locked meanwhile. */
  isBusy: boolean;
  isTechnicalDetailsVisible: boolean;
}>();

const emit = defineEmits<{
  move: [path: string | null];
  save: [changes: EntryChanges];
  saveNote: [note: string];
  /** "Deaktivieren?" asks first, because flows may still use the entry. */
  askDisable: [];
  /** "Entity-ID ändern"; `preset` is a suggested ID or null. */
  renameId: [preset: string | null];
}>();

const { t } = useI18n();

const yesNo = (value: boolean): string => (value ? t("detail.yes") : t("detail.no"));
const orNone = (value: string | null): string => value || t("detail.none");

const statusRows = computed((): DetailRow[] => {
  const entry = props.entry;
  const rows: DetailRow[] = [
    { label: t("detail.state"), value: orNone(entry.state) },
    { label: t("detail.enabled"), value: yesNo(!entry.isDisabled) },
    { label: t("detail.hidden"), value: yesNo(entry.isHidden) },
  ];

  if (props.isTechnicalDetailsVisible) {
    rows.push({ label: t("detail.entityId"), value: entry.entityId, isMono: true });
    rows.push({ label: t("detail.domain"), value: entry.domain, isMono: true });
  }

  return rows;
});
</script>

<style scoped>
.entry-properties__hint {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--warn-soft);
  color: var(--warn);
}

.entry-properties__section {
  margin-bottom: 24px;
}

.entry-properties__section h3 {
  margin: 0 0 10px;
  font: 700 15px/1.2 var(--font-display);
}

.entry-properties__card {
  margin: 0;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.entry-properties__card--padded {
  padding: 16px;
}

.entry-properties__row {
  display: grid;
  grid-template-columns: minmax(150px, 220px) minmax(0, 1fr);
  gap: 16px;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
}

.entry-properties__row:first-child {
  border-top: 0;
}

.entry-properties__row dt {
  font-weight: 600;
}

.entry-properties__row dd {
  margin: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 820px) {
  .entry-properties__row {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
}

.entry-properties__entity-id {
  margin-top: 10px;
}
</style>
