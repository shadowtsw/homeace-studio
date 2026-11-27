<template>
  <div class="entry-visibility">
    <div class="entry-visibility__row">
      <div class="entry-visibility__label">
        <span class="field-label">{{ t("visibility.enabled") }}</span>
        <small>{{
          entry.kind === "automation"
            ? t("visibility.enabledHintAutomation")
            : t("visibility.enabledHint")
        }}</small>
      </div>
      <label class="entry-visibility__switch">
        <span>{{
          entry.isDisabled ? t("visibility.disabledNow") : t("visibility.enabledNow")
        }}</span>
        <SwitchToggle
          :model-value="!entry.isDisabled"
          :label="t('visibility.enabled')"
          :disabled="isBusy"
          @update:model-value="
            (on: boolean) => (on ? emit('save', { isDisabled: false }) : emit('askDisable'))
          "
        />
      </label>
    </div>

    <div class="entry-visibility__row">
      <div class="entry-visibility__label">
        <span class="field-label">{{ t("visibility.hidden") }}</span>
        <small>{{ t("visibility.hiddenHint") }}</small>
      </div>
      <label class="entry-visibility__switch">
        <span>{{ entry.isHidden ? t("visibility.hiddenNow") : t("visibility.visibleNow") }}</span>
        <SwitchToggle
          :model-value="entry.isHidden"
          :label="t('visibility.hidden')"
          :disabled="isBusy"
          @update:model-value="(hidden: boolean) => emit('save', { isHidden: hidden })"
        />
      </label>
    </div>

    <div class="entry-visibility__row entry-visibility__row--aliases">
      <div class="entry-visibility__label">
        <span class="field-label">{{ t("visibility.aliases") }}</span>
        <small>{{ t("visibility.aliasesHint") }}</small>
      </div>
      <div class="entry-visibility__aliases">
        <p v-if="aliases === null" class="entry-visibility__loading">
          {{ t("visibility.loading") }}
        </p>
        <template v-else>
          <span v-for="alias in aliases" :key="alias" class="entry-visibility__alias">
            {{ alias }}
            <button
              type="button"
              :aria-label="t('visibility.removeAlias', { alias })"
              :title="t('visibility.removeAlias', { alias })"
              :disabled="isBusy"
              @click="saveAliases(aliases.filter((item) => item !== alias))"
            >
              <span class="mdi mdi-close" />
            </button>
          </span>
          <form class="entry-visibility__add" @submit.prevent="addAlias">
            <input
              v-model="draft"
              class="field-input"
              :placeholder="t('visibility.aliasPlaceholder')"
              :aria-label="t('visibility.aliasPlaceholder')"
              :disabled="isBusy"
              maxlength="100"
            />
            <button class="btn" type="submit" :disabled="isBusy || draft.trim() === ''">
              <span class="mdi mdi-plus" />{{ t("visibility.addAlias") }}
            </button>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import SwitchToggle from "@/components/common/SwitchToggle.vue";
import { fetchEntryDetails } from "@/services/entriesService";
import type { Entry, EntryChanges } from "@/types/entry";

/** Enabled, hidden and aliases: registry fields that are saved right away. */
const props = defineProps<{
  entry: Entry;
  isBusy: boolean;
}>();

const emit = defineEmits<{
  save: [changes: EntryChanges];
  /** Disabling asks first; it can break flows that use the entry. */
  askDisable: [];
}>();

const { t } = useI18n();

/** null while loading; HA sends aliases only for one entry at a time. */
const aliases = ref<string[] | null>(null);
const draft = ref("");

async function loadAliases(): Promise<void> {
  const entityId = props.entry.entityId;

  try {
    const details = await fetchEntryDetails(entityId);
    if (props.entry.entityId === entityId) aliases.value = details.aliases;
  } catch (error) {
    console.error("Loading the aliases failed", error);
    if (props.entry.entityId === entityId) aliases.value = [];
  }
}

// Another entry, or the same one after saving: read the aliases as HA has them now.
watch(
  () => props.entry,
  (next, previous) => {
    if (next.entityId !== previous?.entityId) {
      aliases.value = null;
      draft.value = "";
    }
    void loadAliases();
  },
  { immediate: true },
);

function saveAliases(next: string[]): void {
  aliases.value = next;
  emit("save", { aliases: next });
}

function addAlias(): void {
  const alias = draft.value.trim();
  if (!alias || !aliases.value) return;

  draft.value = "";
  if (aliases.value.some((item) => item.toLocaleLowerCase() === alias.toLocaleLowerCase())) return;
  saveAliases([...aliases.value, alias]);
}
</script>

<style scoped>
.entry-visibility {
  display: grid;
}

.entry-visibility__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
}

.entry-visibility__row:first-child {
  border-top: 0;
}

.entry-visibility__row--aliases {
  align-items: flex-start;
}

.entry-visibility__label {
  display: grid;
  flex: 1 1 260px;
  gap: 2px;
}

.entry-visibility__label .field-label {
  margin: 0;
}

.entry-visibility__label small {
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.4;
}

.entry-visibility__switch {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
  font-size: 13px;
}

.entry-visibility__aliases {
  display: flex;
  flex: 1 1 320px;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.entry-visibility__alias {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px 3px 10px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  font-size: 13px;
}

.entry-visibility__alias button {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--muted);
  cursor: pointer;
}

.entry-visibility__alias button:hover {
  background: var(--sunken);
  color: var(--fg);
}

.entry-visibility__add {
  display: flex;
  flex: 1 1 220px;
  gap: 6px;
}

.entry-visibility__add .field-input {
  flex: 1;
  min-width: 0;
}

.entry-visibility__add .btn {
  gap: 4px;
}

.entry-visibility__loading {
  margin: 0;
  color: var(--muted);
}
</style>
