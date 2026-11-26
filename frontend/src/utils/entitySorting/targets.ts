import type { BundleChoice, SortingGroup, Suggestion } from "./model";

/** The folder a group stands for now: a new folder may have been renamed by the user. */
export function groupTarget(
  group: SortingGroup,
  groupNames: ReadonlyMap<string, string>,
): string | null {
  return group.type === "new" ? (groupNames.get(group.key) ?? group.target) : group.target;
}

/** The suggestion moved on since the list was ordered: it now names another folder. */
export function hasNewTarget(suggestion: Suggestion, group: SortingGroup | undefined): boolean {
  if (!group || group.type === "system") return false;

  return (
    suggestion.confidence !== "unclear" && !!suggestion.target && suggestion.target !== group.target
  );
}

/**
 * Where a bundle goes when ticked: the user's own pick, else a newer suggestion, else its group's
 * folder. Null when nothing fits (the rest group), then it cannot be ticked until a folder is picked.
 */
export function effectiveTarget(input: {
  choice: BundleChoice | undefined;
  suggestion: Suggestion | undefined;
  group: SortingGroup | undefined;
  groupNames: ReadonlyMap<string, string>;
}): string | null {
  const { choice, suggestion, group, groupNames } = input;

  if (choice?.target) return choice.target;
  if (!suggestion) return null;
  if (!group) return suggestion.confidence !== "unclear" ? suggestion.target : null;
  if (group.type === "system" || hasNewTarget(suggestion, group)) return suggestion.target;
  if (group.type === "rest") return null;

  return groupTarget(group, groupNames);
}
