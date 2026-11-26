import type { BlockChip, DisplayBlock, DisplayFlow } from "@/types/editor";

/** Entity IDs a chip edits: one ID or a list of them. */
function chipEntityIds(chip: BlockChip): string[] {
  if (chip.kind !== "entity" || chip.edit?.editor.type !== "entity") return [];

  const value = chip.edit.value;
  const values = Array.isArray(value) ? value : [value];

  return values.filter((item): item is string => typeof item === "string");
}

function markBlock({
  block,
  gone,
}: {
  block: DisplayBlock;
  gone: ReadonlySet<string>;
}): DisplayBlock {
  return {
    ...block,
    chips: block.chips.map((chip) =>
      chipEntityIds(chip).some((id) => gone.has(id)) ? { ...chip, isGone: true } : chip,
    ),
    branches: block.branches.map((branch) => ({
      ...branch,
      blocks: branch.blocks.map((inner) => markBlock({ block: inner, gone })),
    })),
  };
}

export type MarkGoneChipsOptions = {
  flow: DisplayFlow;
  gone: ReadonlySet<string>;
};

/**
 * Marks entity chips that name an entity HA no longer has (from the check-up), so the flow shows
 * them in red. Returns the flow unchanged when nothing is gone.
 */
export function markGoneChips({ flow, gone }: MarkGoneChipsOptions): DisplayFlow {
  if (gone.size === 0) return flow;

  return {
    ...flow,
    triggers: flow.triggers.map((block) => markBlock({ block, gone })),
    conditions: flow.conditions.map((block) => markBlock({ block, gone })),
    actions: flow.actions.map((block) => markBlock({ block, gone })),
  };
}
