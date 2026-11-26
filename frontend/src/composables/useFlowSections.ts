import { computed, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import type { DropSign } from "@/composables/dragDrop/useFlowEntityDrop";
import type { AddTarget, BlockSection, DisplayBlock, DisplayFlow, FlowKind } from "@/types/editor";

export type FlowSection = {
  key: "when" | "if" | "then";
  title: string;
  hint: string;
  empty: string;
  blocks: DisplayBlock[];
  add: AddTarget;
};

type UseFlowSectionsOptions = {
  flow: Ref<DisplayFlow | null>;
  kind: Ref<FlowKind>;
  /** The sign a section shows while an entity is dragged over the flow; null otherwise. */
  signFor: (section: BlockSection) => DropSign | null;
};

/**
 * The sections of a flow: "Wenn", "Und nur wenn" and "Dann" for an automation, only the sequence
 * for a script. While an entity is dragged, each section has its sign.
 */
export function useFlowSections({ flow, kind, signFor }: UseFlowSectionsOptions) {
  const { t } = useI18n();

  const sections = computed((): FlowSection[] => {
    const current = flow.value;

    if (!current) return [];

    const actions: FlowSection = {
      key: "then",
      title: kind.value === "script" ? t("flow.sequence") : t("flow.thenSection"),
      hint: t("flow.thenHint"),
      empty: t("flow.noActions"),
      blocks: current.actions,
      add: current.add.actions,
    };

    // Scripts have no triggers or conditions of their own, only a sequence.
    if (kind.value === "script") return [actions];

    return [
      {
        key: "when",
        title: t("flow.when"),
        hint: t("flow.whenHint"),
        empty: t("flow.noTriggers"),
        blocks: current.triggers,
        add: current.add.triggers,
      },
      {
        key: "if",
        title: t("flow.if"),
        hint: t("flow.ifHint"),
        empty: t("flow.noConditions"),
        blocks: current.conditions,
        add: current.add.conditions,
      },
      actions,
    ];
  });

  /** The sign of each section while an entity is dragged; none otherwise. */
  const dropSigns = computed(() =>
    Object.fromEntries(
      sections.value.map((section) => [section.key, signFor(section.add.section)]),
    ),
  );

  return { sections, dropSigns };
}
