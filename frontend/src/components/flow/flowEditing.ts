import type { ComputedRef, InjectionKey, Ref } from "vue";

import type { AddTarget, ChipEdit, DisplayBlock } from "@/types/editor";
import type { BlockRunState } from "@/utils/runs/runStates";

/**
 * What FlowView hands down to every (nested) FlowBlock, so chips and menus can open their popover
 * without passing events up through each level of nesting.
 */
export type FlowEditing = {
  /** False for read-only flows: chips are plain text, menus and add buttons are hidden. */
  isEditable: Ref<boolean>;
  /** Opens the value editor next to the clicked chip. */
  openEditor: (options: { edit: ChipEdit; anchor: HTMLElement }) => void;
  /** Opens the list of optional fields that can be added to a block. */
  openAddMenu: (options: { fields: ChipEdit[]; anchor: HTMLElement }) => void;
  /** Opens the ⋮ menu of a block: move, duplicate, disable, delete. */
  openBlockMenu: (options: { block: DisplayBlock; anchor: HTMLElement }) => void;
  /** Opens the list of block types to add to a list. */
  openTypePicker: (options: { target: AddTarget; anchor: HTMLElement }) => void;
  /** The list a dragged entity would land in (`data-drop-key`); null while nothing drags. */
  dropHoverKey: Ref<string | null>;
};

export const FLOW_EDITING: InjectionKey<FlowEditing> = Symbol("flowEditing");

/** What every block did in the run shown on the flow; null for the plain flow. */
export const FLOW_RUN_STATES: InjectionKey<ComputedRef<ReadonlyMap<string, BlockRunState> | null>> =
  Symbol("flowRunStates");
