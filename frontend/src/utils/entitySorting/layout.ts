import { GROUP_MIN_BUNDLES, GROUP_MIN_ENTITIES, HUB_INTEGRATIONS } from "./constants";
import { areaFolder, type SortingHome } from "./home";
import type {
  BundleChoice,
  Confidence,
  GroupOrigin,
  SortingBundle,
  SortingComputation,
  SortingGroup,
  SortingLayout,
  SortingNames,
  SortingState,
} from "./model";

const CONFIDENCE_RANK: Record<Confidence, number> = { unclear: 0, likely: 1, sure: 2, rule: 3 };
/** How much a group's entities count when ordering: sure groups first, unclear ones last. */
const IMPACT: Record<Confidence, number> = { rule: 1, sure: 1, likely: 0.6, unclear: 0.3 };

export function confidenceRank(confidence: Confidence): number {
  return CONFIDENCE_RANK[confidence];
}

type Stage = {
  keyOf: (bundle: SortingBundle) => string | null;
  /** The group for a bucket; `path` is the folder it proposes. */
  groupFor: (
    key: string,
    bundles: SortingBundle[],
  ) => { key: string; type: "folder" | "new"; path: string; origin: GroupOrigin };
};

/**
 * Orders the proposals into groups by target folder, in four sections: existing folders, new
 * folders, system, and the rest. What no hint explains well goes through four stages that look for
 * bundles belonging together: same area, same first word, same integration (not a hub), same device
 * class. A stage only makes a group of GROUP_MIN_BUNDLES bundles or GROUP_MIN_ENTITIES entities.
 */
