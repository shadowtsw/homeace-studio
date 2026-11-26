import { defineStore } from "pinia";
import { computed, ref, shallowRef } from "vue";

import { i18n } from "@/i18n";
import { loadSortingContext, saveSortingMemory } from "@/services/entitySortingService";
import type { EntitySortingMemory, SortingRule } from "@/types/entitySorting";
import { collectMoves, computeSorting, suggestionChanges } from "@/utils/entitySorting/compute";
import { buildSortingHome, type SortingHome } from "@/utils/entitySorting/home";
import { layoutSorting, pretick } from "@/utils/entitySorting/layout";
import type {
  BundleChoice,
  Confidence,
  SortingBundle,
  SortingComputation,
  SortingLayout,
  SortingNames,
  SortingOptions,
  SortingState,
  SuggestionChange,
} from "@/utils/entitySorting/model";

export const SORTING_STEP = { overview: 1, rules: 2, suggestions: 3, apply: 4, result: 5 } as const;
export type SortingStep = (typeof SORTING_STEP)[keyof typeof SORTING_STEP];

const DEFAULT_FILTERS: Record<Confidence, boolean> = {
  rule: true,
  sure: true,
  likely: false,
  unclear: false,
};

const DEFAULT_OPTIONS: SortingOptions = {
  includeHidden: false,
  isTechnicalSeparate: false,
  technicalFolder: "Technik/Diagnose",
  isResortingSorted: false,
};

/**
 * The tool "Entitäten einsortieren" for one visit: the loaded home, the memory (rules, turned-down
 * folders, kept-out bundles, saved in the overlay), the user's ticks and the engine's results.
 * The engine is pure (utils/entitySorting); this store only feeds it and keeps what it returned.
 */
