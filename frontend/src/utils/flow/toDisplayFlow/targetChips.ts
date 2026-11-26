import type { BlockChip, CatalogEntry, ConfigPath } from "@/types/editor";

import { formatEntities } from "../formatValue";
import { domainsOf } from "../valueEditors";
import { asList, asRecord, type Context, type Raw } from "./context";

/** An entity chip; editable with the entity picker. */
export function entityChip(
  value: unknown,
  path: ConfigPath,
  domains: string[],
  isMultiple: boolean,
  isRemovable: boolean,
  context: Context,
  label?: string,
): BlockChip {
  return {
    kind: "entity",
    label,
    text: formatEntities(value, context.names),
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

export function targetChips(
  raw: Raw,
  path: ConfigPath,
  entry: CatalogEntry | undefined,
  context: Context,
): BlockChip[] {
  const target = asRecord(raw.target);
  const { entity_id: entityIds, area_id: areaIds, device_id: deviceIds } = target;
  const domains = targetDomains(entry);
  const chips: BlockChip[] = [];

  if (entityIds) {
    chips.push(
      entityChip(entityIds, [...path, "target", "entity_id"], domains, true, true, context),
    );
  }

  // Old configs name the entity next to the action instead of in `target`.
  if (raw.entity_id) {
    chips.push(entityChip(raw.entity_id, [...path, "entity_id"], domains, true, false, context));
  }

  if (areaIds) {
    chips.push({
      kind: "entity",
      label: context.texts.labels.area,
      // Area IDs have no dot, so they share the name map with entities without clashes.
      text: formatEntities(areaIds, context.names),
      edit: {
        path: [...path, "target", "area_id"],
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
      text: formatEntities(target.floor_id, context.targetNames.floors),
    });
  }

  if (target.label_id) {
    chips.push({
      kind: "entity",
      label: context.texts.labels.label,
      text: formatEntities(target.label_id, context.targetNames.labels),
    });
  }

  const excluded = excludedText(asRecord(target.exclude), context);

  if (excluded) {
    chips.push({ kind: "entity", label: context.texts.labels.exclude, text: excluded });
  }

  return chips;
}

/**
 * What `target.exclude` leaves out, by name: "Küche, Nachtlicht". It has the same keys as the
 * target itself (HA, 2026); unknown keys are ignored here and kept on save.
 */
function excludedText(exclude: Raw, context: Context): string {
  const { names, targetNames } = context;
  const parts = [
    exclude.entity_id && formatEntities(exclude.entity_id, names),
    exclude.area_id && formatEntities(exclude.area_id, names),
    exclude.device_id && asList(exclude.device_id).join(", "),
    exclude.floor_id && formatEntities(exclude.floor_id, targetNames.floors),
    exclude.label_id && formatEntities(exclude.label_id, targetNames.labels),
  ];

  return parts.filter((part): part is string => typeof part === "string" && part !== "").join(", ");
}

/** For `…target.entity_id` the sibling `…target.area_id`; HA then acts on everything in the area. */
function targetAreaPath(path: ConfigPath): ConfigPath | undefined {
  const isTarget =
    path.length >= 2 && path[path.length - 2] === "target" && path[path.length - 1] === "entity_id";

  return isTarget ? [...path.slice(0, -1), "area_id"] : undefined;
}

/** HA says the block targets entities, but none (and no area, device, floor or label) is set yet. */
export function missingTarget(
  raw: Raw,
  values: Raw,
  path: ConfigPath,
  entry: CatalogEntry | undefined,
  context: Context,
): BlockChip[] {
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

  const chip = entityChip(
    undefined,
    [...path, "target", "entity_id"],
    targetDomains(entry),
    true,
    false,
    context,
  );

  return [{ ...chip, text: context.texts.entity, isMissing: true }];
}
