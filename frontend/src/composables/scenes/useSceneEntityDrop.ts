import { computed, nextTick, ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { carriesEntity, carriesPlainEntity } from "@/utils/dragDrop";
import { flashElement } from "@/utils/flash";
import { sceneMisfit } from "@/utils/flow/entityBlocks";

import { usePlainEntityDrag } from "../dragDrop/usePlainEntityDrag";
import type { DropSign } from "../dragDrop/useFlowEntityDrop";

type SceneEntityDropOptions = {
  isEditable: Ref<boolean>;
  /** The devices in the scene now. */
  deviceIds: Ref<string[]>;
  /** Adds a device with its current state, like "+ Gerät hinzufügen" (switches nothing). */
  add: (entityId: string) => Promise<void>;
};

/**
 * Dropping a plain entity from the list onto a scene's devices: it joins with its current state,
 * like "+ Gerät hinzufügen". One already in the scene lights up instead of a second row; sensors
 * and measured values say why they cannot.
 */
export function useSceneEntityDrop({ isEditable, deviceIds, add }: SceneEntityDropOptions) {
  const { t } = useI18n();
  const drag = usePlainEntityDrag();
  const isDropOver = ref(false);

  /** While an entity is dragged: what a drop does here, or why it cannot. */
  const sign = computed((): DropSign | null => {
    const entity = drag.dragged.value;
    if (!entity || !isEditable.value) return null;

    const misfit = sceneMisfit(entity);
    if (misfit) return { text: t(`flow.drop.why.${misfit}`), isOk: false };

    const isAlreadyIn = deviceIds.value.includes(entity.entityId);
    return { text: isAlreadyIn ? t("scene.drop.already") : t("scene.drop.add"), isOk: true };
  });

  function onDragOver(event: DragEvent): void {
    const carriesOurs = carriesPlainEntity(event.dataTransfer) || carriesEntity(event.dataTransfer);
    if (!carriesOurs || !sign.value?.isOk) return;

    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    isDropOver.value = true;
  }

  function onDragLeave(event: DragEvent): void {
    const into = event.relatedTarget as Node | null;
    if (!into || !(event.currentTarget as HTMLElement).contains(into)) isDropOver.value = false;
  }

  async function onDrop(event: DragEvent): Promise<void> {
    const entity = drag.dragged.value;
    const canDrop = sign.value?.isOk === true;
    isDropOver.value = false;
    drag.markDrop();
    if (!entity || !canDrop) return;
    event.preventDefault();

    // A new device joins; one already there is shown instead
    if (!deviceIds.value.includes(entity.entityId)) await add(entity.entityId);
    await nextTick();
    const row = document.querySelector<HTMLElement>(
      `[data-scene-device="${CSS.escape(entity.entityId)}"]`,
    );
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    flashElement(row);
  }

  return { sign, isDropOver, onDragOver, onDragLeave, onDrop };
}
