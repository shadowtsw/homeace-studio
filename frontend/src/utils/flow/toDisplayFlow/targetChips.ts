import type { BlockChip, CatalogEntry, ConfigPath } from "@/types/editor";

import { formatEntities } from "../formatValue";
import { domainsOf } from "../valueEditors";
import { asList, asRecord, type Context, type Raw } from "./context";

export type EntityChipOptions = {
  value: unknown;
  path: ConfigPath;
  domains: string[];
  isMultiple: boolean;
  isRemovable: boolean;
  context: Context;
  label?: string;
};

/** An entity chip; editable with the entity picker. */
export function entityChip({
  value,
  path,
  domains,
  isMultiple,
  isRemovable,
  context,
  label,
}: EntityChipOptions): BlockChip {
  return {
    kind: "entity",
    label,
    text: formatEntities({ value, entityNames: context.names }),
    edit: {
      path,
      title: label ?? context.texts.entity,
      editor: { type: "entity", domains, isMultiple, areaPath: targetAreaPath(path) },
      value,
      isRemovable,
    },
  };
}

export function targetDomains(entry: CatalogEntry | undefined): string[] {
  return domainsOf(asRecord(entry?.target).entity);
}

export type TargetChipsOptions = {
  raw: Raw;
  path: ConfigPath;
  entry: CatalogEntry | undefined;
  context: Context;
};

export function targetChips({ raw, path, entry, context }: TargetChipsOptions): BlockChip[] {
  const target = asRecord(raw.target);
  const { entity_id: entityIds, area_id: areaIds, device_id: deviceIds } = target;
  const domains = targetDomains(entry);
  const chips: BlockChip[] = [];

  if (entityIds) {
    const entityIdsPath = [...path, "target", "entity_id"];
    chips.push(
      entityChip({
        value: entityIds,
        path: entityIdsPath,
        domains,
        isMultiple: true,
        isRemovable: true,
        context,
      }),
    );
  }

  // Old configs name the entity next to the action instead of in `target`.
  if (raw.entity_id) {
    const legacyEntityIdPath = [...path, "entity_id"];
    chips.push(
      entityChip({
        value: raw.entity_id,
        path: legacyEntityIdPath,
        domains,
        isMultiple: true,
        isRemovable: false,
        context,
      }),
    );
  }

  if (areaIds) {
    const areaIdsPath = [...path, "target", "area_id"];
    chips.push({
      kind: "entity",
      label: context.texts.labels.area,
      // Area IDs have no dot, so they share the name map with entities without clashes.
      text: formatEntities({ value: areaIds, entityNames: context.names }),
      edit: {
        path: areaIdsPath,
        title: context.texts.labels.area ?? "area",
        editor: { type: "area", isMultiple: true },
        value: areaIds,
        isRemovable: true,
      },
    });
  }

  if (deviceIds) {
    chips.push({
      kind: "entity",
      label: context.texts.labels.device,
      text: asList(deviceIds).join(", "),
    });
  }

  // Floors, labels and what the target leaves out are shown, not edited (yet); saving keeps them.
  if (target.floor_id) {
    chips.push({
      kind: "entity",
      label: context.texts.labels.floor,
      text: formatEntities({ value: target.floor_id, entityNames: context.targetNames.floors }),
    });
  }

  if (target.label_id) {
    chips.push({
      kind: "entity",
      label: context.texts.labels.label,
      text: formatEntities({ value: target.label_id, entityNames: context.targetNames.labels }),
    });
  }

  const excluded = excludedText({ exclude: asRecord(target.exclude), context });

  if (excluded) {
    chips.push({ kind: "entity", label: context.texts.labels.exclude, text: excluded });
  }

  return chips;
}

/**
 * What `target.exclude` leaves out, by name: "Küche, Nachtlicht". It has the same keys as the
 * target itself (HA, 2026); unknown keys are ignored here and kept on save.
 */
function excludedText({ exclude, context }: { exclude: Raw; context: Context }): string {
  const { names, targetNames } = context;
  const parts = [
    exclude.entity_id && formatEntities({ value: exclude.entity_id, entityNames: names }),
    exclude.area_id && formatEntities({ value: exclude.area_id, entityNames: names }),
    exclude.device_id && asList(exclude.device_id).join(", "),
    exclude.floor_id &&
      formatEntities({ value: exclude.floor_id, entityNames: targetNames.floors }),
    exclude.label_id &&
      formatEntities({ value: exclude.label_id, entityNames: targetNames.labels }),
  ];

  return parts.filter((part): part is string => typeof part === "string" && part !== "").join(", ");
}

/** For `…target.entity_id` the sibling `…target.area_id`; HA then acts on everything in the area. */
function targetAreaPath(path: ConfigPath): ConfigPath | undefined {
  const [parentKey, lastKey] = path.slice(-2);
  const isTargetEntityPath = parentKey === "target" && lastKey === "entity_id";

  return isTargetEntityPath ? [...path.slice(0, -1), "area_id"] : undefined;
}

export type MissingTargetOptions = {
  raw: Raw;
  values: Raw;
  path: ConfigPath;
  entry: CatalogEntry | undefined;
  context: Context;
};

/** HA says the block targets entities, but none (and no area, device, floor or label) is set yet. */
export function missingTarget({
  raw,
  values,
  path,
  entry,
  context,
}: MissingTargetOptions): BlockChip[] {
  const target = asRecord(raw.target);
  const hasTarget =
    target.entity_id ||
    target.area_id ||
    target.device_id ||
    target.floor_id ||
    target.label_id ||
    raw.entity_id ||
    values.entity_id;

  if (!entry?.target || hasTarget) return [];

  const entityIdsPath = [...path, "target", "entity_id"];
  const chip = entityChip({
    value: undefined,
    path: entityIdsPath,
    domains: targetDomains(entry),
    isMultiple: true,
    isRemovable: false,
    context,
  });

  return [{ ...chip, text: context.texts.entity, isMissing: true }];
}
