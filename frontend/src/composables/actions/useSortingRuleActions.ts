import type { Ref } from "vue";
import { useI18n } from "vue-i18n";

import { useEntitySortingStore } from "@/stores/entitySortingStore";
import { useToastStore } from "@/stores/toastStore";
import type { SortingRule } from "@/types/entitySorting";

/**
 * The own rules of "Entitäten einsortieren": adding, replacing, moving and deleting them (with
 * "Rückgängig"). Every change is saved right away. `editing` is the rule whose editor is open; it
 * closes when a rule is saved.
 */
export function useSortingRuleActions({ editing }: { editing: Ref<number | null> }) {
  const { t } = useI18n();
  const sorting = useEntitySortingStore();
  const toasts = useToastStore();

  async function add(rule: SortingRule): Promise<void> {
    editing.value = null;
    await sorting.setRules([...sorting.rules, rule]);
    toasts.show({ text: t("entitySorting.rules.added", { number: sorting.rules.length }) });
  }

  async function replace({ index, rule }: { index: number; rule: SortingRule }): Promise<void> {
    editing.value = null;
    await sorting.setRules(
      sorting.rules.map((current, position) => (position === index ? rule : current)),
    );
  }

  /** Swaps two rules; when both match, the earlier one decides. */
  async function swap({ first, second }: { first: number; second: number }): Promise<void> {
    const next = [...sorting.rules];
    [next[first], next[second]] = [next[second] as SortingRule, next[first] as SortingRule];
    await sorting.setRules(next);
  }

  async function remove(index: number): Promise<void> {
    const removed = sorting.rules[index] as SortingRule;
    await sorting.setRules(sorting.rules.filter((_, position) => position !== index));
    toasts.show({
      text: t("entitySorting.rules.deleted", { number: index + 1 }),
      tone: "success",
      undo: () => {
        const next = [...sorting.rules];
        next.splice(index, 0, removed);
        void sorting.setRules(next);
      },
    });
  }

  return { add, replace, swap, remove };
}
