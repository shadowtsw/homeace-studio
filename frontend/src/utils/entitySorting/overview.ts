import { bundleKeyOf } from "./bundles";
import type { SortingHome } from "./home";
import type { SortingComputation, SortingLayout, SortingState } from "./model";

/** The numbers of step 1: how 1500 entities become a few hundred decisions. */
export type SortingOverview = {
  unsorted: number;
  /** YAML without unique_id: cannot get a folder. */
  stateOnly: string[];
  hidden: number;
  ignored: number;
  offered: number;
  bundles: number;
  devices: number;
  system: number;
  single: number;
  /** Bundles per level as the list shows them now. */
  levels: { rule: number; sure: number; likely: number; fresh: number; rest: number };
};

export function sortingOverview(input: {
  home: SortingHome;
  state: SortingState;
  computation: SortingComputation;
  layout: SortingLayout;
}): SortingOverview {
  const { home, state, computation, layout } = input;
  const unsorted = home.context.entities.filter((entity) => !entity.categoryPath);
  const registered = unsorted.filter((entity) => entity.isInRegistry);
  const isIgnored = (key: string): boolean => state.ignored.has(key);
  const bundles = [...computation.bundles.values()];
  const levels = { rule: 0, sure: 0, likely: 0, fresh: 0, rest: 0 };

  for (const bundle of bundles) {
    const confidence = computation.suggestions.get(bundle.key)?.confidence ?? "unclear";
    const group = layout.groupOf.get(bundle.key);

    if (confidence === "rule") levels.rule++;
    else if (!group || group.type === "rest") levels.rest++;
    else if (group.type === "new") levels.fresh++;
    else if (confidence === "sure") levels.sure++;
    else levels.likely++;
  }

  return {
    unsorted: unsorted.length,
    stateOnly: unsorted.filter((entity) => !entity.isInRegistry).map((entity) => entity.name),
    hidden: registered.filter(
      (entity) => !isIgnored(bundleKeyOf(entity)) && (entity.isDisabled || entity.isHidden),
    ).length,
    ignored: registered.filter((entity) => isIgnored(bundleKeyOf(entity))).length,
    offered: bundles.reduce((sum, bundle) => sum + bundle.entities.length, 0),
    bundles: bundles.length,
    devices: bundles.filter((bundle) => bundle.device && !bundle.isSystem).length,
    system: bundles.filter((bundle) => bundle.isSystem).length,
    single: bundles.filter((bundle) => !bundle.device && !bundle.isSystem).length,
    levels,
  };
}
