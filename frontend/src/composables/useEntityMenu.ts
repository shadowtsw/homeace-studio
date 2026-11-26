import { nextTick, ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import type { QuickMenuItem } from "@/components/common/QuickMenu.vue";
import type {
  BlockSection,
  DisplayFlow,
  EditorCatalog,
  EntityOption,
  FlowChange,
  FlowKind,
} from "@/types/editor";
import { flashElement } from "@/utils/flash";
import { dropTargets, nextBlockId, type DropTarget } from "@/utils/flow/dropTargets";
import { entityFit, type EntityChoice } from "@/utils/flow/entityBlocks";

import { choiceText } from "./dragDrop/useFlowEntityDrop";

type EntityMenuOptions = {
  /** The open automation or script as shown; null when another kind of entry is open. */
  displayFlow: Ref<DisplayFlow | null>;
  /** The open automation or script; it is no target for itself. */
  flowId: Ref<string | null>;
  flowKind: Ref<FlowKind | null>;
  isFlowEditable: Ref<boolean>;
  isSceneOpen: Ref<boolean>;
  catalog: Ref<EditorCatalog | null>;
  applyChange: (change: FlowChange) => void;
  /** Phone: the details open over the list, so the new block is seen right away. */
  showDetail: () => void;
  startMoveEntity: (entity: EntityOption) => void;
};

type OpenMenu = {
  anchor: HTMLElement;
  title: string;
  items: QuickMenuItem[];
  onPick: (id: string) => void;
};

const FOLDER_ID = "__folder";

/**
 * Clicking (or tapping) a plain entity in the list: where it can go in the open flow (every section
 * and branch, or why not), then what it does there; plus "In einen Ordner verschieben …". This is
 * the way on a phone, where nothing can be dragged next to the flow.
 */
export function useEntityMenu(options: EntityMenuOptions) {
  const { displayFlow, flowId, flowKind, isFlowEditable, isSceneOpen, catalog } = options;
  const { applyChange, showDetail, startMoveEntity } = options;
  const { t } = useI18n();
  const menu = ref<OpenMenu | null>(null);

  const sectionName = (root: BlockSection): string => {
    if (root === "trigger") return t("flow.when");
    if (root === "condition") return t("flow.if");
    return flowKind.value === "script" ? t("flow.sequence") : t("flow.thenSection");
  };

  function open({ entity, anchor }: { entity: EntityOption; anchor: HTMLElement }): void {
    // Where it can go in the open flow
    const flow = isFlowEditable.value ? displayFlow.value : null;
    const targets = flow ? dropTargets(flow) : [];
    const roots: BlockSection[] =
      flowKind.value === "script" ? ["action"] : ["trigger", "condition", "action"];
    const items: QuickMenuItem[] = flow
      ? roots.flatMap((root) => rootItems({ entity, root, targets }))
      : [];

    if (!flow) {
      const hint = isSceneOpen.value ? "entityMenu.sceneHint" : "entityMenu.openFlow";
      items.push({ id: "hint", label: t(hint), icon: "mdi-information-outline", isNote: true });
    }

    // Its folder, if it can have one
    items.push(
      entity.isInRegistry
        ? {
            id: FOLDER_ID,
            label: t("entityMenu.folder"),
            sub: entity.categoryPath
              ? t("entityMenu.folderNow", { path: entity.categoryPath })
              : t("entityMenu.noFolder"),
            icon: "mdi-folder-move-outline",
          }
        : {
            id: "noFolder",
            label: t("entityRow.hintNoFolder"),
            icon: "mdi-folder-off-outline",
            isNote: true,
          },
    );

    menu.value = {
      anchor,
      title: t("entityMenu.title", { name: entity.shortName }),
      items,
      onPick: (id) => {
        if (id === FOLDER_ID) {
          menu.value = null;
          startMoveEntity(entity);
          return;
        }
        const target = targets.find((item) => item.key === id);
        if (target) offerChoices({ entity, target, anchor });
      },
    };
  }

  /** One section: its own line and its branches, or a note why the entity does not fit there. */
  function rootItems({
    entity,
    root,
    targets,
  }: {
    entity: EntityOption;
    root: BlockSection;
    targets: DropTarget[];
  }): QuickMenuItem[] {
    const fit =
      entity.entityId === flowId.value
        ? { reason: "self" }
        : entityFit({ entity, section: root, catalog: catalog.value });
    if ("reason" in fit) {
      const why = t(`flow.drop.why.${fit.reason}`);
      return [
        {
          id: `why:${root}`,
          label: `${sectionName(root)}: ${why}`,
          icon: "mdi-cancel",
          isNote: true,
        },
      ];
    }

    return targets
      .filter((target) => target.root === root)
      .map((target) => ({
        id: target.key,
        label: target.branch
          ? t("flow.drop.inBranch", { branch: target.branch.label })
          : sectionName(root),
        sub: target.branch ? target.branch.context : t(`flow.drop.new.${root}`),
        icon: target.branch ? "mdi-subdirectory-arrow-right" : "mdi-plus-circle-outline",
        depth: target.depth,
      }));
  }

  /** The second step: what it does there ("Bewegung erkannt", "Einschalten" …). */
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

    menu.value = {
      anchor,
      title: target.branch ? `${entity.shortName} · ${target.branch.label}` : entity.shortName,
      items: fit.choices.map((choice, index) => ({
        id: String(index),
        label: choiceText({ t, label: choice.label }),
      })),
      onPick: (id) => {
        const choice = fit.choices[Number(id)];
        if (choice) insert({ target, choice });
      },
    };
  }

  function insert({ target, choice }: { target: DropTarget; choice: EntityChoice }): void {
    const id = nextBlockId(target);
    menu.value = null;
    applyChange({ type: "insert", listPath: target.listPath, item: choice.item });
    showDetail();

    void nextTick(() => {
      const block = document.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(id)}"]`);
      block?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      flashElement(block);
    });
  }

  return {
    menu,
    open,
    pick: (id: string): void => menu.value?.onPick(id),
    close: (): void => {
      menu.value = null;
    },
  };
}