export const useEntitySortingStore = defineStore("entitySorting", () => {
  const t = i18n.global.t;

  const isOpen = ref(false);
  const isLoading = ref(false);
  const loadError = ref<unknown>(null);
  const step = ref<SortingStep>(SORTING_STEP.overview);
  const home = shallowRef<SortingHome | null>(null);
  const lastRun = ref<EntitySortingMemory["lastRun"]>(null);

  const rules = ref<SortingRule[]>([]);
  const rejected = ref(new Map<string, Set<string>>());
  const ignored = ref(new Set<string>());
  const options = ref<SortingOptions>({ ...DEFAULT_OPTIONS });
  const choices = ref(new Map<string, BundleChoice>());
  const excluded = ref(new Set<string>());
  const groupNames = ref(new Map<string, string>());
  /** Where new area folders go; null lets the tool pick from the existing folders. */
  const areaParent = ref<string | null>(null);

  const computation = shallowRef<SortingComputation | null>(null);
  const layout = shallowRef<SortingLayout | null>(null);
  /** Changes since the list was last ordered; rows stay where they are and show them. */
  const changes = shallowRef(new Map<string, SuggestionChange>());
  /** On a phone a group opens as a sheet from below; its key while open. */
  const sheetGroupKey = ref<string | null>(null);
  /** What is pre-ticked shows by default; the rest is one click away (owner's wish, test9). */
  const filters = ref<Record<Confidence, boolean>>({ ...DEFAULT_FILTERS });
  const query = ref("");
  /** Changed in the last recompute only: these rows light up once. */
  const flashing = shallowRef(new Set<string>());

  const names = computed<SortingNames>(() => ({
    system: t("entitySorting.names.system"),
    systemKinds: {
      sun: t("entitySorting.names.sun"),
      zone: t("entitySorting.names.zone"),
      person: t("entitySorting.names.person"),
      weather: t("entitySorting.names.weather"),
      update: t("entitySorting.names.update"),
      backup: t("entitySorting.names.backup"),
    },
    deviceClasses: {
      smoke: t("entitySorting.names.smoke"),
      battery: t("entitySorting.names.battery"),
      moisture: t("entitySorting.names.moisture"),
      window: t("entitySorting.names.window"),
      door: t("entitySorting.names.door"),
      motion: t("entitySorting.names.motion"),
    },
  }));

  function state(): SortingState {
    return {
      rules: rules.value,
      rejected: rejected.value,
      ignored: ignored.value,
      options: options.value,
      choices: choices.value,
      excluded: excluded.value,
      groupNames: groupNames.value,
      areaParent: areaParent.value,
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
    const changed = before ? suggestionChanges(before, next, actedOn) : new Map();

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
      rules.value = context.memory.rules;
      rejected.value = new Map(
        context.memory.rejected.map((item) => [item.bundleKey, new Set(item.paths)]),
      );
      ignored.value = new Set(context.memory.ignored);
      areaParent.value = context.memory.areaParent ?? null;
      lastRun.value = context.memory.lastRun;
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
    filters.value = { ...DEFAULT_FILTERS };
    query.value = "";
    groupNames.value = new Map();
    void load();
  }

  function close(): void {
    isOpen.value = false;
    sheetGroupKey.value = null;
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

  async function saveMemory(): Promise<void> {
    await saveSortingMemory({
      rules: rules.value,
      rejected: [...rejected.value].map(([bundleKey, paths]) => ({ bundleKey, paths: [...paths] })),
      ignored: [...ignored.value],
      areaParent: areaParent.value,
    });
  }

  function setChoice(key: string, choice: BundleChoice): void {
    choices.value = new Map(choices.value).set(key, choice);
    recompute(key);
  }

  function tick(key: string, isOn: boolean): void {
    setChoice(key, { ...choices.value.get(key), isOn, isTouched: true });
  }

  /** A whole group at once, with one recompute. */
  function tickMany(keys: string[], isOn: boolean): void {
    const next = new Map(choices.value);
    keys.forEach((key) => next.set(key, { ...next.get(key), isOn, isTouched: true }));
    choices.value = next;
    recompute();
  }

  /** A folder the user picked themselves: ticks the bundle and teaches twice. */
  function pick(key: string, target: string): void {
    setChoice(key, { isOn: true, isTouched: true, target });
  }

  async function reject(key: string, path: string): Promise<void> {
    const next = new Map(rejected.value);
    next.set(key, new Set([...(next.get(key) ?? []), path]));
    rejected.value = next;
    choices.value = new Map(choices.value).set(key, { isOn: false, isTouched: true });
    recompute();
    await saveMemory();
  }

  async function setIgnored(key: string, isIgnored: boolean): Promise<void> {
    const next = new Set(ignored.value);
    if (isIgnored) next.add(key);
    else next.delete(key);
    ignored.value = next;
    settingsChanged();
    await saveMemory();
  }

  function toggleExcluded(entityId: string): void {
    const next = new Set(excluded.value);
    if (!next.delete(entityId)) next.add(entityId);
    excluded.value = next;
  }

  function renameGroup(key: string, name: string): void {
    groupNames.value = new Map(groupNames.value).set(key, name);
    recompute();
  }

  async function setRules(next: SortingRule[]): Promise<void> {
    rules.value = next;
    settingsChanged();
    await saveMemory();
  }

  /** Where new area folders go; kept for all users like the rules. */
  async function setAreaParent(parent: string | null): Promise<void> {
    areaParent.value = parent;
    settingsChanged();
    await saveMemory();
  }

  async function resetRejected(): Promise<void> {
    rejected.value = new Map();
    settingsChanged();
    await saveMemory();
  }

  async function resetIgnored(): Promise<void> {
    ignored.value = new Set();
    settingsChanged();
    await saveMemory();
  }

  function setOptions(next: Partial<SortingOptions>): void {
    options.value = { ...options.value, ...next };
    settingsChanged();
  }

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

  function confidenceOf(key: string): Confidence {
    return computation.value?.suggestions.get(key)?.confidence ?? "unclear";
  }

  /** A row shows when it is ticked or matches the filters, and when it matches the search. */
  function isVisible(bundle: SortingBundle): boolean {
    if (!computation.value?.bundles.has(bundle.key)) return false;

    // Ticked rows always show: what is applied is always in sight. Filters add the rest.
    const choice = choices.value.get(bundle.key);
    const isShownAnyway = !!choice?.target || !!choice?.isOn;
    if (!isShownAnyway && !filters.value[confidenceOf(bundle.key)]) return false;

    const needle = query.value.trim().toLowerCase();
    return (
      !needle ||
      bundle.name.toLowerCase().includes(needle) ||
      bundle.entities.some((entity) => entity.name.toLowerCase().includes(needle))
    );
  }

  /** Entities that would be applied although their row is filtered out. */
  const hiddenMoveCount = computed(() => {
    const hidden = new Set(
      [...(computation.value?.bundles.values() ?? [])]
        .filter((bundle) => !isVisible(bundle))
        .flatMap((bundle) => bundle.entities.map((entity) => entity.entityId)),
    );

    return moves.value.filter((move) => hidden.has(move.entityId)).length;
  });

  return {
    isOpen,
    isLoading,
    loadError,
    step,
    home,
    lastRun,
    rules,
    rejected,
    ignored,
    options,
    choices,
    excluded,
    groupNames,
    areaParent,
    setAreaParent,
    computation,
    layout,
    changes,
    flashing,
    sheetGroupKey,
    filters,
    query,
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
    setIgnored,
    toggleExcluded,
    renameGroup,
    setRules,
    resetRejected,
    resetIgnored,
    setOptions,
    confidenceOf,
    isVisible,
    hiddenMoveCount,
  };
});