export function layoutSorting(input: {
  computation: SortingComputation;
  home: SortingHome;
  names: SortingNames;
}): SortingLayout {
  const { computation, home, names } = input;
  const groups = new Map<string, SortingGroup>();
  const groupOf = new Map<string, SortingGroup>();
  const ensure = (
    key: string,
    type: SortingGroup["type"],
    target: string | null,
    origin: GroupOrigin | null,
  ): SortingGroup => {
    const group = groups.get(key) ?? { key, type, target, origin, bundles: [] };
    groups.set(key, group);
    return group;
  };
  const put = (group: SortingGroup, bundle: SortingBundle): void => {
    group.bundles.push(bundle);
    groupOf.set(bundle.key, group);
  };
  const folderGroup = (path: string): SortingGroup =>
    ensure(`folder:${path}`, "folder", path, null);
  const newGroup = (key: string, path: string, origin: GroupOrigin): SortingGroup =>
    ensure(key, "new", path, origin);

  let unclear: SortingBundle[] = [];

  for (const bundle of computation.bundles.values()) {
    const suggestion = computation.suggestions.get(bundle.key);
    if (!suggestion) continue;

    if (bundle.isSystem && suggestion.confidence !== "rule") {
      put(ensure("system", "system", null, null), bundle);
    } else if (suggestion.confidence !== "unclear" && suggestion.target) {
      const origin: GroupOrigin =
        suggestion.ruleNumber !== null
          ? { kind: "rule", ruleNumber: suggestion.ruleNumber }
          : { kind: "area" };
      const target = suggestion.target;
      put(
        suggestion.isNew ? newGroup(`new:${target}`, target, origin) : folderGroup(target),
        bundle,
      );
    } else {
      unclear.push(bundle);
    }
  }

  const stages: Stage[] = [
    {
      keyOf: (bundle) => {
        const area = bundle.areaId ? home.areas.get(bundle.areaId) : undefined;
        return area ? areaFolder(area, computation.folders, computation.areaPattern).path : null;
      },
      groupFor: (path) => ({
        key: computation.folders.has(path) ? `folder:${path}` : `new:${path}`,
        type: computation.folders.has(path) ? "folder" : "new",
        path,
        origin: { kind: "area" },
      }),
    },
    {
      keyOf: (bundle) => [...bundle.words.keys()][0] ?? null,
      groupFor: (word, bundles) => ({
        key: `name:${word}`,
        type: "new",
        path: (bundles[0]?.name ?? word).split(" ")[0] ?? word,
        origin: { kind: "name" },
      }),
    },
    {
      keyOf: (bundle) =>
        bundle.integration && !HUB_INTEGRATIONS.has(bundle.integration) ? bundle.integration : null,
      groupFor: (integration) => ({
        key: `integration:${integration}`,
        type: "new",
        path: home.context.integrations[integration] ?? integration,
        origin: { kind: "integration" },
      }),
    },
    {
      keyOf: (bundle) => {
        const deviceClass = bundle.main.deviceClass;
        return deviceClass && names.deviceClasses[deviceClass] ? deviceClass : null;
      },
      groupFor: (deviceClass) => ({
        key: `deviceClass:${deviceClass}`,
        type: "new",
        path: names.deviceClasses[deviceClass] ?? deviceClass,
        origin: { kind: "deviceClass" },
      }),
    },
  ];

  for (const stage of stages) {
    const buckets = new Map<string, SortingBundle[]>();
    unclear.forEach((bundle) => {
      const key = stage.keyOf(bundle);
      if (key) buckets.set(key, [...(buckets.get(key) ?? []), bundle]);
    });

    const grouped = new Set<SortingBundle>();
    buckets.forEach((bundles, key) => {
      const spec = stage.groupFor(key, bundles);
      const entityCount = bundles.reduce((sum, bundle) => sum + bundle.entities.length, 0);
      const isBigEnough = bundles.length >= GROUP_MIN_BUNDLES || entityCount >= GROUP_MIN_ENTITIES;

      if (!isBigEnough && !groups.has(spec.key)) return;

      const group =
        spec.type === "folder"
          ? folderGroup(spec.path)
          : newGroup(spec.key, spec.path, spec.origin);
      bundles.forEach((bundle) => {
        put(group, bundle);
        grouped.add(bundle);
      });
    });
    unclear = unclear.filter((bundle) => !grouped.has(bundle));
  }

  unclear.forEach((bundle) => put(ensure("rest", "rest", null, null), bundle));

  const confidenceOf = (bundle: SortingBundle): Confidence =>
    computation.suggestions.get(bundle.key)?.confidence ?? "unclear";
  const impact = (group: SortingGroup): number =>
    group.bundles.reduce(
      (sum, bundle) => sum + bundle.entities.length * IMPACT[confidenceOf(bundle)],
      0,
    );
  const all = [...groups.values()];

  all.forEach((group) =>
    group.bundles.sort(
      (first, second) =>
        CONFIDENCE_RANK[confidenceOf(second)] - CONFIDENCE_RANK[confidenceOf(first)] ||
        second.entities.length - first.entities.length ||
        first.name.localeCompare(second.name),
    ),
  );

  const byImpact = (first: SortingGroup, second: SortingGroup): number =>
    impact(second) - impact(first);

  return {
    folder: all.filter((group) => group.type === "folder").sort(byImpact),
    fresh: all.filter((group) => group.type === "new").sort(byImpact),
    system: groups.get("system") ?? null,
    rest: groups.get("rest") ?? null,
    groupOf,
  };
}

/**
 * Ticks for a new layout: what the user touched stays, the rest is ticked when a rule decides or
 * when it is sure and goes into an existing folder. New folders are never pre-ticked.
 */
export function pretick(input: {
  computation: SortingComputation;
  layout: SortingLayout;
  state: SortingState;
}): Map<string, BundleChoice> {
  const { computation, layout, state } = input;
  // Choices of bundles that left (applied, kept out) go with them.
  const choices = new Map([...state.choices].filter(([key]) => computation.bundles.has(key)));

  computation.bundles.forEach((bundle) => {
    if (choices.get(bundle.key)?.isTouched) return;

    const suggestion = computation.suggestions.get(bundle.key);
    const group = layout.groupOf.get(bundle.key);
    const isOn =
      suggestion?.confidence === "rule" ||
      (suggestion?.confidence === "sure" && group?.type === "folder");

    choices.set(bundle.key, { isOn, isTouched: false });
  });

  return choices;
}
