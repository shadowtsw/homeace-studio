import { computed, ref, watch, type Ref } from "vue";

import type { Entry, EntryChanges } from "@/types/entry";
import {
  entryFormChanges,
  entryFormValuesOf,
  isFormEdited,
  type EntryFormValues,
} from "@/utils/entries/entryForm";

type UseEntryFormOptions = {
  entry: Ref<Entry>;
  /** Gets only what the user changed since the form was filled. */
  onSave: (changes: EntryChanges) => void;
};

/**
 * The properties form of an entry: name, icon, area and labels. "Changed" always means changed
 * against what the form was filled from, never against HA now, so saving cannot undo something
 * that changed elsewhere while the form was open.
 */
export function useEntryForm({ entry, onSave }: UseEntryFormOptions) {
  const name = ref("");
  const icon = ref("");
  const areaId = ref<string | null>(null);
  const labelIds = ref<string[]>([]);

  /** What the form was filled from. */
  const base = ref<EntryFormValues>(entryFormValuesOf(entry.value));

  const formValues = (): EntryFormValues => ({
    name: name.value,
    icon: icon.value,
    areaId: areaId.value,
    labelIds: labelIds.value,
  });

  /** Fills the form from the entry; runs when another entry opens or after saving. */
  function reset(): void {
    base.value = entryFormValuesOf(entry.value);
    name.value = base.value.name;
    icon.value = base.value.icon;
    areaId.value = base.value.areaId;
    labelIds.value = [...base.value.labelIds];
  }

  /** Set by save(): the next entry from HA is the saved one, so the form takes it over. */
  let isSaving = false;

  // Live updates and changes from elsewhere (renaming in the list) bring a new entry object. The
  // form takes it over unless the user is editing it.
  watch(
    entry,
    (next, previous) => {
      const isOtherEntry = !previous || next.entityId !== previous.entityId;
      const isEdited = isFormEdited({ form: formValues(), base: base.value });

      if (isOtherEntry || isSaving || !isEdited) reset();
      isSaving = false;
    },
    { immediate: true },
  );

  const isDirty = computed(() => isFormEdited({ form: formValues(), base: base.value }));

  /**
   * Sends only what the user changed since the form was filled, so a save never undoes a change
   * made elsewhere meanwhile; ticked and unticked labels are applied to the labels the entry has now.
   */
  function save(): void {
    isSaving = true;
    onSave(
      entryFormChanges({
        form: formValues(),
        base: base.value,
        currentLabelIds: entry.value.labels.map((label) => label.labelId),
      }),
    );
  }

  return { name, icon, areaId, labelIds, isDirty, reset, save };
}
