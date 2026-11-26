import { describe, expect, it } from "vitest";

import { buildBundles } from "../entitySorting/bundles";
import {
  collectMoves,
  computeSorting,
  suggestionChanges,
  type SortingInput,
} from "../entitySorting/compute";
import { areaParents } from "../entitySorting/home";
import { layoutSorting, pretick } from "../entitySorting/layout";
import type { SortingState } from "../entitySorting/model";
import { sortingOverview } from "../entitySorting/overview";
import { fromDisplayTarget, toDisplayTarget } from "../entitySorting/placeholders";
import { ruleIdeas } from "../entitySorting/ruleIdeas";
import { ruleFor, ruleSideHits, ruleStats } from "../entitySorting/rules";
import { meaningfulWords, wordKey } from "../entitySorting/words";
import { NAMES, sampleHome, sampleState } from "./entitySortingFixture";

/** Computes, lays out and pre-ticks like the tool does when it opens. */
function open(state: SortingState = sampleState()) {
  const home = sampleHome();
  const input: SortingInput = { home, state, names: NAMES, previous: null, layout: null };
  let computation = computeSorting(input);
  let layout = layoutSorting({ computation, home, names: NAMES });
  state.choices = pretick({ computation, layout, state });
  computation = computeSorting({ ...input, previous: computation, layout });
  layout = layoutSorting({ computation, home, names: NAMES });
  state.choices = pretick({ computation, layout, state });

  return { home, state, computation, layout };
}

const keyOfDevice = (name: string, opened: ReturnType<typeof open>): string =>
  [...opened.computation.bundles.values()].find((bundle) => bundle.name === name)?.key ?? "";

describe("words", () => {
  it("compares umlauts and their spelling as one word and leaves out words like sensor", () => {
    expect(wordKey("Küche")).toBe(wordKey("kueche"));
    expect([...meaningfulWords("Küche Kühlschrank Sensor 2").entries()]).toEqual([
      ["kueche", "Küche"],
      ["kuehlschrank", "Kühlschrank"],
    ]);
  });
});

describe("bundles", () => {
  it("makes one decision per device and leaves out YAML, disabled and kept-out entities", () => {
    const home = sampleHome();
    const bundles = buildBundles(home, sampleState({ ignored: new Set(["entity:zone.home"]) }));

    expect(bundles.get("dKitchenMotion")?.entities.map((entity) => entity.entityId)).toEqual([
      "binary_sensor.bewegung_kueche",
      "sensor.bewegung_kueche_akku",
    ]);
    expect(bundles.get("dKitchenMotion")?.main.entityId).toBe("binary_sensor.bewegung_kueche");
    expect(bundles.has("entity:sensor.alter_zaehler")).toBe(false);
    expect(bundles.has("entity:zone.home")).toBe(false);
    expect(bundles.get("dSun")?.isSystem).toBe(true);
  });
});

