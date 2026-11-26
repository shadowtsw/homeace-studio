/**
 * Invented runs for the demo home, in the shape HA's `trace/get` answers (trace/list sends the same
 * without `trace` and `context`). Times are relative to when the demo starts.
 */

export type DemoTraceStep = {
  path: string;
  timestamp: string;
  result?: Record<string, unknown>;
  changed_variables?: Record<string, unknown>;
  error?: string;
};

export type DemoTrace = {
  domain: "automation" | "script";
  item_id: string;
  run_id: string;
  state: "running" | "stopped";
  script_execution: string | null;
  last_step: string | null;
  timestamp: { start: string; finish: string | null };
  trigger?: string;
  error?: string;
  context: { id: string; parent_id: string | null; user_id: string | null };
  trace: Record<string, DemoTraceStep[]>;
};

const MINUTE = 60_000;

type Step = [
  path: string,
  offsetSeconds: number,
  extra?: Omit<DemoTraceStep, "path" | "timestamp">,
];

type Run = {
  domain: "automation" | "script";
  itemId: string;
  /** Minutes before the demo started. */
  agoMinutes: number;
  /** Seconds the run took; null while it runs. */
  durationSeconds: number | null;
  execution: string | null;
  steps: Step[];
  trigger?: string;
  error?: string;
  userId?: string | null;
};

const stateTrigger = ({
  entityId,
  from,
  to,
}: {
  entityId: string;
  from: string;
  to: string;
}): Step => [
  "trigger/0",
  0,
  {
    changed_variables: {
      trigger: {
        id: "0",
        idx: "0",
        platform: "state",
        entity_id: entityId,
        from_state: { entity_id: entityId, state: from },
        to_state: { entity_id: entityId, state: to },
        description: `state of ${entityId}`,
      },
    },
  },
];

const numericTrigger = ({ entityId, value }: { entityId: string; value: string }): Step => [
  "trigger/0",
  0,
  {
    changed_variables: {
      trigger: {
        id: "0",
        idx: "0",
        platform: "numeric_state",
        entity_id: entityId,
        to_state: { entity_id: entityId, state: value },
        description: `numeric state of ${entityId}`,
      },
    },
  },
];

const timeTrigger: Step = [
  "trigger/0",
  0,
  {
    changed_variables: {
      trigger: { id: "0", idx: "0", platform: "time", now: "", description: "time" },
    },
  },
];

const passed = ({
  path,
  at,
  extra = {},
}: {
  path: string;
  at: number;
  extra?: Record<string, unknown>;
}): Step => [path, at, { result: { result: true, ...extra } }];
const failed = ({
  path,
  at,
  extra = {},
}: {
  path: string;
  at: number;
  extra?: Record<string, unknown>;
}): Step => [path, at, { result: { result: false, ...extra } }];
type ServiceOptions = {
  path: string;
  at: number;
  domain: string;
  name: string;
  entityId: string;
};

const service = ({ path, at, domain, name, entityId }: ServiceOptions): Step => [
  path,
  at,
  {
    result: {
      params: { domain, service: name, service_data: {}, target: { entity_id: [entityId] } },
      running_script: false,
    },
  },
];

const TERRACE = "1718034411822";
const AWNING = "1718034529301";
const GARDEN = "1719211800442";
const SOLAR = "1721300022100";

const terraceStart: Step[] = [
  stateTrigger({ entityId: "binary_sensor.terrace_motion", from: "off", to: "on" }),
  passed({ path: "condition/0", at: 0.01 }),
  passed({ path: "condition/1", at: 0.02 }),
  passed({
    path: "condition/1/entity_id/0",
    at: 0.02,
    extra: { state: "off", wanted_state: "off" },
  }),
  service({
    path: "action/0",
    at: 0.05,
    domain: "light",
    name: "turn_on",
    entityId: "light.terrace",
  }),
];

