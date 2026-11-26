import { computed, nextTick, ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import type {
  BlockSection,
  DisplayFlow,
  EditorCatalog,
  EntityOption,
  FlowChange,
} from "@/types/editor";
import { carriesEntity, carriesPlainEntity } from "@/utils/dragDrop";
import { flashElement } from "@/utils/flash";
import { branchesOf, dropTargets, nextBlockId, type DropTarget } from "@/utils/flow/dropTargets";
import { entityFit, type ChoiceLabel, type EntityChoice } from "@/utils/flow/entityBlocks";

import type { OpenMenuOptions } from "@/composables/flow/useFlowPopover";

import { usePlainEntityDrag } from "./usePlainEntityDrag";

type FlowEntityDropOptions = {
  flow: Ref<DisplayFlow | null>;
  /** The open automation or script; dropping it into itself would loop. */
  selfId: Ref<string>;
  isEditable: Ref<boolean>;
  catalog: Ref<EditorCatalog | null>;
  /** The flow's own menu (FlowView's popover), for the choices and "Wohin genau?". */
  openMenu: (options: OpenMenuOptions) => void;
  emitChange: (change: FlowChange) => void;
};

/** What the sign of a section says while an entity is dragged over the flow. */
export type DropSign = { text: string; isOk: boolean };

/**
 * Dropping a plain entity from the list onto a flow: the innermost list under the pointer wins
 * (a section, or a branch inside it), the section's sign says what happens or why it cannot, and a
 * drop onto a section with branches asks "Wohin genau?" first. Then the entity's choices
 * ("Bewegung erkannt", "Einschalten" …), and the new block goes to the end of that list.
 */
export function useFlowEntityDrop(options: FlowEntityDropOptions) {
  const { flow, selfId, isEditable, catalog, openMenu, emitChange } = options;
  const { t } = useI18n();
  const drag = usePlainEntityDrag();

  /** The list under the pointer while dragging; the template marks it. */
  const hoverKey = ref<string | null>(null);
  const targets = computed(() => (flow.value ? dropTargets(flow.value) : []));

  const targetOf = (key: string | null): DropTarget | undefined =>
    targets.value.find((target) => target.key === key);

  const labelText = (label: ChoiceLabel): string => choiceText({ t, label });

  /** The sign of a section: what a drop does there, or why it cannot. Null while nothing drags. */
  function signFor(section: BlockSection): DropSign | null {
    const entity = drag.dragged.value;
    if (!entity || !isEditable.value) return null;

    // Why not
    if (entity.entityId === selfId.value) return { text: t("flow.drop.why.self"), isOk: false };
    const fit = entityFit({ entity, section, catalog: catalog.value });
    if ("reason" in fit) return { text: t(`flow.drop.why.${fit.reason}`), isOk: false };

    // A branch under the pointer, or a section with branches (then the user picks)
    const hovered = targetOf(hoverKey.value);
    if (hovered?.root === section && hovered.branch) {
      const { label, context } = hovered.branch;
      return { text: t("flow.drop.sign.branch", { branch: label, context }), isOk: true };
    }
    if (
      hovered?.root === section &&
      branchesOf({ targets: targets.value, root: section }).length > 0
    ) {
      return { text: t("flow.drop.sign.pick"), isOk: true };
    }

    return { text: t("flow.drop.sign.new", { what: t(`flow.drop.new.${section}`) }), isOk: true };
  }

  /** The drop list under the pointer, if an entity fits there. */
  function listAt(event: DragEvent): { element: HTMLElement; target: DropTarget } | null {
    const element = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-drop-key]");
    const target = targetOf(element?.dataset.dropKey ?? null);
    const entity = drag.dragged.value;
    if (!element || !target || !entity || entity.entityId === selfId.value) return null;

    const fit = entityFit({ entity, section: target.section, catalog: catalog.value });
    return "reason" in fit ? null : { element, target };
  }

  function onDragOver(event: DragEvent): void {
    // Plain entities and entries (helpers, scripts …) alike; files or text are no target
    const carriesOurs = carriesPlainEntity(event.dataTransfer) || carriesEntity(event.dataTransfer);
    if (!isEditable.value || !carriesOurs) return;

    const hit = listAt(event);
    hoverKey.value = hit?.target.key ?? null;
    if (!hit) return;

    // preventDefault() is what tells the browser "dropping here is allowed".
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  }

  function onDragLeave(event: DragEvent): void {
    const into = event.relatedTarget as Node | null;
    if (!into || !(event.currentTarget as HTMLElement).contains(into)) hoverKey.value = null;
  }

  function onDrop(event: DragEvent): void {
    // Find the target before the marks go away
    const hit = listAt(event);
    const entity = drag.dragged.value;
    hoverKey.value = null;
    drag.markDrop();
    if (!hit || !entity) return;
    event.preventDefault();

    // A section with branches: ask where exactly first
    const anchor = addButtonOf(hit.element);
    const branches = branchesOf({ targets: targets.value, root: hit.target.root });
    if (!hit.target.branch && branches.length > 0) {
      askWhere({ entity, choices: [hit.target, ...branches], anchor });
      return;
    }

    offerChoices({ entity, target: hit.target, anchor });
  }

  /** "Wohin genau?": the section's end or one of its branches, each with where it sits. */
  function askWhere({
    entity,
    choices,
    anchor,
  }: {
    entity: EntityOption;
    choices: DropTarget[];
    anchor: HTMLElement;
  }): void {
    const options = choices.map((target, index) => ({
      value: String(index),
      label: target.branch
        ? t("flow.drop.inBranch", { branch: target.branch.label })
        : t("flow.drop.atEnd"),
      sub: target.branch ? target.branch.context : t("flow.drop.atEndHint"),
      isSubPlain: true,
      icon: target.branch ? "mdi-subdirectory-arrow-right" : "mdi-arrow-collapse-down",
    }));

    openMenu({
      title: t("flow.drop.where", { name: entity.shortName }),
      options,
      anchor,
      onPick: (value) => {
        const target = choices[Number(value)];
        if (target) offerChoices({ entity, target, anchor });
      },
    });
  }

  /**
   * One choice goes in at once; several get a menu ("Bewegung erkannt" / "Keine Bewegung mehr").
   */
  function offerChoices({
    entity,
    target,
    anchor,
  }: {
    entity: EntityOption;
    target: DropTarget;
    anchor: HTMLElement;
  }): void {
    const fit = entityFit({ entity, section: target.section, catalog: catalog.value });
    if ("reason" in fit) return;

    const [only] = fit.choices;
    if (fit.choices.length === 1 && only) {
      insert({ target, choice: only });
      return;
    }

    const choiceOptions = fit.choices.map((choice, index) => ({
      value: String(index),
      label: labelText(choice.label),
      ...(choice.sub ? { sub: labelText(choice.sub), isSubPlain: true } : {}),
    }));
    const title = target.branch ? `${entity.shortName} · ${target.branch.label}` : entity.shortName;

    openMenu({
      title,
      options: choiceOptions,
      anchor,
      onPick: (value) => {
        const choice = fit.choices[Number(value)];
        if (choice) insert({ target, choice });
      },
    });
  }

  /** The new block goes to the end of the list; it flashes so the eye finds it. */
  function insert({ target, choice }: { target: DropTarget; choice: EntityChoice }): void {
    const id = nextBlockId(target);
    emitChange({ type: "insert", listPath: target.listPath, item: choice.item });

    void nextTick(() => {
      const block = document.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(id)}"]`);
      block?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      flashElement(block);
    });
  }

  return { hoverKey, signFor, onDragOver, onDragLeave, onDrop, offerChoices, targets };
}

export type ChoiceTextOptions = {
  t: (key: string, params: Record<string, string>) => string;
  label: ChoiceLabel;
};

/** The text of a choice: HA's own name for an action, else ours (`flow.drop.choice`). */
export function choiceText({ t, label }: ChoiceTextOptions): string {
  return "text" in label ? label.text : t(`flow.drop.choice.${label.key}`, label.params ?? {});
}

/** The list's own "+" button: the menus open there, like adding by hand. */
function addButtonOf(list: HTMLElement): HTMLElement {
  const buttons = [...list.querySelectorAll<HTMLElement>(".add-block-button")];
  const own = buttons.find((button) => button.closest("[data-drop-key]") === list);

  return own ?? list;
}