describe("suggestions", () => {
  it("is sure when area and flows agree, and ends in the common parent of sibling folders", () => {
    const { computation } = open();
    const light = computation.suggestions.get("dKitchenLight");

    expect(light).toMatchObject({ target: "Haus/Küche", confidence: "sure", isNew: false });
    expect(light?.hintKinds).toEqual(expect.arrayContaining(["area", "flow"]));
  });

  it("proposes a new area folder after the pattern of the existing ones", () => {
    const { computation, layout } = open();

    expect(computation.suggestions.get("dKidsLight")).toMatchObject({
      target: "Haus/Kinderzimmer",
      isNew: true,
    });
    expect(layout.fresh.map((group) => group.target)).toContain("Haus/Kinderzimmer");
  });

  it("learns from ticked bundles: a device without area follows its word", () => {
    const { computation } = open();

    expect(computation.suggestions.get("dFridge")).toMatchObject({
      target: "Haus/Küche",
      confidence: "likely",
    });
    expect(computation.suggestions.get("dFridge")?.reasons[0]).toMatchObject({
      kind: "similar",
      word: "Küche",
    });
  });

  it("does not let an entity used everywhere vote", () => {
    const { computation } = open();
    const anyoneHome = computation.suggestions.get("entity:binary_sensor.jemand_zuhause");

    expect(anyoneHome).toMatchObject({ target: null, isUsedEverywhere: true });
  });

  it("a correction makes the siblings surer, and the change is reported", () => {
    const opened = open();
    const { home, state, computation, layout } = opened;
    const circuit = keyOfDevice("Wärmepumpe Heizkreis", opened);
    const water = keyOfDevice("Wärmepumpe Warmwasser", opened);

    expect(computation.suggestions.get(water)?.confidence).toBe("unclear");

    state.choices.set(circuit, { isOn: true, isTouched: true, target: "Klima" });
    const next = computeSorting({ home, state, names: NAMES, previous: computation, layout });

    expect(next.suggestions.get(water)).toMatchObject({ target: "Klima", confidence: "likely" });
    expect(suggestionChanges(computation, next, circuit).get(water)).toBe("surer");
  });

  it("never proposes a turned-down folder again", () => {
    const state = sampleState({ rejected: new Map([["dKitchenLight", new Set(["Haus/Küche"])]]) });
    const { computation } = open(state);

    expect(computation.suggestions.get("dKitchenLight")?.target).toBe("System/Zentral");
  });
});

describe("rules", () => {
  it("beat every hint, fill {area}, and the more specific rule wins", () => {
    const state = sampleState({
      rules: [
        { conditions: [{ type: "label", value: "Licht" }], target: "Licht/{area}" },
        {
          conditions: [
            { type: "label", value: "Licht" },
            { type: "area", value: "kinderzimmer" },
          ],
          target: "Kinder",
        },
      ],
    });
    const { home, computation } = open(state);
    const kidsLight = home.entities.get("light.deckenlicht_kinderzimmer");

    expect(computation.suggestions.get("dKitchenLight")).toMatchObject({
      target: "Licht/Küche",
      confidence: "rule",
    });
    expect(kidsLight && ruleFor(kidsLight, state.rules, home)).toEqual({
      ruleNumber: 2,
      target: "Kinder",
      isConflict: true,
    });
  });

  it("leave an entity alone when a placeholder has nothing to fill, and say so in the stats", () => {
    const home = sampleHome();
    const rule = {
      conditions: [{ type: "integration" as const, value: "shelly" }],
      target: "{area}/Strom",
    };
    const entities = [...home.entities.values()];

    expect(ruleStats(rule, 0, [rule], entities, home)).toEqual({
      matches: 0,
      withoutArea: 2,
      lost: 0,
    });
  });

  it("move one entity of a bundle on its own; technical ones can go separately", () => {
    const state = sampleState({
      rules: [{ conditions: [{ type: "domain", value: "update" }], target: "Technik/Updates" }],
      options: { ...sampleState().options, isTechnicalSeparate: true },
    });
    const opened = open(state);
    const fridge = keyOfDevice("Küche Kühlschrank", opened);
    opened.state.choices.set(fridge, { isOn: true, isTouched: true });

    const moves = collectMoves(opened);

    expect(moves).toEqual(
      expect.arrayContaining([
        { entityId: "switch.kuehlschrank", categoryPath: "Haus/Küche" },
        { entityId: "update.kuehlschrank_firmware", categoryPath: "Technik/Updates" },
        { entityId: "sensor.bewegung_kueche_akku", categoryPath: "Technik/Diagnose" },
      ]),
    );
  });
});

describe("technical folder", () => {
  it("still works with a slash too many", () => {
    const state = sampleState({
      options: {
        ...sampleState().options,
        isTechnicalSeparate: true,
        technicalFolder: "Technik/ ",
      },
    });
    const opened = open(state);

    expect(collectMoves(opened)).toContainEqual({
      entityId: "sensor.bewegung_kueche_akku",
      categoryPath: "Technik",
    });
  });
});

