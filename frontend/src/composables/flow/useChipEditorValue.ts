import { computed, reactive, ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { useLookupsStore } from "@/stores/lookupsStore";
import type { ChipEdit, ChoiceOption, ConfigPath } from "@/types/editor";
import {
  listValue,
  numberValue,
  selectedValues,
  textValue,
  timeValue,
} from "@/utils/flow/editValue";
import { joinDuration, splitDuration } from "@/utils/flow/formatValue";
import { stateSuggestions } from "@/utils/flow/stateSuggestions";

/** Menus without a config path ("Aktion hinzufügen") from this length get the wide two-column form. */
const LONG_MENU = 8;

type UseChipEditorValueOptions = {
  edit: Ref<ChipEdit>;
  /** The new value; undefined removes it. */
  onApply: (value: unknown) => void;
  /** A whole area instead of entities, at the target's area path. */
  onApplyArea: (options: { areaPath: ConfigPath; areaId: string }) => void;
  onClose: () => void;
};

/**
 * The value in the chip editor: picked from a list (entities, areas, fixed choices, yes/no) or
 * typed (text, number, time, duration, template), and what "Übernehmen" sends.
 */
export function useChipEditorValue({
  edit,
  onApply,
  onApplyArea,
  onClose,
}: UseChipEditorValueOptions) {
  const { t, te } = useI18n();
  const lookups = useLookupsStore();

  // What the editor looks like
  const editor = computed(() => edit.value.editor);
  const isLongMenu = computed(
    () =>
      edit.value.path.length === 0 &&
      editor.value.type === "choice" &&
      editor.value.options.length > LONG_MENU,
  );
  const isMultiline = computed(() => editor.value.type === "text" && editor.value.isMultiline);
  const isMultiple = computed(() => {
    const current = editor.value;
    const canPickSeveral =
      current.type === "entity" || current.type === "area" || current.type === "choice";

    return canPickSeveral && current.isMultiple;
  });

  // The value being edited, in the form each input needs
  const selected = ref<string[]>(selectedValues(edit.value.value));
  const isPlainValue = edit.value.value !== undefined && typeof edit.value.value !== "object";
  const text = ref(isPlainValue ? String(edit.value.value) : "");
  const duration = reactive(
    splitDuration(edit.value.value) ?? { hours: 0, minutes: 0, seconds: 0 },
  );

  const choiceLabel = (value: string): string =>
    te(`flow.choices.${value}`) ? t(`flow.choices.${value}`) : value;

  /** Entities, areas and fixed choices are picked from a list; everything else is typed. */
  const listOptions = computed((): ChoiceOption[] | null => {
    const current = editor.value;

    // Entities have their own picker (EntityPicker).
    if (current.type === "entity") return null;

    if (current.type === "area") {
      return lookups.areas.map((area) => ({ value: area.areaId, label: area.name }));
    }

    if (current.type === "choice") return current.options;

    if (current.type === "boolean") {
      return [
        { value: "true", label: t("detail.yes") },
        { value: "false", label: t("detail.no") },
      ];
    }

    return null;
  });

  const suggestions = computed((): ChoiceOption[] => {
    const current = editor.value;

    if (current.type !== "text" || !current.stateOf) return [];

    const states = stateSuggestions({ entityIds: current.stateOf, entities: lookups.entities });

    return states.map((state) => ({ value: state, label: choiceLabel(state) }));
  });

  const inputType = computed(() => {
    const type = editor.value.type;

    if (type === "number") return "number";
    if (type === "time") return "time";
    if (type === "date") return "date";

    return "text";
  });

  const inputStep = computed(() => {
    const current = editor.value;

    if (current.type === "time") return 1;
    if (current.type === "number") return current.step ?? "any";

    return undefined;
  });

  const canRemove = computed(() => edit.value.isRemovable && edit.value.value !== undefined);
  const needsApply = computed(
    () => (listOptions.value === null && editor.value.type !== "entity") || isMultiple.value,
  );

  function pick(value: string): void {
    if (!isMultiple.value) {
      onApply(editor.value.type === "boolean" ? value === "true" : value);
      return;
    }

    selected.value = selected.value.includes(value)
      ? selected.value.filter((item) => item !== value)
      : [...selected.value, value];
  }

  function pickArea(areaId: string): void {
    const current = editor.value;

    if (current.type === "entity" && current.areaPath) {
      onApplyArea({ areaPath: current.areaPath, areaId });
    }
  }

  function applyInput(): void {
    const value = inputValue();

    // A required field cannot be emptied; keep it as it is.
    if (value === undefined && !edit.value.isRemovable) {
      onClose();
      return;
    }

    onApply(value);
  }

  function inputValue(): unknown {
    const current = editor.value;

    if (isMultiple.value)
      return listValue({ selected: selected.value, original: edit.value.value });
    if (current.type === "number") return numberValue(text.value);
    if (current.type === "time") return timeValue(text.value);
    if (current.type === "duration") {
      return joinDuration({
        hours: duration.hours || 0,
        minutes: duration.minutes || 0,
        seconds: duration.seconds || 0,
      });
    }

    return textValue(text.value);
  }

  return {
    editor,
    isLongMenu,
    isMultiline,
    isMultiple,
    selected,
    text,
    duration,
    listOptions,
    suggestions,
    inputType,
    inputStep,
    canRemove,
    needsApply,
    pick,
    pickArea,
    applyInput,
  };
}
