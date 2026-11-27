<template>
  <DialogFrame
    :title="step === 'preview' ? t('cleanup.previewTitle') : t('cleanup.title')"
    is-wide
    @close="close"
    @submit="submit"
  >
    <template v-if="step === 'pick'">
      <p class="cleanup__intro">{{ t("cleanup.intro") }}</p>
      <p v-if="cleanup.isLoading && choices.length === 0" class="cleanup__intro">
        {{ t("cleanup.loading") }}
      </p>

      <section v-if="splits.length" class="cleanup__section">
        <div class="cleanup__section-head">
          <h3>
            {{ t("cleanup.splitTitle") }}<small>{{ splits.length }}</small>
          </h3>
          <button v-if="hasUntickedCertain" class="btn" type="button" @click="tickCertain">
            {{ t("cleanup.checkCertain") }}
          </button>
        </div>
        <div class="cleanup__list">
          <CleanupSplitRow
            v-for="choice in splits"
            :key="choice.key"
            v-model:is-on="choice.isOn"
            v-model:to="choice.to"
            :choice="choice"
            :choices="choices"
            :all-paths="allPaths"
            @hide="hide(choice.key)"
          />
        </div>
      </section>

      <section v-if="merges.length" class="cleanup__section">
        <div class="cleanup__section-head">
          <h3>
            {{ t("cleanup.mergeTitle") }}<small>{{ merges.length }}</small>
          </h3>
        </div>
        <div class="cleanup__list">
          <CleanupMergeRow
            v-for="choice in merges"
            :key="choice.key"
            v-model:is-on="choice.isOn"
            v-model:to="choice.to"
            :choice="choice"
            @hide="hide(choice.key)"
          />
        </div>
      </section>

      <p v-if="!cleanup.isLoading && choices.length === 0" class="cleanup__nothing">
        <span class="mdi mdi-check-circle-outline" />{{ t("cleanup.nothing") }}
      </p>

      <div v-if="cleanup.ignoredCount" class="cleanup__hidden">
        <span class="mdi mdi-eye-off-outline" />
        {{ t("cleanup.hidden", { count: cleanup.ignoredCount }) }}
        <button class="btn" type="button" @click="restore">{{ t("cleanup.showHidden") }}</button>
      </div>
    </template>

    <template v-else>
      <CleanupPreview :steps="steps" />
    </template>

    <template #buttons>
      <span class="cleanup__summary">{{ summary }}</span>
      <template v-if="step === 'pick'">
        <button class="btn" type="button" :disabled="isBusy" @click="close">
          {{ t("common.cancel") }}
        </button>
        <button class="btn btn--primary" type="submit" :disabled="isBusy || changes.length === 0">
          {{ t("cleanup.next") }}
        </button>
      </template>
      <template v-else>
        <button class="btn" type="button" :disabled="isBusy" @click="step = 'pick'">
          {{ t("cleanup.back") }}
        </button>
        <button class="btn btn--primary" type="submit" :disabled="isBusy || steps.length === 0">
          {{ isBusy ? t("cleanup.running") : t("cleanup.apply") }}
        </button>
      </template>
    </template>
  </DialogFrame>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import DialogFrame from "@/components/common/DialogFrame.vue";
import { useCleanupChoices } from "@/composables/useCleanupChoices";
import type { CleanupStep } from "@/services/cleanupService";
import { useCleanupStore } from "@/stores/cleanupStore";
import { useFoldersStore } from "@/stores/foldersStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useToastStore } from "@/stores/toastStore";

import CleanupMergeRow from "./CleanupMergeRow.vue";
import CleanupPreview from "./CleanupPreview.vue";
import CleanupSplitRow from "./CleanupSplitRow.vue";

/**
 * The tidy-up assistant: pick the lines to convert, check what HA will do, then apply.
 * Nothing changes in HA before "Convert in Home Assistant".
 */
defineProps<{
  /** Existing folder paths, to show when a target joins a folder that is already there. */
  allPaths: string[];
}>();

const emit = defineEmits<{
  close: [];
  /** HA was changed; the page reloads its data. */
  applied: [categoryCount: number];
}>();

const { t } = useI18n();
const cleanup = useCleanupStore();
const folders = useFoldersStore();
const messages = useMessagesStore();
const toasts = useToastStore();

const step = ref<"pick" | "preview">("pick");
const steps = ref<CleanupStep[]>([]);
const isBusy = ref(false);

const { choices, splits, merges, hasUntickedCertain, changes, tickedEntryCount, tickCertain } =
  useCleanupChoices();

const summary = computed(() => {
  if (step.value === "preview") {
    const merged = steps.value.filter((item) => item.kind === "merge").length;
    const text = t("cleanup.changes", { count: steps.value.length }, steps.value.length);
    return merged ? `${text} · ${t("cleanup.summaryMerged", { count: merged })}` : text;
  }

  if (changes.value.length === 0) return t("cleanup.noneSelected");

  const names = new Set(changes.value.map((change) => change.from));
  const entries = tickedEntryCount.value;

  return `${t("cleanup.summaryCategories", { count: names.size }, names.size)} · ${t(
    "cleanup.summaryEntries",
    { count: entries },
    entries,
  )}`;
});

function showError(error: unknown): void {
  toasts.show({
    text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
    tone: "error",
  });
}

async function hide(key: string): Promise<void> {
  try {
    await cleanup.ignore(key);
    toasts.show({ text: t("toast.proposalHidden") });
  } catch (error) {
    showError(error);
  }
}

async function restore(): Promise<void> {
  try {
    await cleanup.restore();
  } catch (error) {
    showError(error);
  }
}

async function submit(): Promise<void> {
  if (isBusy.value) return;

  isBusy.value = true;

  try {
    if (step.value === "pick") {
      steps.value = await cleanup.preview(changes.value);
      step.value = "preview";
    } else {
      const categoryCount = await cleanup.apply(changes.value);
      // Folder colors and empty folders moved along in the overlay.
      await folders.load();
      emit("applied", categoryCount);
    }
  } catch (error) {
    showError(error);
  } finally {
    isBusy.value = false;
  }
}

function close(): void {
  if (!isBusy.value) emit("close");
}
</script>

<style scoped src="./cleanupDialog.css"></style>
