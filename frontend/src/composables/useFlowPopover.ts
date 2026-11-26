import { ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { useFlowTexts } from "@/composables/texts/useFlowTexts";
import type {
  AddTarget,
  BlockType,
  ChipEdit,
  ChoiceOption,
  ConfigPath,
  DisplayBlock,
  EditorCatalog,
  FlowChange,
} from "@/types/editor";
import { blockTypes, newBlock } from "@/utils/flow/blockTypes";

/**
 * The open popover. Without `onPick` it edits the value at `edit.path`; menus (block menu, type
 * picker, "+ Option") set `onPick` to handle the choice themselves. `key` remounts the popover
 * for every new opening.
 */
export type OpenEdit = {
  key: number;
  edit: ChipEdit;
  anchor: HTMLElement;
  onPick?: (value: string) => void;
};

export type OpenMenuOptions = {
  title: string;
  options: ChoiceOption[];
  anchor: HTMLElement;
  /** Gets the value of the chosen option. */
  onPick: (value: string) => void;
};

/** Block menu actions, as the values of its choice list. */
const BLOCK_ACTION = {
  up: "up",
  down: "down",
  duplicate: "duplicate",
  toggle: "toggle",
  remove: "remove",
} as const;

type UseFlowPopoverOptions = {
  catalog: Ref<EditorCatalog | null>;
  isTechnicalDetailsVisible: Ref<boolean>;
  /** Sends one change to the flow; only the draft changes, not HA. */
  onChange: (change: FlowChange) => void;
};

/**
 * The one popover of the flow view: the value editor of a chip, and the menus (block menu, block
 * types, "+ Option") that are a list to pick from.
 */
export function useFlowPopover({
  catalog,
  isTechnicalDetailsVisible,
  onChange,
}: UseFlowPopoverOptions) {
  const { t, te } = useI18n();
  const flowTexts = useFlowTexts();
  const openEdit = ref<OpenEdit | null>(null);
  let nextKey = 1;

  function openEditor({ edit, anchor }: { edit: ChipEdit; anchor: HTMLElement }): void {
    openEdit.value = { key: nextKey++, edit, anchor };
  }

  /** A popover that is just a list to pick from; `onPick` gets the value of the chosen option. */
  function openMenu({ title, options, anchor, onPick }: OpenMenuOptions): void {
    const menu: ChipEdit = {
      path: [],
      title,
      editor: { type: "choice", options, isMultiple: false },
      value: undefined,
      isRemovable: false,
    };

    openEdit.value = { key: nextKey++, edit: menu, anchor, onPick };
  }

  /** "+ Option": pick a field, then its editor opens at the same place. */
  function openAddMenu({ fields, anchor }: { fields: ChipEdit[]; anchor: HTMLElement }): void {
    const options = fields.map((field, index) => ({ value: String(index), label: field.title }));

    openMenu({
      title: t("flow.edit.add"),
      options,
      anchor,
      onPick: (value) => {
        const field = fields[Number(value)];
        if (field) openEditor({ edit: field, anchor });
      },
    });
  }

  function openBlockMenu({ block, anchor }: { block: DisplayBlock; anchor: HTMLElement }): void {
    // Moving up or down only where there is room
    const { listPath, index, count } = block.position;
    const canMoveUp = index > 0;
    const canMoveDown = index < count - 1;
    const upOptions = canMoveUp
      ? [{ value: BLOCK_ACTION.up, label: t("flow.block.up"), icon: "mdi-arrow-up" }]
      : [];
    const downOptions = canMoveDown
      ? [{ value: BLOCK_ACTION.down, label: t("flow.block.down"), icon: "mdi-arrow-down" }]
      : [];

    // The full menu
    const options: ChoiceOption[] = [
      ...upOptions,
      ...downOptions,
      { value: BLOCK_ACTION.duplicate, label: t("flow.block.duplicate"), icon: "mdi-content-copy" },
      {
        value: BLOCK_ACTION.toggle,
        label: block.isDisabled ? t("flow.block.enable") : t("flow.block.disable"),
        icon: block.isDisabled ? "mdi-play-circle-outline" : "mdi-pause-circle-outline",
      },
      {
        value: BLOCK_ACTION.remove,
        label: t("flow.block.remove"),
        icon: "mdi-delete-outline",
        isDanger: true,
      },
    ];

    openMenu({
      title: t("flow.block.menu"),
      options,
      anchor,
      onPick: (value) => closeAndEmit(blockChange({ action: value, listPath, index })),
    });
  }

  /** Hand-made types first, then everything HA describes; the search field finds the rest. */
  function openTypePicker({ target, anchor }: { target: AddTarget; anchor: HTMLElement }): void {
    // The types, and how often each label occurs
    const types = blockTypes({
      section: target.section,
      catalog: catalog.value,
      titles: flowTexts.value.titles,
    });
    const labelCount = new Map<string, number>();
    for (const type of types) labelCount.set(type.label, (labelCount.get(type.label) ?? 0) + 1);

    // "Einschalten" exists for lights, switches and scripts alike; the kind tells them apart.
    const kindOf = (key: string): string | undefined => {
      const domain = key.split(".")[0] ?? "";
      return te(`picker.kinds.${domain}`) ? t(`picker.kinds.${domain}`) : undefined;
    };
    const subOf = (type: BlockType): string | undefined => {
      if (isTechnicalDetailsVisible.value) return type.key;
      const isAmbiguous = (labelCount.get(type.label) ?? 0) > 1;

      return isAmbiguous ? kindOf(type.key) : undefined;
    };
    const options = types.map((type, index) => ({
      value: String(index),
      label: type.label,
      icon: type.icon,
      sub: subOf(type),
    }));

    // The chosen type goes to the end of the list
    openMenu({
      title: t(`flow.addTitle.${target.section}`),
      options,
      anchor,
      onPick: (value) => {
        const type = types[Number(value)];
        if (!type) return;

        closeAndEmit({
          type: "insert",
          listPath: target.listPath,
          item: newBlock({ section: target.section, type, catalog: catalog.value }),
        });
      },
    });
  }

  function closeAndEmit(change: FlowChange | null): void {
    openEdit.value = null;
    if (change) onChange(change);
  }

  function close(): void {
    openEdit.value = null;
  }

  /** The popover's value: a menu handles it itself, an editor sets it at its path. */
  function apply(value: unknown): void {
    const current = openEdit.value;

    if (!current) return;

    if (current.onPick) {
      current.onPick(String(value));
      return;
    }

    closeAndEmit({ type: "set", path: current.edit.path, value });
  }

  /** "All lights in the living room": the target gets the area, its entity list goes. */
  function applyArea({ areaPath, areaId }: { areaPath: ConfigPath; areaId: string }): void {
    const current = openEdit.value;

    if (!current) return;

    closeAndEmit({ type: "set", path: areaPath, value: areaId });
    onChange({ type: "set", path: current.edit.path, value: undefined });
  }

  return {
    openEdit,
    openEditor,
    openMenu,
    openAddMenu,
    openBlockMenu,
    openTypePicker,
    closeAndEmit,
    close,
    apply,
    applyArea,
  };
}

/** The change a block menu action stands for; null for an unknown action. */
function blockChange({
  action,
  listPath,
  index,
}: {
  action: string;
  listPath: ConfigPath;
  index: number;
}): FlowChange | null {
  switch (action) {
    case BLOCK_ACTION.up:
      return { type: "move", listPath, from: index, to: index - 1 };
    case BLOCK_ACTION.down:
      return { type: "move", listPath, from: index, to: index + 1 };
    case BLOCK_ACTION.duplicate:
      return { type: "duplicate", listPath, index };
    case BLOCK_ACTION.toggle:
      return { type: "toggle", listPath, index };
    case BLOCK_ACTION.remove:
      return { type: "remove", listPath, index };
    default:
      return null;
  }
}
