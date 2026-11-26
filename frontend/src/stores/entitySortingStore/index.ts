import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";

import { i18n } from "@/i18n";
import { loadSortingContext } from "@/services/entitySortingService";
import { collectMoves, computeSorting, suggestionChanges } from "@/utils/entitySorting/compute";
import { buildSortingHome, type SortingHome } from "@/utils/entitySorting/home";
import { layoutSorting, pretick } from "@/utils/entitySorting/layout";
import type {
  BundleChoice,
  SortingComputation,
  SortingLayout,
  SortingNames,
  SortingOptions,
  SortingState,
  SuggestionChange,
} from "@/utils/entitySorting/model";

import { createSortingMemory } from "./memory";
import { sortingNames } from "./names";
import { createSortingVisibility } from "./visibility";

export const SORTING_STEP = { overview: 1, rules: 2, suggestions: 3, apply: 4, result: 5 } as const;
export type SortingStep = (typeof SORTING_STEP)[keyof typeof SORTING_STEP];

const DEFAULT_OPTIONS: SortingOptions = {
  includeHidden: false,
  isTechnicalSeparate: false,
  technicalFolder: "Technik/Diagnose",
  isResortingSorted: false,
};

/**
 * The tool "Entitäten einsortieren" for one visit: the loaded home, the memory (rules, turned-down
 * folders, kept-out bundles, saved in the overlay; `memory.ts`), the user's ticks, the engine's
 * results, and which rows show (`visibility.ts`).
 * The engine is pure (utils/entitySorting); this store only feeds it and keeps what it returned.
 */