describe("rule side hits", () => {
  it("say when a rule matches a helper (not sorted by the tool) or a sorted entity", () => {
    const home = sampleHome();
    const rule = {
      conditions: [
        { type: "nameContains" as const, value: "taster" },
        { type: "nameContains" as const, value: "kinderzimmer" },
      ],
      target: "Kinderzimmer/Taster",
    };

    expect(ruleSideHits(rule, home, false)).toEqual({ entries: 1, sorted: 0 });
  });
});

describe("layout", () => {
  it("groups the rest by name, integration (no hubs) and device class, and pre-ticks only sure ones", () => {
    const { layout, state } = open();
    const fresh = new Map(
      layout.fresh.map((group) => [group.target, group.bundles.map((b) => b.name)]),
    );

    expect(fresh.get("Google Cast")).toHaveLength(3);
    expect(fresh.get("Rauchmelder")).toHaveLength(3);
    expect(fresh.has("MQTT")).toBe(false);
    expect(layout.system?.bundles.map((bundle) => bundle.key)).toEqual(
      expect.arrayContaining(["dSun", "entity:zone.home"]),
    );
    expect(state.choices.get("dKitchenLight")?.isOn).toBe(true);
    expect(state.choices.get("dKidsLight")?.isOn).toBe(false);
    expect(state.choices.get("dSun")?.isOn).toBe(false);
  });

  it("keeps the user's own ticks when the list is ordered again", () => {
    const opened = open();
    opened.state.choices.set("dKitchenLight", { isOn: false, isTouched: true });

    const choices = pretick(opened);

    expect(choices.get("dKitchenLight")?.isOn).toBe(false);
  });
});

describe("placeholders", () => {
  const words = { area: "Bereich", floor: "Etage" };

  it("show {area} in the UI language and read it back, case-insensitive", () => {
    expect(toDisplayTarget("Licht/{area}/{floor}", words)).toBe("Licht/{Bereich}/{Etage}");
    expect(fromDisplayTarget(" Licht / {bereich} ", words)).toBe("Licht/{area}");
  });
});

describe("rule ideas and overview", () => {
  it("suggest a rule for a label on many entities only when there is none yet", () => {
    const opened = open();
    const many = { ...opened.home, context: { ...opened.home.context } };
    const ideas = ruleIdeas({ home: many, computation: opened.computation, rules: [] });

    expect(ideas.map((idea) => idea.target)).toContain("Google Cast");
    expect(
      ruleIdeas({
        home: many,
        computation: opened.computation,
        rules: [{ conditions: [{ type: "integration", value: "cast" }], target: "Medien" }],
      }).map((idea) => idea.target),
    ).not.toContain("Google Cast");
  });

  it("counts how the pile shrinks", () => {
    const opened = open();
    const overview = sortingOverview(opened);

    expect(overview.stateOnly).toEqual(["Alter Zähler"]);
    expect(overview.hidden).toBe(1);
    expect(overview.bundles).toBe(opened.computation.bundles.size);
    expect(overview.devices + overview.system + overview.single).toBe(overview.bundles);
  });
});

describe("area folders", () => {
  it("ignore folders with scenes only when learning where area folders go", () => {
    const opened = open();

    expect(areaParents(opened.home, opened.computation.folders)[0]).toEqual({
      parent: "Haus",
      count: 2,
    });
    expect(opened.computation.suggestions.get("dKidsLight")?.target).toBe("Haus/Kinderzimmer");
  });

  it("are never sure while they do not exist", () => {
    const { computation } = open();

    expect(computation.suggestions.get("dKidsLight")).toMatchObject({
      isNew: true,
      confidence: "likely",
    });
  });

  it("go where the user says, the top level too", () => {
    const { computation } = open(sampleState({ areaParent: "" }));

    expect(computation.suggestions.get("dKidsLight")?.target).toBe("Kinderzimmer");
    expect(computation.suggestions.get("dKitchenLight")?.target).toBe("Haus/Küche");
  });

  it("count the top level when rooms lie there", () => {
    const home = sampleHome();
    const folders = new Set(["Küche", "Bad", "Haus/Kinderzimmer"]);

    expect(areaParents(home, folders)[0]).toEqual({ parent: "", count: 2 });
  });
});
