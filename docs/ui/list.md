# List column

The middle column. It shows the entries of the selected [navigation](navigation.md) node, grouped by
folder, with search, scope tabs, a "Neu" menu and bulk actions. A click opens the entry in the
[detail](detail.md).

## Where what lives

| What | File |
| --- | --- |
| Column: title with breadcrumb, "Neu" menu, search, bulk bar, scope tabs, groups | `components/entries/EntryList.vue` |
| One row: checkbox, icon, name (inline rename), star, unsaved dot, quick actions, drag source | `components/entries/EntryListRow.vue` |
| Check-up instead of the list (node "Check-up") | `components/checkup/CheckupList.vue` |
| Filter, search, counts, grouping, which groups start open | `utils/entryFilter.ts` |
| The filtered entries and the scope counts | `composables/useStudioData.ts` (`visibleEntries`, `scopeCounts`) |
| Which quick actions a row offers | `utils/entryActions.ts` (`supportsAction`, `canToggle`, `canDuplicate`) |
| Area view notes per row ("über Bewegungsmelder · auch in Garten") | `utils/areaNotes.ts`, `areaView` in StudioView |

## Filtering

`filterEntries(entries, { scope, category, search, areaIdsOf })` applies, in this order:

1. **Scope tab** (`studio.scope`: `all` or one kind).
2. **Tree selection** (`isInCategory`, see the selection table in [navigation.md](navigation.md)).
3. **Search** (`matchesSearch`): name or entity ID, case-insensitive. The search is simpler than the
   entity picker's (no umlaut folding).

The numbers on the scope tabs come from the same filter without the scope (`scopeCounts`). The tree counts
ignore the search.

## Groups

- `groupByCategory` makes one group per category path, sorted by path. Uncategorized entries come last.
- Inside a real folder, group headers show the path relative to it ("Direkt in Haus", "Terrasse › Licht").
- `isGroupOpenByDefault`: inside a folder, only its own entries start open, so subfolders read as an
  overview. "All" starts collapsed as well. Favorites and "Ohne Kategorie" start open. The group of the open
  entry and all search results are always open, and so is a list with only one group.
- Groups opened or closed by hand (`toggledGroups`) reset when another node is selected.

## Rows and selection

- **Ticking:** the checkbox ticks one row, shift-click ticks a range from the last clicked row (taking the
  clicked row's new state, so it can untick a range too). "Alle" ticks the visible rows. Only registry
  entries can be ticked or dragged (`isInRegistry`). The bulk bar offers move, set area and take out of
  the folder.
- **Inline rename:** double-click on the name, the pencil, or F2. `studio.renaming = { entityId, place:
  "list" | "title" }` says where the input is.
- **Quick actions:** on/off switch (`canToggle`), run (`supportsAction(run)`), duplicate (automations,
  scripts, storage helpers).
- **Unsaved dot:** `editorStore.unsavedIds`, the entries with flow drafts.
- **Subtitle:** kind and area. Technical details show the entity ID instead. In the area view, the area
  note replaces the area.

## "Neu" menu

Automation, script, helper, then "new folder", or "new subfolder" while a real folder is selected.
StudioView `onCreate` opens `NewFlowDialog` (automation, script) or `NewHelperDialog`. A new entry is
created in the current folder and opened (`@created` → `selectEntry`).

## Check-up node

While `studio.category === CATEGORY_FILTER.checkup`, the column shows `CheckupList`: findings grouped by
kind, with ignore and restore. It reloads on mount. See [../features/checkup.md](../features/checkup.md).

## Pitfalls

- The search field and the scope tabs are `v-model`s on `studio.search` / `studio.scope`. Don't keep a
  copy in the component.
- Arrow-key navigation is a `window` listener in `EntryList`. It skips inputs and dialogs. New
  keyboard-driven UI has to do the same.
