import { useElementSize } from "@vueuse/core";
import { computed, type ComputedRef, type CSSProperties, type ShallowRef } from "vue";

/** Gap between the floating bar and the list's bottom edge (its `bottom`), plus a little air. */
const DOCK_ROOM_EXTRA_PX = 18;

type DockRoom = {
  /** `--dock-room` for the list body: the bar's height plus air; empty until it is measured. */
  dockRoomStyle: ComputedRef<CSSProperties>;
};

/**
 * The room the floating bar of ticked rows takes at the end of the list. The bar wraps to more
 * lines in some languages and in a narrow list, so its height is measured.
 */
export function useDockRoom(dock: Readonly<ShallowRef<HTMLElement | null>>): DockRoom {
  const { height } = useElementSize(dock, undefined, { box: "border-box" });
  const dockRoomStyle = computed<CSSProperties>(() =>
    height.value > 0 ? { "--dock-room": `${Math.ceil(height.value) + DOCK_ROOM_EXTRA_PX}px` } : {},
  );

  return { dockRoomStyle };
}
