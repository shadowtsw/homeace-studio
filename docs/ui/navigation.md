# Navigation column

The left column. It holds the special nodes at the top, a switch between **folders** (HA categories) and
**areas**, and the tree of the chosen mode. A selected node filters the [list](list.md).

## Where what lives

| What | File |
| --- | --- |
| Column frame: special nodes, mode switch, folder heading, folder tree, "Ohne Kategorie" | `components/categories/CategoryTree.vue` |
| One folder (recursive): twisty, icon with color, count, hover actions, drop target, sorting by drag | `components/categories/CategoryTreeNode.vue` |
| Area view: list of areas, "Ohne Bereich", tidy-up card | `components/areas/AreaNav.vue`, `AreaNavNode.vue` |
| Hints above the folders (AI plans, tidy-up assistant) | `components/ai/AiPlanHint.vue`, `components/cleanup/CleanupHint.vue` (slot `#notices`) |
| Folder tree from category paths | `utils/categories/categoryTree.ts` (`buildCategoryTree`, `flattenCategoryPaths`) |
| Own folder order | `utils/categories/folderOrder.ts` (`applyFolderOrder`, `moveSibling`, `parentOf`) |
| Path helpers (same rules as the backend) | `utils/categories/categoryPath.ts` (`isSameOrBelow`, `replacePathPrefix`, `folderColor`, …) |
| Empty folders, colors and order (overlay) | `stores/foldersStore.ts`, `services/foldersService.ts` |
| Dropping list rows on a node | `composables/dragDrop/useEntryDropTarget.ts`, `utils/dragDrop.ts` |
| Dragging a folder to sort it among its siblings | `composables/dragDrop/useFolderDrag.ts` (`useFolderDrag`, state in `draggedFolder`) |

## Selections

`studio.category` holds the selected node as a string:

| Value | Meaning |
| --- | --- |
| `"Haus/Terrasse"` | a folder; includes everything below it (`Haus` matches `Haus/Terrasse`, not `Hausflur`) |
| `CATEGORY_FILTER.all` / `.favorites` / `.uncategorized` | special nodes (`__all`, …) |
| `CATEGORY_FILTER.checkup` | not a filter: the list column shows `CheckupList` instead of `EntryList` |
| `areaFilter(areaId)` → `"__area:<id>"`, `areaFilter(null)` → `"__area:"` | an area, or "no area" |

Use `isSpecialCategory()` and `areaOfFilter()` from `utils/entries/entryFilter.ts` to tell them apart. Never
compare against the prefix by hand. Changing the selection or the scope tab clears the ticked rows
(`studioStore`).

## Folder tree

- Built in `useStudioData.tree`: `buildCategoryTree(paths of the chosen filters, saved empty folders, paths
  of all scopes)`, then `applyFolderOrder`. Counts follow the filters (plain entities count while
  "Entitäten" is chosen), but folders of other scopes stay, so the tree keeps its shape when you switch.
  Folders that only hold plain entities are part of the shape too.
- Node flags (`CategoryNode`): `isFolderOnly` (no entry directly here; HA has no such category),
  `isSavedFolder` (user's empty folder from the overlay), `isCategory` (HA has this category in some scope).
- Only a saved, empty folder without children and without an HA category can be deleted (`canDelete`).
  Folders with entries disappear with their last entry.
- Expanded nodes are local UI state of `CategoryTree` (`expandedPaths`). Selecting a node from elsewhere
  (a new folder, the list) opens the tree down to it.
- Hover actions on a node: new subfolder, color, rename (dialog), delete. Double-clicking the name renames
  it inline (`InlineNameInput`, `actions.inlineRenamingPath`).
- Colors are inherited: `folderColor()` takes the nearest colored parent.

## Drag and drop

Two kinds of drags, told apart by their own MIME types:

- **Plain entity → node** (`PLAIN_ENTITY_DRAG_TYPE`): puts the entity into that folder, or takes it out on
  "Ohne Kategorie" (`actions.moveEntity`, `POST /api/entities/:id/move`). Areas do not take plain
  entities: `useEntryDropTarget` only accepts them where a second handler is given.
- **List row → node** (`ENTRY_DRAG_TYPE`): moves the entry into that folder, or onto "Ohne Kategorie"
  (`path` null). If the row is ticked together with others, all ticked rows move (`dropEntry` in
  StudioNav). In the area view, dropping sets the entry's own area (`dropOnArea`).
- **Folder → sibling folder** (`FOLDER_DRAG_TYPE`): sorts folders, only among siblings. Browsers hide drag
  data during `dragover`, so the dragged path is in the module ref `draggedFolder`. StudioNav
  `reorderFolder` saves the whole sibling list (`actions.saveOrder`). "A–Z" in the heading resets the order
  (it only shows while an own order exists).

## Area view

- `settings.navMode` (`folders` | `areas`) is kept in the browser. Switching to areas selects the first
  area. Switching back turns an area selection into "all" (`setNavMode`).
- `useStudioData.areaNav` lists every HA area, also empty ones (they are drop targets). Areas with entries
  in the scope come first, then the rest by name. An entry counts in each area it belongs to: its own area,
  or derived ones, see [../features/areas.md](../features/areas.md).
- The tidy-up card ("Ordnung in einem Klick") shows while entries without a folder have an area
  (`looseAreaCount`). It opens `AreaTidyDialog`.

## Pitfalls

- A folder path is also the HA category name. Renaming a folder renames HA categories in every scope,
  see [../features/folders.md](../features/folders.md).
- `CategoryTreeNode` re-emits every event of its children. A new event has to be added at both levels
  (`CategoryTreeNode` → `CategoryTree` → StudioNav).
