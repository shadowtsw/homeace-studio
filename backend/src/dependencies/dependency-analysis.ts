import type { HaEntityRegistryEntry, HaState } from "../ha/ha.types";

/** What a flow does with an entity, in the order the UI groups them. */
export const DEPENDENCY_ROLE = {
  /** A trigger listens to it. */
  trigger: "trigger",
  /** A condition (or a wait) checks it. */
  condition: "condition",
  /** An action switches or sets it. */
  action: "action",
  /** A scene or group contains it. */
  member: "member",
  /** A template reads its value. */
  value: "value",
  /** An action starts it (script, scene, automation). */
  call: "call",
} as const;

export type DependencyRole = (typeof DEPENDENCY_ROLE)[keyof typeof DEPENDENCY_ROLE];

export const ROLE_ORDER: DependencyRole[] = Object.values(DEPENDENCY_ROLE);

/** Entity ID → what is done with it. */
export type RoleRefs = Map<string, Set<DependencyRole>>;

type Context = "trigger" | "condition" | "action";

/** A plain entity ID; values with templates or `!input` are skipped. */
const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/;
/** Entity-ID-like words inside a template; overlapping, so `states.sensor.x` yields `sensor.x`. */
const TEMPLATE_ID = /(?=\b([a-z_]+\.[a-z0-9_]+)\b)/g;
const TEMPLATE_MARK = "{{";
/** Domains an action starts rather than switches. */
const CALLED_DOMAINS = new Set(["script", "scene", "automation"]);
/** Script services that are not a call of one script ("script.turn_on" names it in the target). */
const SCRIPT_SERVICES = new Set(["turn_on", "turn_off", "toggle", "reload"]);
const SCRIPT_PREFIX = "script.";
/** Keys whose content is checked, not done, inside actions (if, choose, repeat, wait). */
const CONDITION_KEYS = new Set([
  "if",
  "conditions",
  "condition",
  "while",
  "until",
  "wait_for_trigger",
]);
const TOP_LEVEL: Record<string, Context> = {
  triggers: "trigger",
  trigger: "trigger",
  conditions: "condition",
  condition: "condition",
  actions: "action",
  action: "action",
  sequence: "action",
};

export type CollectRoleRefsOptions = {
  config: unknown;
  isKnown: (id: string) => boolean;
};

/**
 * Every entity a flow config names, with what it does with each: plain IDs in `entity_id` fields
 * and targets, scripts called directly (`action: script.good_night`) and, inside templates, IDs of
 * entities that exist (`isKnown`), so that a word like `states.sensor` is not taken for one.
 */
export function collectRoleRefs({ config, isKnown }: CollectRoleRefsOptions): RoleRefs {
  const refs: RoleRefs = new Map();
  const add = ({ id, role }: { id: string; role: DependencyRole }): void => {
    const roles = refs.get(id) ?? new Set<DependencyRole>();
    roles.add(role);
    refs.set(id, roles);
  };
  const roleOf = ({ id, context }: { id: string; context: Context }): DependencyRole => {
    if (context !== "action") return context;
    return CALLED_DOMAINS.has(id.split(".")[0] ?? "")
      ? DEPENDENCY_ROLE.call
      : DEPENDENCY_ROLE.action;
  };
  const addIds = ({ value, context }: { value: unknown; context: Context }): void => {
    const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];

    for (const item of values) {
      const id = typeof item === "string" ? item.trim() : "";
      if (ENTITY_ID.test(id)) add({ id, role: roleOf({ id, context }) });
    }
  };
  const addTemplateIds = ({ text, context }: { text: string; context: Context }): void => {
    for (const match of text.matchAll(TEMPLATE_ID)) {
      const id = match[1] ?? "";
      if (isKnown(id)) add({ id, role: context === "action" ? DEPENDENCY_ROLE.value : context });
    }
  };
  const walk = ({ node, context }: { node: unknown; context: Context }): void => {
    if (typeof node === "string") {
      if (node.includes(TEMPLATE_MARK)) addTemplateIds({ text: node, context });
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item) => walk({ node: item, context }));
      return;
    }

    if (!node || typeof node !== "object") return;

    const record = node as Record<string, unknown>;
    // A condition block among actions (`- condition: state`) checks, it does not act.
    const own: Context =
      context === "action" && typeof record.condition === "string" ? "condition" : context;

    for (const [key, value] of Object.entries(record)) {
      if (key === "entity_id") {
        addIds({ value, context: own });
        if (typeof value === "string" && value.includes(TEMPLATE_MARK))
          addTemplateIds({ text: value, context: own });
        continue;
      }

      if (
        own === "action" &&
        (key === "action" || key === "service") &&
        typeof value === "string"
      ) {
        if (value.startsWith(SCRIPT_PREFIX)) {
          const service = value.slice(SCRIPT_PREFIX.length);
          if (!SCRIPT_SERVICES.has(service)) add({ id: value, role: DEPENDENCY_ROLE.call });
        }
        continue;
      }

      walk({
        node: value,
        context: own === "action" && CONDITION_KEYS.has(key) ? "condition" : own,
      });
    }
  };

  if (config && typeof config === "object" && !Array.isArray(config)) {
    for (const [key, value] of Object.entries(config as Record<string, unknown>)) {
      // Top-level `action` / `condition` are the old plural keys, always lists there.
      walk({ node: value, context: TOP_LEVEL[key] ?? "action" });
    }
  }

  return refs;
}

export type DependencyIndexInput = {
  states: HaState[];
  registry: HaEntityRegistryEntry[];
  /** Config of every automation and script, by entity ID. */
  configs: ReadonlyMap<string, unknown>;
};

/** User (automation, script, scene, group) → the entities it names, with roles. */
export type DependencyIndex = Map<string, RoleRefs>;

/**
 * Who uses what in the whole home: flows from their config, scenes and groups from their members.
 * Scripts called by their key (`script.<key>`, which stays when the entity ID is renamed) are mapped
 * to their entity ID.
 */
export function buildDependencyIndex(input: DependencyIndexInput): DependencyIndex {
  const known = new Set([
    ...input.states.map((state) => state.entity_id),
    ...input.registry.map((entry) => entry.entity_id),
  ]);
  const scriptByKey = new Map(
    input.registry
      .filter((entry) => entry.platform === "script")
      .map((entry) => [`${SCRIPT_PREFIX}${entry.unique_id}`, entry.entity_id]),
  );
  const resolve = (id: string): string => (known.has(id) ? id : (scriptByKey.get(id) ?? id));
  const index: DependencyIndex = new Map();

  for (const [userId, config] of input.configs) {
    const refs: RoleRefs = new Map();

    for (const [id, roles] of collectRoleRefs({
      config,
      isKnown: (candidate) => known.has(candidate),
    })) {
      const target = resolve(id);
      if (target === userId) continue;
      refs.set(target, new Set([...(refs.get(target) ?? []), ...roles]));
    }

    index.set(userId, refs);
  }

  for (const state of input.states) {
    if (!/^(scene|group)\./.test(state.entity_id)) continue;

    const members = Array.isArray(state.attributes.entity_id) ? state.attributes.entity_id : [];
    const refs: RoleRefs = new Map();

    for (const member of members) {
      if (typeof member === "string" && member !== state.entity_id) {
        refs.set(member, new Set([DEPENDENCY_ROLE.member]));
      }
    }

    if (refs.size > 0) index.set(state.entity_id, refs);
  }

  return index;
}

/** Roles in display order. */
export function sortedRoles(roles: Iterable<DependencyRole>): DependencyRole[] {
  const set = new Set(roles);
  return ROLE_ORDER.filter((role) => set.has(role));
}
