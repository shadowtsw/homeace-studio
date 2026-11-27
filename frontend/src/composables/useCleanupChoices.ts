import { computed, ref, watch } from "vue";

import { useCleanupStore } from "@/stores/cleanupStore";
import {
  toChanges,
  toChoices,
  totalCount,
  type CleanupChoice,
  type MergeChoice,
  type SplitChoice,
} from "@/utils/categories/cleanupSelection";

/**
 * The lines of the tidy-up assistant, built from the proposals: what is ticked, what the user
 * typed or picked as target, and the changes that come of it.
 */
export function useCleanupChoices() {
  const cleanup = useCleanupStore();
  const choices = ref<CleanupChoice[]>(toChoices(cleanup.proposals));

  // New proposals arrive after loading or hiding; lines keep what the user ticked and typed.
  watch(
    () => cleanup.proposals,
    (proposals) => {
      const previous = new Map(choices.value.map((choice) => [choice.key, choice]));
      choices.value = toChoices(proposals).map((choice) => {
        const old = previous.get(choice.key);
        return old ? ({ ...choice, isOn: old.isOn, to: old.to } as CleanupChoice) : choice;
      });
    },
  );

  const splits = computed(() =>
    choices.value.filter((choice): choice is SplitChoice => choice.kind === "split"),
  );
  const merges = computed(() =>
    choices.value.filter((choice): choice is MergeChoice => choice.kind === "merge"),
  );
  const hasUntickedCertain = computed(() =>
    splits.value.some((choice) => choice.isCertain && !choice.isOn),
  );
  const changes = computed(() => toChanges(choices.value));

  /** Entries the ticked lines move; for a merge, those of the names that go. */
  const tickedEntryCount = computed(() =>
    choices.value
      .filter((choice) => choice.isOn)
      .reduce((sum, choice) => {
        if (choice.kind === "split") return sum + totalCount(choice.counts);
        const others = choice.names.filter((name) => name !== choice.to);
        return sum + others.reduce((part, name) => part + totalCount(choice.counts[name] ?? {}), 0);
      }, 0),
  );

  function tickCertain(): void {
    for (const choice of splits.value) {
      if (choice.isCertain) choice.isOn = true;
    }
  }

  return { choices, splits, merges, hasUntickedCertain, changes, tickedEntryCount, tickCertain };
}
