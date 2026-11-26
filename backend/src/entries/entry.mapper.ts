import type { CategoryScope } from "../categories/categories.constants";
import type { HaArea, HaCategory, HaEntityRegistryEntry, HaLabel, HaState } from "../ha/ha.types";
import { CATEGORY_SCOPE_BY_KIND, HELPER_DOMAINS, KIND_BY_DOMAIN } from "./entries.constants";
import {
  ENTRY_KIND,
  type Entry,
  type EntryArea,
  type EntryKind,
  type EntryLabel,
} from "./entry.model";

/** Everything the mapper needs, loaded from HA in one go. */
export type HaSnapshot = {
  registryEntries: HaEntityRegistryEntry[];
  states: HaState[];
  /** Ids of config entries of type "helper" (template, group, utility_meter, …). */
  helperConfigEntryIds: ReadonlySet<string>;
  categoriesByScope: Record<CategoryScope, HaCategory[]>;
  labels: HaLabel[];
  areas: HaArea[];
};

/** Lookups built once per snapshot, so each entry resolves its ids in constant time. */
type Lookups = {
  statesById: Map<string, HaState>;
  categoryNames: Map<CategoryScope, Map<string, string>>;
  labelsById: Map<string, EntryLabel>;
  areasById: Map<string, EntryArea>;
};

const DOMAIN_SEPARATOR = ".";

/**
 * Turns raw HA data into the entries the UI lists: automations, scripts, scenes and helpers.
 *
 * Entities from the registry come with category, labels and area. Entities that exist only as
 * state (YAML without unique_id) are added too, so nothing is missing from the list.
 *
 * @param snapshot - Registry entries, states, helper config entries, categories, labels, areas.
 * @returns Entries in registry order, followed by state-only entries.
 */
export function mapToEntries(snapshot: HaSnapshot): Entry[] {
  const lookups = buildLookups(snapshot);
  const registeredIds = new Set<string>();
  const entries: Entry[] = [];

  for (const registryEntry of snapshot.registryEntries) {
    const { entity_id: entityId, config_entry_id: configEntryId } = registryEntry;
    const kind = detectKind({
      entityId,
      configEntryId,
      helperConfigEntryIds: snapshot.helperConfigEntryIds,
    });

    if (!kind) continue;

    registeredIds.add(entityId);
    entries.push(fromRegistry({ registryEntry, kind, lookups }));
  }

  for (const state of snapshot.states) {
    const kind = detectKind({
      entityId: state.entity_id,
      configEntryId: null,
      helperConfigEntryIds: snapshot.helperConfigEntryIds,
    });

    if (!kind || registeredIds.has(state.entity_id)) continue;

    entries.push(fromStateOnly({ state, kind }));
  }

  return entries;
}

function buildLookups(snapshot: HaSnapshot): Lookups {
  const labels = snapshot.labels.map((label): [string, EntryLabel] => [
    label.label_id,
    { labelId: label.label_id, name: label.name, color: label.color },
  ]);
  const areas = snapshot.areas.map((area): [string, EntryArea] => [
    area.area_id,
    { areaId: area.area_id, name: area.name },
  ]);

  return {
    statesById: new Map(snapshot.states.map((state) => [state.entity_id, state])),
    categoryNames: indexCategoryNames(snapshot.categoriesByScope),
    labelsById: new Map(labels),
    areasById: new Map(areas),
  };
}

function detectKind({
  entityId,
  configEntryId,
  helperConfigEntryIds,
}: {
  entityId: string;
  configEntryId: string | null;
  helperConfigEntryIds: ReadonlySet<string>;
}): EntryKind | null {
  const domain = domainOf(entityId);
  const kindByDomain = KIND_BY_DOMAIN[domain];

  if (kindByDomain) return kindByDomain;
  if (HELPER_DOMAINS.has(domain)) return ENTRY_KIND.helper;

  // Config-entry helpers have an ordinary domain like "sensor"; only their config entry tells.
  const isConfigEntryHelper = configEntryId !== null && helperConfigEntryIds.has(configEntryId);

  return isConfigEntryHelper ? ENTRY_KIND.helper : null;
}

function fromRegistry({
  registryEntry,
  kind,
  lookups,
}: {
  registryEntry: HaEntityRegistryEntry;
  kind: EntryKind;
  lookups: Lookups;
}): Entry {
  const state = lookups.statesById.get(registryEntry.entity_id);
  const scope = CATEGORY_SCOPE_BY_KIND[kind];
  const categoryId = registryEntry.categories[scope] ?? null;
  const categoryPath = categoryId
    ? (lookups.categoryNames.get(scope)?.get(categoryId) ?? null)
    : null;
  const labels = registryEntry.labels.map((labelId) => lookups.labelsById.get(labelId));
  const area = registryEntry.area_id ? lookups.areasById.get(registryEntry.area_id) : undefined;

  return {
    entityId: registryEntry.entity_id,
    kind,
    domain: domainOf(registryEntry.entity_id),
    name: displayName({ registryEntry, state }),
    // The user's icon wins; otherwise the icon the entity reports in its state.
    icon: registryEntry.icon ?? state?.attributes.icon ?? null,
    categoryId,
    categoryPath,
    // A label deleted in HA can linger in the entity for a moment; skip unknown ids.
    labels: labels.filter((label): label is EntryLabel => label !== undefined),
    area: area ?? null,
    state: state?.state ?? null,
    isDisabled: registryEntry.disabled_by !== null,
    isHidden: registryEntry.hidden_by !== null,
    isInRegistry: true,
    isFavorite: false,
    note: null,
  };
}

function fromStateOnly({ state, kind }: { state: HaState; kind: EntryKind }): Entry {
  return {
    entityId: state.entity_id,
    kind,
    domain: domainOf(state.entity_id),
    name: state.attributes.friendly_name ?? state.entity_id,
    icon: state.attributes.icon ?? null,
    categoryId: null,
    categoryPath: null,
    labels: [],
    area: null,
    state: state.state,
    isDisabled: false,
    isHidden: false,
    isInRegistry: false,
    isFavorite: false,
    note: null,
  };
}

/** Same order as HA: the user's name, then the live friendly name, then the integration's name. */
function displayName({
  registryEntry,
  state,
}: {
  registryEntry: HaEntityRegistryEntry;
  state: HaState | undefined;
}): string {
  const userName = registryEntry.name;
  const friendlyName = state?.attributes.friendly_name;
  const integrationName = registryEntry.original_name;

  return userName ?? friendlyName ?? integrationName ?? registryEntry.entity_id;
}

function indexCategoryNames(
  categoriesByScope: Record<CategoryScope, HaCategory[]>,
): Map<CategoryScope, Map<string, string>> {
  const index = new Map<CategoryScope, Map<string, string>>();
  const scopes = Object.keys(categoriesByScope) as CategoryScope[];

  for (const scope of scopes) {
    const namesById = categoriesByScope[scope].map((category): [string, string] => [
      category.category_id,
      category.name,
    ]);
    index.set(scope, new Map(namesById));
  }

  return index;
}

function domainOf(entityId: string): string {
  return entityId.split(DOMAIN_SEPARATOR)[0];
}
