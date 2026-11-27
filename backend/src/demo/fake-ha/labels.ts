import { HaCommandError } from "../../ha/ha-command.error";
import type { HaLabel } from "../../ha/ha.types";
import { emit, type FakeHaData } from "./data";
import { ERROR_CODE, slugify, text, type Payload } from "./shared";

function requireLabel({ ha, labelId }: { ha: FakeHaData; labelId: unknown }): HaLabel {
  const label = ha.labels.find((item) => item.label_id === labelId);
  if (!label) throw new HaCommandError(ERROR_CODE.notFound, "Label not found");

  return label;
}

function requireFreeLabelName({
  ha,
  name,
  ownId,
}: {
  ha: FakeHaData;
  name: string;
  ownId: string | null;
}): void {
  const taken = ha.labels.some(
    (label) => label.label_id !== ownId && label.name.toLowerCase() === name.toLowerCase(),
  );
  if (!name || taken)
    throw new HaCommandError(ERROR_CODE.invalid, `The name "${name}" is already in use`);
}

/** Like HA: names are unique (ignoring case), the ID comes from the name. */
export function createLabel({ ha, payload }: { ha: FakeHaData; payload: Payload }): HaLabel {
  const name = text(payload.name).trim();
  requireFreeLabelName({ ha, name, ownId: null });

  const base = slugify(name) || "label";
  let labelId = base;
  for (let n = 2; ha.labels.some((label) => label.label_id === labelId); n++)
    labelId = `${base}_${n}`;

  const label: HaLabel = {
    label_id: labelId,
    name,
    icon: typeof payload.icon === "string" ? payload.icon : null,
    color: typeof payload.color === "string" ? payload.color : null,
  };
  ha.labels.push(label);
  emit({
    ha,
    eventType: "label_registry_updated",
    data: { action: "create", label_id: labelId },
  });

  return structuredClone(label);
}

export function updateLabel({ ha, payload }: { ha: FakeHaData; payload: Payload }): HaLabel {
  const label = requireLabel({ ha, labelId: payload.label_id });

  if (payload.name !== undefined) {
    const name = text(payload.name).trim();
    requireFreeLabelName({ ha, name, ownId: label.label_id });
    label.name = name;
  }
  if (payload.icon !== undefined)
    label.icon = typeof payload.icon === "string" ? payload.icon : null;
  if (payload.color !== undefined)
    label.color = typeof payload.color === "string" ? payload.color : null;
  emit({
    ha,
    eventType: "label_registry_updated",
    data: { action: "update", label_id: label.label_id },
  });

  return structuredClone(label);
}

/** Like HA: the label goes from every entity; flows that name it keep the id and do less. */
export function deleteLabel({ ha, payload }: { ha: FakeHaData; payload: Payload }): null {
  const label = requireLabel({ ha, labelId: payload.label_id });

  ha.labels.splice(ha.labels.indexOf(label), 1);
  for (const entry of ha.registry.values())
    entry.labels = entry.labels.filter((id) => id !== label.label_id);
  emit({
    ha,
    eventType: "label_registry_updated",
    data: { action: "remove", label_id: label.label_id },
  });

  return null;
}
