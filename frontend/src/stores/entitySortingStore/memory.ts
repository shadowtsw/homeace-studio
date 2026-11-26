import { ref } from "vue";

import { saveSortingMemory } from "@/services/entitySortingService";
import type { EntitySortingMemory, SortingRule } from "@/types/entitySorting";

type CreateSortingMemoryOptions = {
  /** Rules or kept answers changed: the proposals have to follow. */
  onChanged: () => void;
};

/**
 * What the tool keeps for every user in the overlay: the own rules, folders turned down per
 * bundle, bundles kept out, where new area folders go, and the last run (for "Rückgängig").
 * Every change is saved right away. A part of the entity sorting store.
 */
export function createSortingMemory({ onChanged }: CreateSortingMemoryOptions) {
  const lastRun = ref<EntitySortingMemory["lastRun"]>(null);
  const rules = ref<SortingRule[]>([]);
  const rejected = ref(new Map<string, Set<string>>());
  const ignored = ref(new Set<string>());
  /** Where new area folders go; null lets the tool pick from the existing folders. */
  const areaParent = ref<string | null>(null);

  /** Takes over what the backend keeps. */
  function takeLoaded(memory: EntitySortingMemory): void {
    rules.value = memory.rules;
    rejected.value = new Map(memory.rejected.map((item) => [item.bundleKey, new Set(item.paths)]));
    ignored.value = new Set(memory.ignored);
    areaParent.value = memory.areaParent ?? null;
    lastRun.value = memory.lastRun;
  }

  async function saveMemory(): Promise<void> {
    await saveSortingMemory({
      rules: rules.value,
      rejected: [...rejected.value].map(([bundleKey, paths]) => ({ bundleKey, paths: [...paths] })),
      ignored: [...ignored.value],
      areaParent: areaParent.value,
    });
  }

  async function setIgnored({
    key,
    isIgnored,
  }: {
    key: string;
    isIgnored: boolean;
  }): Promise<void> {
    const next = new Set(ignored.value);
    if (isIgnored) next.add(key);
    else next.delete(key);
    ignored.value = next;
    onChanged();
    await saveMemory();
  }

  async function setRules(next: SortingRule[]): Promise<void> {
    rules.value = next;
    onChanged();
    await saveMemory();
  }

  /** Where new area folders go; kept for all users like the rules. */
  async function setAreaParent(parent: string | null): Promise<void> {
    areaParent.value = parent;
    onChanged();
    await saveMemory();
  }

  async function resetRejected(): Promise<void> {
    rejected.value = new Map();
    onChanged();
    await saveMemory();
  }

  async function resetIgnored(): Promise<void> {
    ignored.value = new Set();
    onChanged();
    await saveMemory();
  }

  return {
    lastRun,
    rules,
    rejected,
    ignored,
    areaParent,
    takeLoaded,
    saveMemory,
    setIgnored,
    setRules,
    setAreaParent,
    resetRejected,
    resetIgnored,
  };
}
