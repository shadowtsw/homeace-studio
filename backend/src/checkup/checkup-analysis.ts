import type { Entry, EntryKind } from "../entries/entry.model";
import type { HaEntityRegistryEntry, HaState } from "../ha/ha.types";

/** What the check-up reports, in the order the UI shows it. */
export const CHECKUP_KIND = {
  /** Uses an entity that no longer exists in HA. */
  gone: "gone",
  /** Uses an entity that is unavailable right now. */
  unavailable: "unavailable",
  /** The newest run of an automation or script ended with an error. */
  failed: "failed",
  /** A helper no automation or script uses. */
  unused: "unused",
  /** An automation that has not run for a long time, or never. */
  stale: "stale",
} as const;

export type CheckupKind = (typeof CHECKUP_KIND)[keyof typeof CHECKUP_KIND];

export type CheckupRef = {
  entityId: string;
  /** Friendly name when the entity still exists. */
  name: string | null;
  /** Unavailable only: since when. */
  since: string | null;
};

export type CheckupFinding = {
  /** "gone:automation.x"; used to hide a finding. */
  key: string;
  kind: CheckupKind;
  entityId: string;
  name: string;
  entryKind: EntryKind;
  /** gone / unavailable: the entities it refers to. */
  refs: CheckupRef[];
  /** stale: when it last ran; null when never. */
  lastTriggered: string | null;
  /** Automations: switched on. */
  isOn: boolean;
  /** failed: when the run started and HA's error. */
  failedAt: string | null;
  error: string | null;
};

export type CheckupInput = {
  entries: Entry[];
  states: HaState[];
  /** Entity IDs in the registry, also disabled ones that have no state. */
  registryIds: ReadonlySet<string>;
  /**
   * Keys of scripts in scripts.yaml. `action: script.<key>` calls a script by this key, which stays
   * the same when its entity ID is renamed; such a call still works.
   */
  scriptKeys: ReadonlySet<string>;
  /** Config of every automation and script that could be read, by entity ID. */
  configs: ReadonlyMap<string, unknown>;
  /** Newest kept run per automation or script. */
  lastRuns: ReadonlyMap<string, { startedAt: string; result: string; error: string | null }>;
  /** When each entity was created (ms since 1970), from the registry; new ones get some grace. */
  createdAt: ReadonlyMap<string, number>;
  now: Date;
  ignored: ReadonlySet<string>;
};

/** A plain entity ID; values with templates or `!input` are skipped. */
const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/;
const ENTITY_ID_KEY = "entity_id";
const ACTION_KEY = "action";
const SCRIPT_PREFIX = "script.";
const STATE_UNAVAILABLE = "unavailable";
const STATE_OFF = "off";
const RUN_ERROR = "error";
/** Script services that are not a call of one script ("script.turn_on" names it in the target). */
const SCRIPT_SERVICES = new Set(["turn_on", "turn_off", "toggle", "reload"]);
/** Helpers HA manages itself, made to be used by automations. Template or group helpers often only
 * feed dashboards, which HomeAce Studio cannot see, so they are left out. */
const CHECKED_HELPER_DOMAINS = new Set([
  "input_boolean",
  "input_button",
  "input_datetime",
  "input_number",
  "input_select",
  "input_text",
  "counter",
  "timer",
  "schedule",
]);
/** An automation that has not run for this long (or never, since it was created) is reported. */
export const STALE_AFTER_DAYS = 30;
/** A new helper is not reported as unused before it had this long to get into a flow. */
export const UNUSED_GRACE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const KIND_ORDER: CheckupKind[] = Object.values(CHECKUP_KIND);

/**
 * Every entity ID a flow config names in an `entity_id` field (also in targets and lists), plus
 * scripts it calls directly (`action: script.good_night`).
 */
export function collectEntityRefs(config: unknown): Set<string> {
  const refs = new Set<string>();
  const addIds = (value: unknown): void => {
    const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];

    for (const item of values) {
      const id = typeof item === "string" ? item.trim() : "";
      if (ENTITY_ID.test(id)) refs.add(id);
    }
  };
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (!node || typeof node !== "object") return;

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === ENTITY_ID_KEY) addIds(value);

      if (key === ACTION_KEY && typeof value === "string" && value.startsWith("script.")) {
        const service = value.slice("script.".length);
        if (!SCRIPT_SERVICES.has(service)) addIds(value);
      }

      walk(value);
    }
  };

  walk(config);
  return refs;
}

