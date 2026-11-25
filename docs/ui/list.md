# List column

The middle column. It shows the entries of the selected [navigation](navigation.md) node, grouped by
folder, with search, scope tabs, a "Neu" menu and bulk actions. A click opens the entry in the
[detail](detail.md).

## Where what lives

| What | File |
| --- | --- |
| Column: title with breadcrumb, "Neu" menu, search, bulk bar, groups | `components/entries/EntryList.vue` |
| Filter bar (combinable: Strg/⌘+Klick, right-click menu, long press on touch) | `components/entries/ListScopeTabs.vue`, rules in `utils/listScopes.ts` |
| One plain entity (light, sensor …): drag source, click offers its folder | `components/entries/EntityListRow.vue` |
| Which plain entities a view shows, groups of entries + entities | `utils/entityList.ts` (`filterListEntities`, `groupListItems`) |
| One row: checkbox, icon, name (inline rename), star, unsaved dot, quick actions, drag source | `components/entries/EntryListRow.vue` |
| Check-up instead of the list (node "Check-up") | `components/checkup/CheckupList.vue` |
| Filter, search, counts, grouping, which groups start open | `utils/entryFilter.ts` |
| The filtered entries and the scope counts | `composables/useStudioData.ts` (`visibleEntries`, `scopeCounts`) |
| Which quick actions a row offers | `utils/entryActions.ts` (`supportsAction`, `canToggle`, `canDuplicate`) |
| Area view notes per row ("über Bewegungsmelder · auch in Garten") | `utils/areaNotes.ts`, `areaView` in StudioView |

## Filtering

`filterEntries(entries, { scopes, category, search, areaIdsOf })` applies, in this order:

1. **Filters** (`studio.scopes`): `all`, single kinds and `entities`, combinable. A plain click chooses
   only that filter; Strg+Klick (Mac ⌘+Klick, because Ctrl+click is the right-click there), the
   right-click menu or a long press on touch add or remove one (`toggleScope`). "Alle" and single kinds
   exclude each other; "Alle" means all **entries**, plain entities only show with their own filter, so
   "Alle" stays usable in a big HA. The choice is kept in the browser (`homeace.scopes`).
2. **Tree selection** (`isInCategory`, see the selection table in [navigation.md](navigation.md)).
3. **Search** (`matchesSearch`): name or entity ID, case-insensitive. The search is simpler than the
   entity picker's (no umlaut folding).

The numbers on the filters come from the same filter without the scopes (`scopeCounts`, `entities` from
`filterListEntities`). The tree counts ignore the search.

## Plain entities

With the filter "Entitäten" chosen, HA's plain entities (from `GET /api/entities`, minus the entries) join
the list:

- A folder shows the entities sorted into it, after its entries (`groupListItems`); entities without a
  folder belong to "Ohne Kategorie". In the area view, an area shows the entities HA puts there (own area
  or the device's). Favorites and the check-up never show entities.
- Search covers name, entity ID, device and area.
- A group shows 150 entities at first, then "Weitere … anzeigen" (`ENTITY_PAGE`), so a big HA stays fast.
- A row is a `div role="button"`, not a `button`: browsers (Firefox at all) do not start a drag from a
  button. Its drag allows `copyMove` (onto a folder it moves, into a flow it will copy); a browser
  silently refuses a drop whose effect the drag did not allow.
- Clicking a row opens the entity menu (`useEntityMenu`, `QuickMenu`): where it can go in the open
  flow (sections, branches, or why not), then what it does there; plus "In einen Ordner verschieben …"
  (`MoveEntriesDialog` with a title of its own). This is the way on a phone. Dragging into flows and
  scenes: [../features/flow-editor.md](../features/flow-editor.md), [../features/scenes.md](../features/scenes.md).
- Entities without a registry entry (YAML without `unique_id`) cannot have a folder; they say so.

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
- **Unsaved dot:** `unsavedIds` in StudioView, the entries with flow drafts (`editorStore`) plus helper
  and scene drafts (`draftsStore`).
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

- The search field is a `v-model` on `studio.search`; the filters go through `studio.selectScope` /
  `studio.toggleListScope`. Don't keep a copy in the component.
- Arrow-key navigation is a `window` listener in `EntryList`. It skips inputs and dialogs. New
  keyboard-driven UI has to do the same.
