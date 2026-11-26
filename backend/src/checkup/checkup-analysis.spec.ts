import type { Entry } from "../entries/entry.model";
import type { HaState } from "../ha/ha.types";
import { analyzeCheckup, collectEntityRefs, createdTimes } from "./checkup-analysis";

function entry(entityId: string, overrides: Partial<Entry> = {}): Entry {
  const domain = entityId.split(".")[0];

  return {
    entityId,
    kind: domain === "automation" || domain === "script" ? domain : "helper",
    domain,
    name: entityId,
    icon: null,
    categoryId: null,
    categoryPath: null,
    labels: [],
    area: null,
    state: "on",
    isDisabled: false,
    isHidden: false,
    isInRegistry: true,
    isFavorite: false,
    note: null,
    ...overrides,
  };
}

function state(entityId: string, value = "on", extra: Partial<HaState> = {}): HaState {
  return { entity_id: entityId, state: value, attributes: { friendly_name: entityId }, ...extra };
}

const NOW = new Date("2026-11-20T12:00:00Z");

describe("check-up", () => {
  it("collects entity IDs from triggers, targets, lists and direct script calls", () => {
    const refs = collectEntityRefs({
      triggers: [{ trigger: "state", entity_id: ["binary_sensor.a", "binary_sensor.b"] }],
      actions: [
        { action: "light.turn_on", target: { entity_id: "light.c, light.d" } },
        { action: "script.good_night" },
        { action: "script.turn_on", target: { entity_id: "script.other" } },
        { condition: "template", value_template: "{{ is_state('sensor.e', 'on') }}" },
        { entity_id: "{{ trigger.entity_id }}" },
      ],
    });

    expect([...refs].sort()).toEqual([
      "binary_sensor.a",
      "binary_sensor.b",
      "light.c",
      "light.d",
      "script.good_night",
      "script.other",
    ]);
  });

  it("reports gone and unavailable references, unused helpers and idle automations", () => {
    const findings = analyzeCheckup({
      entries: [
        entry("automation.flur"),
        entry("automation.alt", { state: "off" }),
        entry("input_boolean.urlaub"),
        entry("input_boolean.gast"),
        entry("sensor.template_only", { kind: "helper", domain: "sensor" }),
      ],
      states: [
        state("automation.flur", "on", {
          attributes: { friendly_name: "Flur", last_triggered: "2026-11-19T10:00:00Z" },
        }),
        state("automation.alt", "off", {
          attributes: { friendly_name: "Alt", last_triggered: "2026-05-01T10:00:00Z" },
        }),
        state("sensor.akku", "unavailable", { last_changed: "2026-11-17T08:00:00Z" }),
        state("input_boolean.urlaub", "off"),
        state("input_boolean.gast", "off"),
      ],
      registryIds: new Set(["light.disabled"]),
      scriptKeys: new Set(["alter_name"]),
      configs: new Map([
        [
          "automation.flur",
          {
            triggers: [{ entity_id: "sensor.akku" }],
            conditions: [{ value_template: "{{ is_state('input_boolean.gast', 'off') }}" }],
            actions: [
              { target: { entity_id: ["light.weg", "light.disabled"] } },
              // A renamed script, called by its key: still works.
              { action: "script.alter_name" },
            ],
          },
        ],
        ["automation.alt", { actions: [] }],
      ]),
      lastRuns: new Map(),
      createdAt: new Map(),
      now: NOW,
      ignored: new Set(),
    });

    expect(findings.map((finding) => finding.key)).toEqual([
      "gone:automation.flur",
      "unavailable:automation.flur",
      "unused:input_boolean.urlaub",
      "stale:automation.alt",
    ]);
    expect(findings[0].refs.map((ref) => ref.entityId)).toEqual(["light.weg"]);
    expect(findings[1].refs[0]).toMatchObject({
      entityId: "sensor.akku",
      since: "2026-11-17T08:00:00Z",
    });
    expect(findings[3]).toMatchObject({ isOn: false, lastTriggered: "2026-05-01T10:00:00Z" });
  });

  it("counts helpers used in scenes or groups as used", () => {
    const findings = analyzeCheckup({
      entries: [entry("input_boolean.in_scene"), entry("input_boolean.in_group")],
      states: [
        state("scene.abend", "2026-11-20T10:00:00Z", {
          attributes: { entity_id: ["input_boolean.in_scene"] },
        }),
        state("group.alle", "on", { attributes: { entity_id: ["input_boolean.in_group"] } }),
      ],
      registryIds: new Set(),
      scriptKeys: new Set(),
      configs: new Map(),
      lastRuns: new Map(),
      createdAt: new Map(),
      now: NOW,
      ignored: new Set(),
    });

    expect(findings).toEqual([]);
  });

  it("leaves out ignored findings and disabled entries", () => {
    const findings = analyzeCheckup({
      entries: [entry("input_boolean.a"), entry("input_boolean.b", { isDisabled: true })],
      states: [state("input_boolean.a"), state("input_boolean.b")],
      registryIds: new Set(),
      scriptKeys: new Set(),
      configs: new Map(),
      lastRuns: new Map(),
      createdAt: new Map(),
      now: NOW,
      ignored: new Set(["unused:input_boolean.a"]),
    });

    expect(findings).toEqual([]);
  });

  it("reports a flow whose newest run failed, once per failure", () => {
    const failedRun = {
      startedAt: "2026-11-20T11:20:00Z",
      result: "error",
      error: "Entity switch.wallbox is unavailable",
    };
    const input = {
      entries: [entry("automation.pv"), entry("script.ok")],
      states: [state("automation.pv", "2026-11-20T11:20:00Z"), state("script.ok")],
      registryIds: new Set<string>(),
      scriptKeys: new Set<string>(),
      configs: new Map(),
      lastRuns: new Map<string, { startedAt: string; result: string; error: string | null }>([
        ["automation.pv", failedRun],
        ["script.ok", { startedAt: "2026-11-20T10:00:00Z", result: "finished", error: null }],
      ]),
      createdAt: new Map(),
      now: NOW,
      ignored: new Set<string>(),
    };

    const failed = (ignored: Set<string>) =>
      analyzeCheckup({ ...input, ignored }).filter((item) => item.kind === "failed");
    const [finding] = failed(new Set());
    expect(finding).toMatchObject({
      key: "failed:automation.pv:2026-11-20T11:20:00Z",
      kind: "failed",
      failedAt: "2026-11-20T11:20:00Z",
      error: "Entity switch.wallbox is unavailable",
    });
    expect(failed(new Set([finding?.key ?? ""]))).toEqual([]);
  });
  it("gives new automations and helpers time before they count as idle or unused", () => {
    const days = (count: number): number => NOW.getTime() - count * 24 * 60 * 60 * 1000;
    const findings = analyzeCheckup({
      entries: [
        entry("automation.new"),
        entry("automation.month_old"),
        entry("automation.ran_long_ago"),
        entry("input_boolean.new"),
        entry("input_boolean.week_old"),
      ],
      states: [
        state("automation.new"),
        state("automation.month_old"),
        state("automation.ran_long_ago", "on", {
          attributes: { friendly_name: "x", last_triggered: "2026-10-01T10:00:00Z" },
        }),
      ],
      registryIds: new Set(),
      scriptKeys: new Set(),
      configs: new Map(),
      lastRuns: new Map(),
      createdAt: new Map([
        ["automation.new", days(3)],
        ["automation.month_old", days(31)],
        // Created recently, but it ran 50 days ago: the run counts
        ["automation.ran_long_ago", days(1)],
        ["input_boolean.new", days(6)],
        ["input_boolean.week_old", days(8)],
      ]),
      now: NOW,
      ignored: new Set(),
    });

    expect(findings.map((finding) => finding.key)).toEqual([
      "unused:input_boolean.week_old",
      "stale:automation.month_old",
      "stale:automation.ran_long_ago",
    ]);
  });

  it("reads the creation time from the registry in milliseconds", () => {
    const times = createdTimes([
      { entity_id: "automation.a", created_at: 1_700_000_000.5 },
      { entity_id: "automation.old" },
    ]);

    expect([...times]).toEqual([["automation.a", 1_700_000_000_500]]);
  });
});