/** Creation time per entity in ms, for the entries that have one (HA 2024.7 and newer). */
export function createdTimes(
  registry: readonly Pick<HaEntityRegistryEntry, "entity_id" | "created_at">[],
): Map<string, number> {
  const times = new Map<string, number>();

  for (const entry of registry) {
    if (typeof entry.created_at === "number") times.set(entry.entity_id, entry.created_at * 1000);
  }

  return times;
}

/**
 * Finds what needs a look, without any setup: flows pointing at entities that are gone or
 * unavailable, helpers nothing uses, automations that have not run for weeks.
 */
export function analyzeCheckup(input: CheckupInput): CheckupFinding[] {
  const stateById = new Map(input.states.map((state) => [state.entity_id, state]));
  const nameOf = (id: string): string | null => stateById.get(id)?.attributes.friendly_name ?? null;
  const findings: CheckupFinding[] = [];
  const ageOf = (timeMs: number): number => input.now.getTime() - timeMs;
  /** Unknown creation time counts as old: no grace. */
  const createdAgo = (id: string): number => ageOf(input.createdAt.get(id) ?? 0);
  const add = ({
    entry,
    kind,
    extra = {},
  }: {
    entry: Entry;
    kind: CheckupKind;
    extra?: Partial<CheckupFinding>;
  }): void => {
    findings.push({
      key: `${kind}:${entry.entityId}`,
      kind,
      entityId: entry.entityId,
      name: entry.name,
      entryKind: entry.kind,
      refs: [],
      lastTriggered: null,
      isOn: entry.state !== STATE_OFF,
      failedAt: null,
      error: null,
      ...extra,
    });
  };
  // A helper counts as used when its ID appears anywhere in a flow (templates included), or as a
  // member of a scene or group (HA lists those in their entity_id attribute).
  const members = input.states
    .filter((item) => /^(scene|group)\./.test(item.entity_id))
    .map((item) => item.attributes.entity_id ?? []);
  const allConfigText = [...input.configs.values(), ...members]
    .map((config) => JSON.stringify(config))
    .join("\n");

  for (const entry of input.entries) {
    if (entry.isDisabled) continue;

    const config = input.configs.get(entry.entityId);

    if (config !== undefined) {
      const refs = [...collectEntityRefs(config)].filter((id) => id !== entry.entityId);
      const exists = (id: string): boolean =>
        stateById.has(id) ||
        input.registryIds.has(id) ||
        (id.startsWith(SCRIPT_PREFIX) && input.scriptKeys.has(id.slice(SCRIPT_PREFIX.length)));
      const gone = refs.filter((id) => !exists(id));
      const unavailable = refs.filter((id) => stateById.get(id)?.state === STATE_UNAVAILABLE);

      if (gone.length > 0) {
        add({
          entry,
          kind: CHECKUP_KIND.gone,
          extra: {
            refs: gone.map((id) => ({ entityId: id, name: null, since: null })),
          },
        });
      }

      if (unavailable.length > 0) {
        add({
          entry,
          kind: CHECKUP_KIND.unavailable,
          extra: {
            refs: unavailable.map((id) => ({
              entityId: id,
              name: nameOf(id),
              since: stateById.get(id)?.last_changed ?? null,
            })),
          },
        });
      }
    }

    // A newer run that went fine makes the finding go away; ignoring hides only this one failure.
    const lastRun = input.lastRuns.get(entry.entityId);
    if (lastRun?.result === RUN_ERROR) {
      add({
        entry,
        kind: CHECKUP_KIND.failed,
        extra: {
          key: `${CHECKUP_KIND.failed}:${entry.entityId}:${lastRun.startedAt}`,
          failedAt: lastRun.startedAt,
          error: lastRun.error,
        },
      });
    }

    if (entry.kind === "helper" && CHECKED_HELPER_DOMAINS.has(entry.domain)) {
      const isNew = createdAgo(entry.entityId) < UNUSED_GRACE_DAYS * DAY_MS;
      if (!isNew && !allConfigText.includes(entry.entityId))
        add({ entry, kind: CHECKUP_KIND.unused });
    }

    if (entry.kind === "automation") {
      const lastTriggered = stateById.get(entry.entityId)?.attributes.last_triggered ?? null;
      // Never ran: counted from its creation, so a new automation is not reported right away
      const age = lastTriggered ? ageOf(Date.parse(lastTriggered)) : createdAgo(entry.entityId);

      if (age > STALE_AFTER_DAYS * DAY_MS)
        add({ entry, kind: CHECKUP_KIND.stale, extra: { lastTriggered } });
    }
  }

  return findings
    .filter((finding) => !input.ignored.has(finding.key))
    .sort(
      (a, b) =>
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}
