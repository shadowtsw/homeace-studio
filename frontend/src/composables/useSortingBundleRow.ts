import { computed, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { useSortingTexts } from "@/composables/texts/useSortingTexts";
import { useEntitySortingStore } from "@/stores/entitySortingStore";
import { targetOf } from "@/utils/entitySorting/compute";
import type { SortingBundle, SortingGroup, Suggestion } from "@/utils/entitySorting/model";
import { hasNewTarget } from "@/utils/entitySorting/targets";

type UseSortingBundleRowOptions = {
  bundle: Ref<SortingBundle>;
  group: Ref<SortingGroup>;
};

/**
 * What one bundle row of step 3 shows: the proposal, the tick, how it changed, the folder it goes
 * to, other folders worth a click, and why.
 */
export function useSortingBundleRow({ bundle, group }: UseSortingBundleRowOptions) {
  const { t } = useI18n();
  const sorting = useEntitySortingStore();
  const texts = useSortingTexts();

  // The proposal and the user's choice
  const suggestion = computed(
    (): Suggestion =>
      sorting.computation?.suggestions.get(bundle.value.key) ?? {
        target: null,
        confidence: "unclear",
        reasons: [],
        hintKinds: [],
        alternatives: [],
        isNew: false,
        isUsedEverywhere: false,
        ruleNumber: null,
      },
  );
  const choice = computed(() => sorting.choices.get(bundle.value.key));
  const target = computed(() =>
    targetOf({
      bundle: bundle.value,
      input: {
        state: sorting.state(),
        previous: sorting.computation,
        layout: sorting.layout,
      },
    }),
  );
  const isTicked = computed(() => !!choice.value?.isOn && !!target.value);
  const change = computed(() => sorting.changes.get(bundle.value.key));
  const isFlashing = computed(() => sorting.flashing.has(bundle.value.key));

  // What the row offers
  /** The group says the folder already; only show it when this row goes elsewhere. */
  const isTargetShown = computed(
    () =>
      group.value.type === "system" ||
      group.value.type === "rest" ||
      !!choice.value?.target ||
      hasNewTarget({ suggestion: suggestion.value, group: group.value }),
  );
  const canReject = computed(
    () =>
      !!target.value &&
      !choice.value?.target &&
      suggestion.value.confidence !== "rule" &&
      group.value.type !== "system",
  );
  const alternatives = computed(() => {
    // An unclear proposal is only one option among the others
    const weakTarget = suggestion.value.confidence === "unclear" ? suggestion.value.target : null;
    const weak = weakTarget ? [weakTarget] : [];

    return [...new Set([...weak, ...suggestion.value.alternatives])].filter(
      (path) => path !== target.value,
    );
  });

  // Area, integration and the reasons, as text
  const meta = computed(() => {
    const areaId = bundle.value.areaId;
    const integrationId = bundle.value.integration;
    const area = areaId ? sorting.home?.areas.get(areaId)?.name : null;
    const integration = integrationId
      ? (sorting.home?.context.integrations[integrationId] ?? integrationId)
      : null;

    return [area, integration].filter(Boolean).join(" · ");
  });
  const why = computed(() => {
    if (choice.value?.target) return t("entitySorting.suggestions.ownPick");
    if (!suggestion.value.reasons.length && group.value.type === "rest") {
      return t("entitySorting.suggestions.nothingFits");
    }

    return suggestion.value.reasons.map(texts.reason).join(" · ");
  });

  return {
    suggestion,
    choice,
    target,
    isTicked,
    change,
    isFlashing,
    isTargetShown,
    canReject,
    alternatives,
    meta,
    why,
  };
}