const RUNS: Run[] = [
  {
    domain: "automation",
    itemId: TERRACE,
    agoMinutes: 3,
    durationSeconds: null,
    execution: null,
    trigger: "state of binary_sensor.terrace_motion",
    steps: [...terraceStart, ["action/1", 0.06]],
  },
  {
    domain: "automation",
    itemId: TERRACE,
    agoMinutes: 41,
    durationSeconds: 245,
    execution: "cancelled",
    trigger: "state of binary_sensor.terrace_motion",
    steps: [...terraceStart, ["action/1", 0.06]],
  },
  {
    domain: "automation",
    itemId: TERRACE,
    agoMinutes: 22 * 60,
    durationSeconds: 300.4,
    execution: "finished",
    trigger: "state of binary_sensor.terrace_motion",
    steps: [
      ...terraceStart,
      ["action/1", 0.06, { result: { delay: 300, done: true } }],
      service({
        path: "action/2",
        at: 300.3,
        domain: "light",
        name: "turn_off",
        entityId: "light.terrace",
      }),
    ],
  },
  {
    domain: "automation",
    itemId: TERRACE,
    agoMinutes: 26 * 60,
    durationSeconds: 0.03,
    execution: "failed_conditions",
    trigger: "state of binary_sensor.terrace_motion",
    steps: [
      stateTrigger({ entityId: "binary_sensor.terrace_motion", from: "off", to: "on" }),
      failed({ path: "condition/0", at: 0.01 }),
    ],
  },
  {
    domain: "automation",
    itemId: AWNING,
    agoMinutes: 3 * 24 * 60,
    durationSeconds: 0,
    execution: "failed_single",
    trigger: "numeric state of sensor.wind_speed",
    steps: [numericTrigger({ entityId: "sensor.wind_speed", value: "47" })],
  },
  {
    domain: "automation",
    itemId: AWNING,
    agoMinutes: 3 * 24 * 60 + 2,
    durationSeconds: 1.2,
    execution: "finished",
    trigger: "numeric state of sensor.wind_speed",
    steps: [
      numericTrigger({ entityId: "sensor.wind_speed", value: "46" }),
      passed({ path: "condition/0", at: 0.01 }),
      passed({
        path: "condition/0/entity_id/0",
        at: 0.01,
        extra: { state: "open", wanted_state: "open" },
      }),
      service({
        path: "action/0",
        at: 0.05,
        domain: "cover",
        name: "close_cover",
        entityId: "cover.awning",
      }),
      [
        "action/1",
        1.1,
        {
          result: {
            params: { domain: "notify", service: "notify", service_data: {}, target: {} },
            running_script: false,
          },
        },
      ],
    ],
  },
  {
    domain: "automation",
    itemId: GARDEN,
    agoMinutes: 5 * 60,
    durationSeconds: 900.2,
    execution: "finished",
    trigger: "time",
    steps: [
      timeTrigger,
      service({
        path: "action/0",
        at: 0.02,
        domain: "valve",
        name: "open_valve",
        entityId: "valve.lawn_irrigation",
      }),
      ["action/1", 0.03, { result: { choice: "else" } }],
      failed({ path: "action/1/if", at: 0.03 }),
      failed({ path: "action/1/if/condition/0", at: 0.03 }),
      [
        "action/1/if/condition/0/entity_id/0",
        0.03,
        { result: { result: false, state: 34, wanted_state_below: 20 } },
      ],
      ["action/1/else/0", 0.04, { result: { delay: 900, done: true } }],
      service({
        path: "action/2",
        at: 900.1,
        domain: "valve",
        name: "close_valve",
        entityId: "valve.lawn_irrigation",
      }),
    ],
  },
  {
    domain: "automation",
    itemId: GARDEN,
    agoMinutes: 29 * 60,
    durationSeconds: 1800.2,
    execution: "finished",
    trigger: "time",
    steps: [
      timeTrigger,
      service({
        path: "action/0",
        at: 0.02,
        domain: "valve",
        name: "open_valve",
        entityId: "valve.lawn_irrigation",
      }),
      ["action/1", 0.03, { result: { choice: "then" } }],
      passed({ path: "action/1/if", at: 0.03 }),
      passed({ path: "action/1/if/condition/0", at: 0.03 }),
      [
        "action/1/if/condition/0/entity_id/0",
        0.03,
        { result: { result: true, state: 14, wanted_state_below: 20 } },
      ],
      ["action/1/then/0", 0.04, { result: { delay: 1800, done: true } }],
      service({
        path: "action/2",
        at: 1800.1,
        domain: "valve",
        name: "close_valve",
        entityId: "valve.lawn_irrigation",
      }),
    ],
  },
  {
    domain: "automation",
    itemId: SOLAR,
    agoMinutes: 95,
    durationSeconds: 0.4,
    execution: "error",
    trigger: "numeric state of sensor.solar_surplus",
    error: "Entity switch.wallbox is unavailable",
    steps: [
      numericTrigger({ entityId: "sensor.solar_surplus", value: "1840" }),
      passed({ path: "condition/0", at: 0.01 }),
      passed({
        path: "condition/0/entity_id/0",
        at: 0.01,
        extra: { state: "off", wanted_state: "off" },
      }),
      ["action/0", 0.3, { error: "Entity switch.wallbox is unavailable" }],
    ],
  },
  {
    domain: "automation",
    itemId: SOLAR,
    agoMinutes: 25 * 60,
    durationSeconds: 0.6,
    execution: "finished",
    trigger: "numeric state of sensor.solar_surplus",
    steps: [
      numericTrigger({ entityId: "sensor.solar_surplus", value: "2120" }),
      passed({ path: "condition/0", at: 0.01 }),
      passed({
        path: "condition/0/entity_id/0",
        at: 0.01,
        extra: { state: "off", wanted_state: "off" },
      }),
      service({
        path: "action/0",
        at: 0.3,
        domain: "switch",
        name: "turn_on",
        entityId: "switch.wallbox",
      }),
      service({
        path: "action/1",
        at: 0.5,
        domain: "counter",
        name: "increment",
        entityId: "counter.solar_surplus_days",
      }),
    ],
  },
  {
    domain: "script",
    itemId: "terrace_evening_mood",
    agoMinutes: 20 * 60 + 15,
    durationSeconds: 2.4,
    execution: "finished",
    userId: "demo-user",
    steps: [
      service({
        path: "sequence/0",
        at: 0,
        domain: "light",
        name: "turn_on",
        entityId: "light.terrace",
      }),
      service({
        path: "sequence/1",
        at: 0.1,
        domain: "light",
        name: "turn_on",
        entityId: "light.garden_paths",
      }),
      ["sequence/2", 0.2, { result: { delay: 2, done: true } }],
      service({
        path: "sequence/3",
        at: 2.3,
        domain: "cover",
        name: "open_cover",
        entityId: "cover.awning",
      }),
    ],
  },
];

/** Every demo run as HA would keep it, oldest first per item (HA's order in trace/list). */
export function createDemoTraces(now: number): DemoTrace[] {
  return RUNS.map((run, index): DemoTrace => {
    const start = now - run.agoMinutes * MINUTE;
    const at = (seconds: number): string => new Date(start + seconds * 1000).toISOString();
    const trace: Record<string, DemoTraceStep[]> = {};

    for (const [path, offset, extra] of run.steps) {
      (trace[path] ??= []).push({ path, timestamp: at(offset), ...extra });
    }

    return {
      domain: run.domain,
      item_id: run.itemId,
      run_id: `demo-run-${index + 1}`,
      state: run.durationSeconds === null ? "running" : "stopped",
      script_execution: run.execution,
      last_step: run.steps.at(-1)?.[0] ?? null,
      timestamp: {
        start: at(0),
        finish: run.durationSeconds === null ? null : at(run.durationSeconds),
      },
      ...(run.trigger ? { trigger: run.trigger } : {}),
      ...(run.error ? { error: run.error } : {}),
      context: { id: `demo-context-${index + 1}`, parent_id: null, user_id: run.userId ?? null },
      trace,
    };
  }).sort((a, b) => a.timestamp.start.localeCompare(b.timestamp.start));
}
