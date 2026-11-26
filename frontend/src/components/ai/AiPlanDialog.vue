<template>
  <DialogFrame
    :title="step === 'preview' ? t('ai.previewTitle') : plan.title"
    is-wide
    @close="close"
    @submit="submit"
  >
    <template v-if="step === 'pick'">
      <div class="plan__from">
        <span class="mdi mdi-creation plan__badge" />
        {{ t("ai.planFrom", { client: plan.client ?? t("ai.someAi"), time: createdText }) }}
      </div>
      <blockquote class="plan__reasoning">
        <b>{{ t("ai.reasoning") }}</b>
        {{ plan.reasoning }}
      </blockquote>
      <p class="plan__intro">
        {{ t("ai.reviewIntro") }}
        <template v-if="staleCount">{{
          t("ai.stale", { count: staleCount }, staleCount)
        }}</template>
      </p>

      <section v-if="renames.length" class="plan__section">
        <h3>
          {{ t("ai.renameTitle") }}<small>{{ renames.length }}</small>
        </h3>
        <div class="plan__list">
          <label
            v-for="op in renames"
            :key="op.id"
            class="plan__row"
            :class="{ 'plan__row--on': selected.has(op.id), 'plan__row--stale': op.state !== 'ok' }"
          >
            <input
              type="checkbox"
              :checked="selected.has(op.id)"
              :disabled="op.state !== 'ok'"
              :aria-label="t('ai.take')"
              @change="toggle(op.id)"
            />
            <span class="plan__main">
              <span class="plan__map">
                <code>{{ op.from }}</code>
                <span class="mdi mdi-arrow-right plan__arrow" />
                <code>{{ op.to }}</code>
              </span>
              <span v-if="op.state !== 'ok'" class="plan__tag">{{ t(operationStateKey(op)) }}</span>
            </span>
          </label>
        </div>
      </section>

      <AiPlanMoveGroups
        :plan="plan"
        :all-paths="allPaths"
        :selected="selected"
        @toggle="toggle"
        @toggle-group="toggleGroup"
      />
    </template>

    <template v-else>
      <AiPlanPreview :plan="plan" :all-paths="allPaths" :selected="selected" :chosen="chosen" />
    </template>

    <template #buttons>
      <span class="plan__summary">
        <template v-if="step === 'preview'">
          {{ t("ai.changes", { count: chosen.length }, chosen.length) }}
        </template>
        <template v-else-if="chosen.length">
          {{ t("ai.selected", { count: chosen.length, total: plan.operations.length }) }}
        </template>
        <template v-else>{{ t("ai.noneSelected") }}</template>
      </span>
      <template v-if="step === 'pick'">
        <button class="btn" type="button" :disabled="isBusy" @click="reject">
          {{ t("ai.reject") }}
        </button>
        <button class="btn" type="button" :disabled="isBusy" @click="close">
          {{ t("ai.later") }}
        </button>
        <button class="btn btn--primary" type="submit" :disabled="chosen.length === 0">
          {{ t("ai.next") }}
        </button>
      </template>
      <template v-else>
        <button class="btn" type="button" :disabled="isBusy" @click="step = 'pick'">
          {{ t("ai.back") }}
        </button>
        <button class="btn btn--primary" type="submit" :disabled="isBusy">
          {{ isBusy ? t("ai.running") : t("ai.apply") }}
        </button>
      </template>
    </template>
  </DialogFrame>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from "vue";
import { useI18n } from "vue-i18n";

import DialogFrame from "@/components/common/DialogFrame.vue";
import { useAiPlanActions } from "@/composables/actions/useAiPlanActions";
import { useAiPlanSelection } from "@/composables/useAiPlanSelection";
import type { AiPlan } from "@/services/aiService";
import { operationStateKey, renamesOf } from "@/utils/aiPlan";

import AiPlanMoveGroups from "./AiPlanMoveGroups.vue";
import AiPlanPreview from "./AiPlanPreview.vue";

/** Review of a folder plan from an AI: untick lines, preview, apply. Or reject it. */
const props = defineProps<{
  plan: AiPlan;
  allPaths: string[];
}>();

const emit = defineEmits<{
  /** HA was changed; the page reloads its data. */
  applied: [];
}>();

const { t, locale } = useI18n();

const step = ref<"pick" | "preview">("pick");
const { selected, chosen, toggle, toggleGroup } = useAiPlanSelection({
  plan: toRef(props, "plan"),
});
const { isBusy, apply, reject, close } = useAiPlanActions({
  plan: toRef(props, "plan"),
  onApplied: () => emit("applied"),
});

const renames = computed(() => renamesOf(props.plan));
const staleCount = computed(() => props.plan.operations.filter((op) => op.state !== "ok").length);
const createdText = computed(() =>
  new Date(props.plan.createdAt).toLocaleString(locale.value, {
    dateStyle: "short",
    timeStyle: "short",
  }),
);

/** First to the preview, then apply what is ticked. */
async function submit(): Promise<void> {
  if (step.value === "pick") {
    step.value = "preview";
    return;
  }

  await apply(chosen.value.map((op) => op.id));
}
</script>

<style scoped src="./aiPlanDialog.css"></style>
