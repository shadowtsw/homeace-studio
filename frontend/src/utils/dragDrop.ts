/** Own MIME type, so only our list rows count as droppable on the tree (not files or text). */
export const ENTRY_DRAG_TYPE = "application/x-homeace-entity";

/** The part of DataTransfer we use; keeps the helpers testable without a browser. */
type EntryTransfer = Pick<DataTransfer, "types" | "getData" | "setData">;

export type SetDraggedEntityOptions = {
  transfer: EntryTransfer;
  entityId: string;
};

/** Puts an entity ID on a drag that starts at a list row. */
export function setDraggedEntity({ transfer, entityId }: SetDraggedEntityOptions): void {
  transfer.setData(ENTRY_DRAG_TYPE, entityId);
}

/**
 * Whether a drag carries one of our entries. Works during dragover, where browsers only reveal
 * the types and not the data itself.
 */
export function carriesEntity(transfer: Pick<DataTransfer, "types"> | null): boolean {
  return transfer !== null && [...transfer.types].includes(ENTRY_DRAG_TYPE);
}

/** The dragged entity ID on drop, or null when the drag came from somewhere else. */
export function getDraggedEntity(transfer: EntryTransfer | null): string | null {
  if (!transfer || !carriesEntity(transfer)) return null;

  return transfer.getData(ENTRY_DRAG_TYPE) || null;
}

/**
 * Own MIME type for plain entities (lights, sensors …) dragged from the list. They can go onto a
 * folder (moved) or into a flow or scene (copied as a new block), so their drag allows both.
 */
export const PLAIN_ENTITY_DRAG_TYPE = "application/x-homeace-plain-entity";

export type SetDraggedPlainEntityOptions = {
  transfer: DataTransfer;
  entityId: string;
};

/**
 * Puts a plain entity on a drag; a browser silently refuses a drop whose effect was not allowed.
 */
export function setDraggedPlainEntity({ transfer, entityId }: SetDraggedPlainEntityOptions): void {
  transfer.setData(PLAIN_ENTITY_DRAG_TYPE, entityId);
  transfer.effectAllowed = "copyMove";
}

/** Whether a drag carries a plain entity; works during dragover, where only the types are known. */
export function carriesPlainEntity(transfer: Pick<DataTransfer, "types"> | null): boolean {
  return transfer !== null && [...transfer.types].includes(PLAIN_ENTITY_DRAG_TYPE);
}

/** The dragged plain entity on drop, or null when the drag came from somewhere else. */
export function getDraggedPlainEntity(transfer: EntryTransfer | null): string | null {
  if (!transfer || !carriesPlainEntity(transfer)) return null;

  return transfer.getData(PLAIN_ENTITY_DRAG_TYPE) || null;
}
