<template>
  <div class="entity-id">
    <span class="field-label">{{ t("renameId.label") }}</span>
    <div class="entity-id__row">
      <code class="entity-id__value">{{ entry.entityId }}</code>
      <button class="btn" type="button" :disabled="isBusy" @click="emit('rename', null)">
        <span class="mdi mdi-pencil-outline" />{{ t("renameId.change") }}
      </button>
    </div>
    <p class="entity-id__hint">
      <span class="mdi mdi-information-outline" />
      <span v-if="suggestion">
        {{ t("renameId.mismatch") }}
        <code>{{ suggestion }}</code> ·
        <button class="entity-id__link" type="button" @click="emit('rename', suggestion)">
          {{ t("renameId.adopt") }}
        </button>
      </span>
      <span v-else>{{ t("renameId.hint") }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { Entry } from "@/types/entry";
import { suggestEntityId } from "@/utils/entities/entityId";

/** The entity ID, read-only, with "Ändern …" and a suggestion when it no longer fits the name. */
const props = defineProps<{
  entry: Entry;
  isBusy: boolean;
}>();

const emit = defineEmits<{
  /** `preset`: the suggested ID, or null to start from the current one. */
  rename: [preset: string | null];
}>();

const { t } = useI18n();

const suggestion = computed(() =>
  suggestEntityId({ entityId: props.entry.entityId, name: props.entry.name }),
);
</script>

<style scoped>
.entity-id {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
}

.entity-id .field-label {
  margin: 0;
}

.entity-id__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.entity-id__value {
  padding: 5px 9px;
  border-radius: 7px;
  background: var(--sunken);
  font-family: var(--font-mono);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.entity-id__row .btn {
  gap: 6px;
}

.entity-id__hint {
  display: flex;
  gap: 6px;
  margin: 0;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.45;
}

.entity-id__hint code {
  font-family: var(--font-mono);
}

.entity-id__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
}
</style>