export const useEntitySortingStore = defineStore("entitySorting", () => {
  const t = i18n.global.t;

  // The visit
  const isOpen = ref(false);
  const isLoading = ref(false);
  const loadError = ref<unknown>(null);
  const step = ref<SortingStep>(SORTING_STEP.overview);
  const home = shallowRef<SortingHome | null>(null);

  // What the tool keeps for everyone, and what the user does in this visit
  const memory = createSortingMemory({ onChanged: settingsChanged });
  const options = ref<SortingOptions>({ ...DEFAULT_OPTIONS });
  const choices = ref(new Map<string, BundleChoice>());
  const excluded = ref(new Set<string>());
  const groupNames = ref(new Map<string, string>());

  // What the engine returned
  const computation = shallowRef<SortingComputation | null>(null);
  const layout = shallowRef<SortingLayout | null>(null);
  /** Changes since the list was last ordered; rows stay where they are and show them. */
  const changes = shallowRef(new Map<string, SuggestionChange>());
  /** Changed in the last recompute only: these rows light up once. */
  const flashing = shallowRef(new Set<string>());

  const names = computed<SortingNames>(() => sortingNames(t));

  function state(): SortingState {
    return {
      rules: memory.rules.value,
      rejected: memory.rejected.value,
      ignored: memory.ignored.value,
      options: options.value,
      choices: choices.value,
      excluded: excluded.value,
      groupNames: groupNames.value,
      areaParent: memory.areaParent.value,
    };
  }

  /** Recomputes after a tick or a choice; the order of the list stays. */
  function recompute(actedOn: string | null = null): void {
    if (!home.value) return;

    const before = computation.value;
    const next = computeSorting({
      home: home.value,
      state: state(),
      names: names.value,
      previous: before,
      layout: layout.value,
    });
    const changed = before ? suggestionChanges({ before, after: next, actedOn }) : new Map();

    computation.value = next;
    flashing.value = new Set(changed.keys());
    changes.value = new Map([...changes.value, ...changed]);
  }

  /** Orders the list anew: groups, sections and pre-ticks (what the user touched stays). */
  function reorder(): void {
    if (!home.value) return;

    // Twice: ticks from the first pass teach the second (like a tick by the user would).
    for (let pass = 0; pass < 2; pass++) {
      computation.value = computeSorting({
        home: home.value,
        state: state(),
        names: names.value,
        previous: computation.value,
        layout: layout.value,
      });
      layout.value = layoutSorting({
        computation: computation.value,
        home: home.value,
        names: names.value,
      });
      choices.value = pretick({
        computation: computation.value,
        layout: layout.value,
        state: state(),
      });
    }
    // Once more with the final ticks, so the first tick of the user changes only what it causes.
    computation.value = computeSorting({
      home: home.value,
      state: state(),
      names: names.value,
      previous: computation.value,
      layout: layout.value,
    });
    changes.value = new Map();
    flashing.value = new Set();
  }

  async function load(): Promise<void> {
    isLoading.value = true;
    loadError.value = null;

    try {
      const context = await loadSortingContext();
      home.value = buildSortingHome(context);
      memory.takeLoaded(context.memory);
      computation.value = null;
      layout.value = null;
      reorder();
    } catch (error) {
      loadError.value = error;
    } finally {
      isLoading.value = false;
    }
  }

  function open(): void {
    isOpen.value = true;
    step.value = SORTING_STEP.overview;
    choices.value = new Map();
    excluded.value = new Set();
    visibility.resetView();
    groupNames.value = new Map();
    void load();
  }

  function close(): void {
    isOpen.value = false;
    visibility.sheetGroupKey.value = null;
    home.value = null;
    computation.value = null;
    layout.value = null;
  }

  function goTo(next: SortingStep): void {
    // Rules and options change the groups: order the list anew when the suggestions come up.
    const isEnteringSuggestions =
      next === SORTING_STEP.suggestions && step.value !== SORTING_STEP.suggestions;
    if (isEnteringSuggestions || next === SORTING_STEP.overview) reorder();
    step.value = next;
  }

  /** Rules and the memory changed in step 1 or 2: compute and order at once. */
  function settingsChanged(): void {
    if (step.value === SORTING_STEP.suggestions) recompute();
    else reorder();
  }

  // ---- ticks and choices in this visit ------------------------------------------------------

  function setChoice({ key, choice }: { key: string; choice: BundleChoice }): void {
    choices.value = new Map(choices.value).set(key, choice);
    recompute(key);
  }

  function tick({ key, isOn }: { key: string; isOn: boolean }): void {
    setChoice({ key, choice: { ...choices.value.get(key), isOn, isTouched: true } });
  }

  /** A whole group at once, with one recompute. */
  function tickMany({ keys, isOn }: { keys: string[]; isOn: boolean }): void {
    const next = new Map(choices.value);
    keys.forEach((key) => next.set(key, { ...next.get(key), isOn, isTouched: true }));
    choices.value = next;
    recompute();
  }

  /** A folder the user picked themselves: ticks the bundle and teaches twice. */
  function pick({ key, target }: { key: string; target: string }): void {
    setChoice({ key, choice: { isOn: true, isTouched: true, target } });
  }

  async function reject({ key, path }: { key: string; path: string }): Promise<void> {
    const next = new Map(memory.rejected.value);
    next.set(key, new Set([...(next.get(key) ?? []), path]));
    memory.rejected.value = next;
    choices.value = new Map(choices.value).set(key, { isOn: false, isTouched: true });
    recompute();
    await memory.saveMemory();
  }

  function toggleExcluded(entityId: string): void {
    const next = new Set(excluded.value);
    if (!next.delete(entityId)) next.add(entityId);
    excluded.value = next;
  }

  function renameGroup({ key, name }: { key: string; name: string }): void {
    groupNames.value = new Map(groupNames.value).set(key, name);
    recompute();
  }

  function setOptions(next: Partial<SortingOptions>): void {
    options.value = { ...options.value, ...next };
    settingsChanged();
  }

  // ---- what applying would do, and which rows show ------------------------------------------

  const moves = computed(() =>
    home.value && computation.value && layout.value
      ? collectMoves({
          home: home.value,
          state: state(),
          computation: computation.value,
          layout: layout.value,
        })
      : [],
  );
  const tickedCount = computed(
    () =>
      [...choices.value].filter(
        ([key, choice]) => choice.isOn && computation.value?.bundles.has(key),
      ).length,
  );
  const visibility = createSortingVisibility({ computation, choices, moves });

  return {
    isOpen,
    isLoading,
    loadError,
    step,
    home,
    lastRun: memory.lastRun,
    rules: memory.rules,
    rejected: memory.rejected,
    ignored: memory.ignored,
    options,
    choices,
    excluded,
    groupNames,
    areaParent: memory.areaParent,
    setAreaParent: memory.setAreaParent,
    computation,
    layout,
    changes,
    flashing,
    sheetGroupKey: visibility.sheetGroupKey,
    filters: visibility.filters,
    query: visibility.query,
    names,
    moves,
    tickedCount,
    state,
    open,
    close,
    load,
    goTo,
    reorder,
    tick,
    tickMany,
    pick,
    reject,
    setIgnored: memory.setIgnored,
    toggleExcluded,
    renameGroup,
    setRules: memory.setRules,
    resetRejected: memory.resetRejected,
    resetIgnored: memory.resetIgnored,
    setOptions,
    confidenceOf: visibility.confidenceOf,
    isVisible: visibility.isVisible,
    hiddenMoveCount: visibility.hiddenMoveCount,
  };
});
