import { computed, reactive, ref, watch, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import type { EntityOption } from "@/types/editor";
import {
  CRITERIA_KEYS,
  NO_AREA,
  countByDevice,
  criterionOptions,
  groupByDevice,
  matchesCriteria,
  matchesQuery,
  suggestEntities,
  type CriterionKey,
  type PickerCriteria,
} from "@/utils/entities/entityPicker";

/** What the entity picker gets from its field. */
export type EntityPickerInput = {
  entities: EntityOption[];
  selected: string[];
  /** HA's requirement for this field; empty means any entity. */
  domains: string[];
  /** Entities the flow already uses, suggested first. */
  usedIds: string[];
  /** The automation's own area, for suggestions. */
  areaId: string | null;
  /** Action targets can take a whole area ("all lights in the living room"). */
  canPickArea: boolean;
};

type UseEntityPickerOptions = {
  /** The picker's props (reactive). */
  picker: Readonly<EntityPickerInput>;
  query: Ref<string>;
};

/**
 * The entity picker's state: what HA allows here, the criteria (area, label, kind) that combine
 * with "and", the search, and what the list shows (an area by device, results, or suggestions).
 */
export function useEntityPicker({ picker, query }: UseEntityPickerOptions) {
  const { t, te } = useI18n();

  const criteria = reactive<PickerCriteria>({ area: null, label: null, kind: null });
  /** The area criterion starts open: choosing an area is the usual way in. */
  const openCriterion = ref<CriterionKey | null>("area");

  const kindLabel = (domain: string): string =>
    te(`picker.kinds.${domain}`) ? t(`picker.kinds.${domain}`) : domain;

  /** "Lichter" for the filter hint; kinds without a plural keep their name. */
  const pluralKind = (domain: string): string =>
    te(`picker.plural.${domain}`) ? t(`picker.plural.${domain}`) : kindLabel(domain);

  // What HA allows, and which view the list shows
  /** Only what HA allows for this field. */
  const allowed = computed(() =>
    picker.domains.length === 0
      ? picker.entities
      : picker.entities.filter((entity) => picker.domains.includes(entity.domain)),
  );
  const deviceCounts = computed(() => countByDevice(picker.entities));
  const hasCriteria = computed(() => CRITERIA_KEYS.some((key) => criteria[key] !== null));
  const onlyArea = computed(() => {
    const isOnlyArea =
      !query.value.trim() && criteria.area !== null && !criteria.label && !criteria.kind;

    return isOnlyArea ? criteria.area : null;
  });
  const mode = computed(() => {
    if (onlyArea.value !== null) return "area";

    return query.value.trim() || hasCriteria.value ? "results" : "start";
  });

  // The lists
  const criterionChoices = computed(() =>
    openCriterion.value
      ? criterionOptions({ entities: allowed.value, key: openCriterion.value })
      : [],
  );
  const results = computed(() =>
    allowed.value.filter(
      (entity) =>
        matchesCriteria({ entity, criteria }) &&
        matchesQuery({ entity, query: query.value, kindLabel }),
    ),
  );
  const inArea = computed(() =>
    allowed.value.filter((entity) => matchesCriteria({ entity, criteria })),
  );
  const deviceGroups = computed(() => groupByDevice(inArea.value));
  const suggested = computed(() =>
    suggestEntities({
      entities: allowed.value,
      usedIds: new Set(picker.usedIds),
      areaId: picker.areaId,
    }),
  );
  const areaName = computed(
    () => picker.entities.find((entity) => entity.areaId === picker.areaId)?.areaName ?? null,
  );

  /** "All lights · Living room": only for action targets with a known kind and a real area. */
  const areaTarget = computed(() => {
    const canTargetArea = picker.canPickArea && picker.domains.length > 0;
    if (!canTargetArea || onlyArea.value === NO_AREA) return null;

    const first = inArea.value.find((entity) => entity.areaId);

    return first?.areaId && first.areaName
      ? { areaId: first.areaId, areaName: first.areaName, count: inArea.value.length }
      : null;
  });
  const pluralKinds = computed(() =>
    picker.domains.length === 1 && te(`picker.plural.${picker.domains[0]}`)
      ? t(`picker.plural.${picker.domains[0]}`)
      : t("picker.plural.other"),
  );

  /** Picked entities HA no longer has, so they can still be seen and removed. */
  const goneIds = computed(() =>
    picker.selected.filter((id) => !picker.entities.some((entity) => entity.entityId === id)),
  );

  // Criteria chips
  /** Opens a criterion's values, or closes them when it is open already. */
  function toggleOpen(key: CriterionKey): void {
    openCriterion.value = openCriterion.value === key ? null : key;
  }

  /** One value per criterion, like radio buttons: another chip switches, the chosen one clears. */
  function toggleCriterion({ key, value }: { key: CriterionKey; value: string }): void {
    criteria[key] = criteria[key] === value ? null : value;
  }

  function resetCriteria(): void {
    for (const key of CRITERIA_KEYS) criteria[key] = null;
  }

  // Typing searches everything; the open chips would only push the results down.
  watch(query, (text) => {
    if (text.trim() && openCriterion.value === "area" && criteria.area === null) {
      openCriterion.value = null;
    }
  });

  return {
    criteria,
    openCriterion,
    kindLabel,
    pluralKind,
    deviceCounts,
    hasCriteria,
    mode,
    criterionChoices,
    results,
    deviceGroups,
    suggested,
    areaName,
    areaTarget,
    pluralKinds,
    goneIds,
    toggleOpen,
    toggleCriterion,
    resetCriteria,
  };
}
