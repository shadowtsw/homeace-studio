import type { CategoryScope } from "../categories.constants";
import {
  findCleanupProposals,
  planCleanup,
  type ScopeAssignments,
  type ScopeCategories,
} from "./cleanup-analysis";

type Seed = Partial<Record<CategoryScope, Record<string, string[]>>>;

/** Categories and assignments per scope from `{ automation: { "Büro - Licht": ["a.1"] } }`. */
function state(seed: Seed): { categories: ScopeCategories; assignments: ScopeAssignments } {
  const categories = {
    automation: [],
    script: [],
    scene: [],
    helpers: [],
    homeace_entities: [],
  } as ScopeCategories;
  const assignments: ScopeAssignments = {
    automation: new Map(),
    script: new Map(),
    scene: new Map(),
    helpers: new Map(),
    homeace_entities: new Map(),
  };
  let nextId = 1;

  for (const [scope, names] of Object.entries(seed) as [
    CategoryScope,
    Record<string, string[]>,
  ][]) {
    for (const [name, entityIds] of Object.entries(names)) {
      const categoryId = `c${nextId++}`;
      categories[scope].push({ categoryId, name });
      assignments[scope].set(categoryId, entityIds);
    }
  }

  return { categories, assignments };
}

describe("clean-up analysis", () => {
  it("proposes subfolders for dash names and tells certain from uncertain", () => {
    const { categories, assignments } = state({
      automation: { "Büro - Heizung": ["automation.a", "automation.b"], "Haus/Terrasse": [] },
      helpers: { "Büro-Heizung": ["input_number.x"], "Klima-Sensoren": ["sensor.y"] },
    });

    const proposals = findCleanupProposals(categories, assignments, new Set());

    expect(proposals).toEqual([
      expect.objectContaining({
        key: "split:Büro - Heizung",
        to: "Büro/Heizung",
        isCertain: true,
        counts: { automation: 2 },
      }),
      expect.objectContaining({ key: "split:Büro-Heizung", to: "Büro/Heizung", isCertain: false }),
      expect.objectContaining({ key: "split:Klima-Sensoren", isCertain: false }),
    ]);
  });

  it("proposes merging near-duplicates, named after the bigger one, and skips hidden ones", () => {
    const { categories, assignments } = state({
      script: { Routine: ["script.a"], Routinen: ["script.b", "script.c"], Bad: [], Bade: [] },
    });

    expect(findCleanupProposals(categories, assignments, new Set())).toEqual([
      expect.objectContaining({ kind: "merge", names: ["Routine", "Routinen"], to: "Routinen" }),
    ]);
    expect(
      findCleanupProposals(categories, assignments, new Set(["merge:Routine|Routinen"])),
    ).toEqual([]);
  });

  it("groups singular and plural forms, also in English, and skips empty categories", () => {
    const { categories, assignments } = state({
      script: {
        Routine: ["script.a"],
        Routines: ["script.b"],
        Routinen: ["script.c"],
        Garage: ["script.d"],
        Garten: ["script.e"],
        "Büro - Alt": [],
      },
    });

    // "Büro - Alt" is empty: HA keeps it, but the tree does not show it, so it is not proposed.
    const merges = findCleanupProposals(categories, assignments, new Set());

    expect(merges).toEqual([
      expect.objectContaining({ names: ["Routine", "Routinen", "Routines"] }),
    ]);
  });

  it("renames where the name is free and merges where it is taken, per scope", () => {
    const { categories, assignments } = state({
      automation: { "Haus - Personen": ["automation.a"], "Haus-Personen": ["automation.b"] },
      helpers: { "Haus-Personen": ["input_boolean.c"] },
    });

    const steps = planCleanup(
      [
        { from: "Haus - Personen", to: "Haus/Personen" },
        { from: "Haus-Personen", to: "Haus/Personen" },
      ],
      categories,
      assignments,
    );

    expect(steps.map(({ scope, kind, from }) => `${scope} ${kind} ${from}`)).toEqual([
      "automation rename Haus - Personen",
      "automation merge Haus-Personen",
      "helpers rename Haus-Personen",
    ]);
    expect(steps[1]).toMatchObject({
      targetCategoryId: steps[0].categoryId,
      entityIds: ["automation.b"],
    });
  });
});
