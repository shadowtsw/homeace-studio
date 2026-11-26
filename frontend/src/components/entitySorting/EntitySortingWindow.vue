<template>
  <div class="sorting-window" role="presentation" @click.self="requestClose">
    <section
      ref="panel"
      class="sorting-window__panel"
      role="dialog"
      aria-modal="true"
      :aria-label="t('entitySorting.title')"
      tabindex="-1"
    >
      <header class="sorting-window__head">
        <h2 class="sorting-window__title">
          <span class="mdi mdi-auto-fix" />{{ t("entitySorting.title") }} <BetaBadge />
        </h2>
        <SortingStepper :has-result="!!run.result.value" />
        <button
          class="icon-btn"
          type="button"
          :aria-label="t('entitySorting.close')"
          :title="t('entitySorting.close')"
          @click="requestClose"
        >
          <span class="mdi mdi-close" />
        </button>
      </header>

      <div ref="body" class="sorting-window__body">
        <p v-if="sorting.isLoading && !sorting.home" class="sorting-window__state">
          {{ t("entitySorting.loading") }}
        </p>
        <div v-else-if="sorting.loadError && !sorting.home" class="sorting-window__state">
          <p>
            {{
              messages.textFor({
                error: sorting.loadError,
                fallback: t("entitySorting.loadFailed"),
              })
            }}
          </p>
          <button class="btn" type="button" @click="sorting.load()">
            {{ t("entitySorting.retry") }}
          </button>
        </div>
        <template v-else-if="sorting.home">
          <SortingOverviewStep v-if="sorting.step === SORTING_STEP.overview" @undo="undo" />
          <SortingRulesStep v-else-if="sorting.step === SORTING_STEP.rules" />
          <SortingSuggestionsStep v-else-if="sorting.step === SORTING_STEP.suggestions" />
          <SortingApplyStep
            v-else-if="sorting.step === SORTING_STEP.apply"
            :progress="run.progress.value"
          />
          <SortingResultStep
            v-else-if="run.result.value"
            :result="run.result.value"
            :is-undoing="run.isUndoing.value"
            @undo="undo"
          />
        </template>
      </div>

      <footer class="sorting-window__foot">
        <SortingFooter
          :is-busy="!!run.progress.value || run.isUndoing.value"
          @close="requestClose"
          @apply="run.apply()"
        />
      </footer>
    </section>

    <DialogFrame
      v-if="isConfirmingClose"
      :title="t('entitySorting.confirmClose.title')"
      @close="isConfirmingClose = false"
      @submit="close"
    >
      <p class="sorting-window__confirm">
        {{
          t(
            "entitySorting.confirmClose.text",
            { count: sorting.moves.length },
            sorting.moves.length,
          )
        }}
      </p>
      <template #buttons>
        <button class="btn" type="button" @click="isConfirmingClose = false">
          {{ t("entitySorting.confirmClose.keep") }}
        </button>
        <button class="btn btn--primary" type="submit">
          {{ t("entitySorting.confirmClose.discard") }}
        </button>
      </template>
    </DialogFrame>
  </div>
</template>

<script setup lang="ts">
import { onKeyStroke } from "@vueuse/core";
import { onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import BetaBadge from "@/components/common/BetaBadge.vue";
import DialogFrame from "@/components/common/DialogFrame.vue";
import { useSortingRun } from "@/composables/useSortingRun";
import { SORTING_STEP, useEntitySortingStore } from "@/stores/entitySortingStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useToastStore } from "@/stores/toastStore";

import SortingApplyStep from "./SortingApplyStep.vue";
import SortingFooter from "./SortingFooter.vue";
import SortingOverviewStep from "./SortingOverviewStep.vue";
import SortingResultStep from "./SortingResultStep.vue";
import SortingRulesStep from "./SortingRulesStep.vue";
import SortingStepper from "./SortingStepper.vue";
import SortingSuggestionsStep from "./SortingSuggestionsStep.vue";

/**
 * The tool "Entitäten einsortieren": a window with five steps (docs/features/entity-sorting.md).
 * Nothing changes in HA before "Anwenden"; the last run can be undone.
 */
const { t } = useI18n();
const sorting = useEntitySortingStore();
const messages = useMessagesStore();
const toasts = useToastStore();
const run = useSortingRun();
const panel = useTemplateRef("panel");
const isConfirmingClose = ref(false);

/** Ticks that would get lost ask first; while a run is busy, the window stays. */
function requestClose(): void {
  if (run.progress.value || run.isUndoing.value) return;

  const isReviewing =
    sorting.step === SORTING_STEP.rules || sorting.step === SORTING_STEP.suggestions;
  if (isReviewing && sorting.moves.length > 0) isConfirmingClose.value = true;
  else close();
}

function close(): void {
  isConfirmingClose.value = false;
  sorting.close();
}

async function undo(): Promise<void> {
  try {
    const count = await run.undo();
    toasts.show({ text: t("entitySorting.result.undone", { count }, count) });
    sorting.goTo(SORTING_STEP.overview);
  } catch (error) {
    toasts.show({
      text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
      tone: "error",
    });
  }
}

onMounted(() => panel.value?.focus());
// Registered before the sheet's and the confirmation's own handlers, so it sees them still open.
onKeyStroke("Escape", () => {
  if (isConfirmingClose.value || sorting.sheetGroupKey) return;
  requestClose();
});
</script>

<style scoped>
.sorting-window {
  position: fixed;
  inset: 0;
  z-index: 105;
  display: grid;
  place-items: center;
  padding: max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px))
    max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
  background: var(--scrim);
}

.sorting-window__panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: min(1120px, 100%);
  height: min(900px, 100%);
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.sorting-window__panel:focus {
  outline: 0;
}

.sorting-window__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  padding: 12px 14px 12px 20px;
  border-bottom: 1px solid var(--line);
}

.sorting-window__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font: 700 19px/1.2 var(--font-display);
}

.sorting-window__title > .mdi {
  color: var(--accent);
  font-size: 20px;
}

.sorting-window__body {
  min-height: 0;
  overflow: auto;
  padding: 18px 20px 24px;
}

.sorting-window__state {
  display: grid;
  justify-items: start;
  gap: 10px;
  margin: 8vh auto 0;
  max-width: 480px;
  color: var(--muted);
}

.sorting-window__confirm {
  margin: 0;
  color: var(--muted);
}

.sorting-window__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  border-top: 1px solid var(--line);
  background: var(--surface-2);
}

@media (max-width: 640px) {
  .sorting-window {
    padding: 0;
  }

  .sorting-window__panel {
    width: 100%;
    height: 100%;
    border-radius: 0;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .sorting-window__head {
    gap: 8px;
    padding: 10px 10px 10px 14px;
  }

  .sorting-window__body {
    padding: 14px 14px 20px;
  }
}
</style>
