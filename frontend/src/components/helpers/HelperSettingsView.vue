<template>
  <section class="helper-settings-view">
    <p v-if="!isEditable" class="helper-settings-view__later">
      <span class="mdi mdi-clock-outline" /> {{ t("helperSettings.later") }}
    </p>

    <p v-else-if="isLoading" class="helper-settings-view__state">
      {{ t("helperSettings.loading") }}
    </p>

    <p v-else-if="hasError || !type || !draft" class="helper-settings-view__state">
      {{ t("helperSettings.error") }}
      <button class="btn" type="button" @click="load">{{ t("errors.retry") }}</button>
    </p>

    <template v-else>
      <h3 class="helper-settings-view__title">
        {{ t("helperSettings.title") }}
        <small v-if="isTechnicalDetailsVisible" class="mono">{{ type }}/update</small>
      </h3>

      <div class="helper-settings-view__card">
        <HelperSettingsFields v-model="draft" :type="type" :invalid-fields="invalidFields" />

        <p v-if="problem" class="helper-settings-view__problem" role="alert">
          <span class="mdi mdi-alert-circle-outline" />
          {{ t(`helperSettings.problems.${problem.message}`) }}
        </p>
      </div>
    </template>

    <Teleport defer to="#entry-detail-footer">
      <SaveFooter
        v-if="isDirty"
        :is-saving="isSaving"
        :blocked-by="problem ? t('helperSettings.fixFirst') : null"
        @save="save"
        @discard="discard"
      />
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, toRaw } from "vue";
import { useI18n } from "vue-i18n";

import type { HelperSettings, HelperType } from "@/constants/helpers";
import { fetchHelperSettings, saveHelperSettings } from "@/services/helpersService";
import { useMessagesStore } from "@/stores/messagesStore";
import { useToastStore } from "@/stores/toastStore";
import type { Entry } from "@/types/entry";
import { hasEditableSettings } from "@/utils/entryActions";
import { helperSettingsProblem } from "@/utils/helperSettings";

import SaveFooter from "@/components/common/SaveFooter.vue";

import HelperSettingsFields from "./HelperSettingsFields.vue";

const props = defineProps<{
  entry: Entry;
  isTechnicalDetailsVisible: boolean;
}>();

const { t } = useI18n();
const toasts = useToastStore();
const messages = useMessagesStore();

const type = ref<HelperType | null>(null);
/** The settings as HA has them, and the user's edited copy. */
const saved = ref<HelperSettings | null>(null);
const draft = ref<HelperSettings | null>(null);
const isLoading = ref(false);
const hasError = ref(false);
const isSaving = ref(false);

/** Template and group helpers are config entries in HA; they come later. */
const isEditable = computed(() => hasEditableSettings(props.entry));
const isDirty = computed(
  () => JSON.stringify(draft.value) !== JSON.stringify(saved.value) && draft.value !== null,
);
const problem = computed(() =>
  type.value && draft.value ? helperSettingsProblem(type.value, draft.value) : null,
);
const invalidFields = computed(() => problem.value?.fields ?? []);

async function load(): Promise<void> {
  if (!isEditable.value) return;

  const entityId = props.entry.entityId;
  isLoading.value = true;
  hasError.value = false;

  try {
    const view = await fetchHelperSettings(entityId);
    // Another entry may have been opened meanwhile.
    if (entityId !== props.entry.entityId) return;
    type.value = view.type;
    saved.value = view.settings;
    draft.value = structuredClone(view.settings);
  } catch {
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
}

async function save(): Promise<void> {
  if (!draft.value || problem.value) return;

  isSaving.value = true;

  try {
    const view = await saveHelperSettings(props.entry.entityId, draft.value);
    saved.value = view.settings;
    draft.value = structuredClone(view.settings);
    toasts.show(t("helperSettings.saved", { name: props.entry.name }));
  } catch (error) {
    toasts.show(messages.textFor(error, t("errors.actionFailed")), "error");
  } finally {
    isSaving.value = false;
  }
}

function discard(): void {
  // toRaw: Vue wraps refs in proxies, which structuredClone cannot copy.
  draft.value = structuredClone(toRaw(saved.value));
}

// A newly opened helper starts with its settings from HA; unsaved edits of the previous one go.
watch(
  () => props.entry.entityId,
  () => {
    type.value = null;
    saved.value = null;
    draft.value = null;
    void load();
  },
  { immediate: true },
);
</script>

<style scoped>
.helper-settings-view {
  display: grid;
  gap: 10px;
}

.helper-settings-view__title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0;
  font-size: 15px;
}

.helper-settings-view__title small {
  color: var(--faint);
  font-size: 11.5px;
  font-weight: 500;
}

.helper-settings-view__card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
}

.helper-settings-view__problem {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--err-soft);
  color: var(--err);
  font-size: 12.5px;
  line-height: 1.4;
}

.helper-settings-view__later,
.helper-settings-view__state {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.45;
}
</style>
