import type { Entry, EntryChanges } from "@/types/entry";

/** What the properties form edits, as the form holds it. */
export type EntryFormValues = {
  name: string;
  icon: string;
  areaId: string | null;
  labelIds: string[];
};

/** The values the form is filled with for an entry. */
export function entryFormValuesOf(entry: Entry): EntryFormValues {
  return {
    name: entry.name,
    icon: entry.icon ?? "",
    areaId: entry.area?.areaId ?? null,
    labelIds: entry.labels.map((label) => label.labelId),
  };
}

const isSameLabelSet = (first: readonly string[], second: readonly string[]): boolean =>
  [...first].sort().join() === [...second].sort().join();

/** Whether the user changed something since the form was filled from `base`. */
export function isFormEdited(form: EntryFormValues, base: EntryFormValues): boolean {
  return (
    form.name.trim() !== base.name ||
    form.icon.trim() !== base.icon ||
    form.areaId !== base.areaId ||
    !isSameLabelSet(form.labelIds, base.labelIds)
  );
}

/**
 * What saving the form sends: only what the user changed against `base`, the state the form was
 * filled from. A change HA or another part of the app made meanwhile (a label set in HA, the entry
 * dragged onto an area) stays. Labels: the user's ticks and unticks, applied to the labels the entry
 * has now.
 */
export function entryFormChanges(options: {
  form: EntryFormValues;
  base: EntryFormValues;
  currentLabelIds: readonly string[];
}): EntryChanges {
  const { form, base, currentLabelIds } = options;
  const changes: EntryChanges = {};

  if (form.name.trim() !== base.name) changes.name = form.name;
  if (form.icon.trim() !== base.icon) changes.icon = form.icon;
  if (form.areaId !== base.areaId) changes.areaId = form.areaId;

  const added = form.labelIds.filter((id) => !base.labelIds.includes(id));
  const removed = base.labelIds.filter((id) => !form.labelIds.includes(id));
  if (added.length > 0 || removed.length > 0) {
    changes.labelIds = [
      ...currentLabelIds.filter((id) => !removed.includes(id)),
      ...added.filter((id) => !currentLabelIds.includes(id)),
    ];
  }

  return changes;
}
