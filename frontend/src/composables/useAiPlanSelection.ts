import { computed, ref, type Ref } from "vue";

import type { AiPlan } from "@/services/aiService";
import { initialSelection, isGroupOn, type MoveGroup } from "@/utils/aiPlan";

/**
 * Which operations of an AI's folder plan are ticked: each on its own, or a whole group of moves
 * into one folder at once. Only usable operations (state "ok") count.
 */
export function useAiPlanSelection({ plan }: { plan: Ref<AiPlan> }) {
  const selected = ref(initialSelection(plan.value));

  const chosen = computed(() =>
    plan.value.operations.filter((op) => op.state === "ok" && selected.value.has(op.id)),
  );

  function toggle(id: string): void {
    const next = new Set(selected.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected.value = next;
  }

  function toggleGroup(group: MoveGroup): void {
    const turnOn = !isGroupOn({ group, selected: selected.value });
    const next = new Set(selected.value);

    for (const op of group.operations) {
      if (op.state !== "ok") continue;
      if (turnOn) next.add(op.id);
      else next.delete(op.id);
    }

    selected.value = next;
  }

  return { selected, chosen, toggle, toggleGroup };
}
