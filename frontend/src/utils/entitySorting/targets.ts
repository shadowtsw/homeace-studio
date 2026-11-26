import type { BundleChoice, SortingBundle, SortingGroup, SortingLayout, Suggestion } from "./model";

export type GroupTargetOptions = {
  group: SortingGroup;
  groupNames: ReadonlyMap<string, string>;
};

/** The folder a group stands for now: a new folder may have been renamed by the user. */
export function groupTarget({ group, groupNames }: GroupTargetOptions): string | null {
  return group.type === "new" ? (groupNames.get(group.key) ?? group.target) : group.target;
}

export type HasNewTargetOptions = {
  suggestion: Suggestion;
  group: SortingGroup | undefined;
};

/** The suggestion moved on since the list was ordered: it now names another folder. */
export function hasNewTarget({ suggestion, group }: HasNewTargetOptions): boolean {
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
  if (group.type === "system" || hasNewTarget({ suggestion, group })) return suggestion.target;
  if (group.type === "rest") return null;

  return groupTarget({ group, groupNames });
}

export type FolderChoicesOptions = {
  /** The folders HA has. */
  folders: Iterable<string>;
  /** The groups that propose a new folder. */
  freshGroups: SortingGroup[];
  groupNames: ReadonlyMap<string, string>;
};

/** Existing folders and the new ones of this session, sorted, for "Anderer Ordner …". */
export function folderChoices({
  folders,
  freshGroups,
  groupNames,
}: FolderChoicesOptions): string[] {
  const paths = new Set(folders);
  freshGroups.forEach((group) => {
    const target = groupTarget({ group, groupNames });
    if (target) paths.add(target);
  });

  return [...paths].sort((first, second) => first.localeCompare(second));
}

export type SuggestionSection = {
  key: "folder" | "fresh" | "system" | "rest";
  /** i18n key of the heading. */
  title: string;
  /** i18n key of the line under it. */
  note: string;
  groups: SortingGroup[];
};

export type SuggestionSectionsOptions = {
  layout: SortingLayout;
  /** Whether the filters and the search let a bundle through. */
  isVisible: (bundle: SortingBundle) => boolean;
};

/**
 * The four sections of step 3: existing folders, new folders, system, and the rest. A section
 * shows only with a row the filters and the search let through.
 */
export function suggestionSections({
  layout,
  isVisible,
}: SuggestionSectionsOptions): SuggestionSection[] {
  const sections: SuggestionSection[] = [
    {
      key: "folder",
      title: "entitySorting.suggestions.sectionFolder",
      note: "entitySorting.suggestions.sectionFolderNote",
      groups: layout.folder,
    },
    {
      key: "fresh",
      title: "entitySorting.suggestions.sectionNew",
      note: "entitySorting.suggestions.sectionNewNote",
      groups: layout.fresh,
    },
    {
      key: "system",
      title: "entitySorting.suggestions.sectionSystem",
      note: "entitySorting.suggestions.sectionSystemNote",
      groups: layout.system ? [layout.system] : [],
    },
    {
      key: "rest",
      title: "entitySorting.suggestions.sectionRest",
      note: "entitySorting.suggestions.sectionRestNote",
      groups: layout.rest ? [layout.rest] : [],
    },
  ];

  return sections
    .map((section) => ({
      ...section,
      groups: section.groups.filter((group) => group.bundles.some(isVisible)),
    }))
    .filter((section) => section.groups.length);
}

/** Every group of the layout, in the order of the sections. */
export function allGroups(layout: SortingLayout): SortingGroup[] {
  return [...layout.folder, ...layout.fresh, layout.system, layout.rest].filter(
    (group): group is SortingGroup => !!group,
  );
}
