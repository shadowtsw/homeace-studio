<template>
  <DialogFrame :title="t('renameId.title')" is-wide @close="emit('cancel')" @submit="submit">
    <p class="rename__intro">{{ t("renameId.intro", { name: entry.name }) }}</p>

    <label class="field-label" :for="inputId">{{ t("renameId.label") }}</label>
    <div class="rename__input">
      <span class="mono">{{ domain }}.</span>
      <input
        :id="inputId"
        ref="input"
        v-model="objectId"
        class="field-input mono"
        autocomplete="off"
        spellcheck="false"
        :disabled="isBusy"
      />
    </div>
    <p v-if="problem" class="field-problem">{{ problem }}</p>

    <section class="rename__box">
      <h3><span class="mdi mdi-swap-horizontal" />{{ t("renameId.references") }}</h3>
      <p v-if="references === null" class="rename__muted">{{ t("renameId.loading") }}</p>
      <p v-else-if="references.length === 0" class="rename__muted">{{ t("renameId.none") }}</p>
      <template v-else>
        <label v-if="editableCount > 0" class="rename__check">
          <input v-model="withReferences" type="checkbox" :disabled="isBusy" />
          {{
            t(
              "renameId.withReferences",
              { count: editablePlaces, flows: editableCount },
              editablePlaces,
            )
          }}
        </label>
        <ul class="rename__list">
          <li v-for="reference in references" :key="reference.entityId">
            <span>{{ reference.name }}</span>
            <small v-if="!reference.isEditable" class="rename__manual">
              {{
                t(
                  reference.kind === "scene" || reference.kind === "group"
                    ? "renameId.manualScene"
                    : "renameId.manual",
                )
              }}
            </small>
            <small v-else>{{
              t("renameId.places", { count: reference.count }, reference.count)
            }}</small>
          </li>
        </ul>
      </template>
    </section>

    <section class="rename__box">
      <h3><span class="mdi mdi-information-outline" />{{ t("renameId.otherTitle") }}</h3>
      <ul class="rename__notes">
        <li>{{ t("renameId.history") }}</li>
        <li>{{ t("renameId.dashboards") }}</li>
      </ul>
    </section>

    <template #buttons>
      <button class="btn" type="button" :disabled="isBusy" @click="emit('cancel')">
        {{ t("common.cancel") }}
      </button>
      <button class="btn btn--primary" type="submit" :disabled="isBusy || !canSave">
        {{ isBusy ? t("renameId.running") : t("renameId.confirm") }}
      </button>
    </template>
  </DialogFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useId, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import DialogFrame from "@/components/common/DialogFrame.vue";
import { fetchReferences, type EntityReference } from "@/services/renameService";
import type { Entry } from "@/types/entry";
import { domainOf, OBJECT_ID_PATTERN, objectIdOf } from "@/utils/entities/entityId";

/** "Entity-ID ändern": the new ID, and which flows are rewritten with it. */
const props = defineProps<{
  entry: Entry;
  /** A suggested new ID ("Angleichen"); null starts from the current one. */
  preset: string | null;
  /** IDs HA already has, to say "gibt es schon" before HA does. */
  takenIds: ReadonlySet<string>;
  isBusy: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [newEntityId: string, withReferences: boolean];
}>();

const { t } = useI18n();
const inputId = useId();
const input = useTemplateRef("input");

const domain = domainOf(props.entry.entityId);
const objectId = ref(objectIdOf(props.preset ?? props.entry.entityId));
const withReferences = ref(true);
const references = ref<EntityReference[] | null>(null);

onMounted(async () => {
  input.value?.focus();
  try {
    references.value = await fetchReferences(props.entry.entityId);
  } catch (error) {
    console.error("Loading the references failed", error);
    references.value = [];
  }
});

const newEntityId = computed(() => `${domain}.${objectId.value.trim()}`);
const editable = computed(() => (references.value ?? []).filter((item) => item.isEditable));
const editableCount = computed(() => editable.value.length);
const editablePlaces = computed(() => editable.value.reduce((sum, item) => sum + item.count, 0));

const problem = computed(() => {
  const value = objectId.value.trim();
  if (!value) return t("renameId.empty");
  if (!OBJECT_ID_PATTERN.test(value)) return t("renameId.invalid");
  if (newEntityId.value !== props.entry.entityId && props.takenIds.has(newEntityId.value)) {
    return t("renameId.taken");
  }
  return "";
});
const canSave = computed(
  () => !problem.value && newEntityId.value !== props.entry.entityId && references.value !== null,
);

function submit(): void {
  if (canSave.value && !props.isBusy) emit("confirm", newEntityId.value, withReferences.value);
}
</script>

<style scoped>
.rename__intro {
  margin: 0 0 12px;
  color: var(--muted);
}

.rename__input {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rename__input .field-input {
  flex: 1;
}

.rename__box {
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.rename__box h3 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  font-size: 14px;
}

.rename__muted {
  margin: 0;
  color: var(--muted);
}

.rename__check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.rename__list {
  display: grid;
  gap: 4px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.rename__list li {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.rename__list small {
  margin-left: auto;
  color: var(--muted);
}

.rename__list .rename__manual {
  color: var(--warn);
}

.rename__notes {
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}
</style>
