# Folders (HA categories)

Folders are HA categories whose names use `/` for levels: `Haus/Terrasse/Beleuchtung` is three levels.
The structure lives in HA, not in an own database. The UI side is in [../ui/navigation.md](../ui/navigation.md).

## Model

- HA has categories **per scope**: `automation`, `script`, `scene`, `helpers` (`CATEGORY_SCOPE_BY_KIND`
  in `backend/src/entries/entries.constants.ts`). A folder "Haus/Terrasse" can be one category in each
  scope. The tree merges them by name.
- **Plain entities** (lights, sensors, …) have no scope in HA. HomeAce Studio uses its own scope
  `homeace_entities` (`CATEGORY_SCOPE.entities`). HA keeps it in its registry and backup but shows it
  nowhere, so HA's label and category lists stay short. Tested on HA 2026.11 (throwaway container):
  created, assigned, still there after a restart. **Never rename the scope**: it is stored in the users'
  HA. Renaming and cleaning up folders include it, because they loop over `CATEGORY_SCOPES`.
- HA only ever holds categories that have entries. A folder without own entries (`Arbeitszimmer` above
  `Arbeitszimmer/Heizung`) exists only in the UI. Empty folders the user created are kept in the overlay
  (`folders`).
- **Owned categories:** when an entry moves into a folder its scope lacks, the backend creates the category
  and adds its id to `overlay.ownedCategoryIds`. When an owned category becomes empty, it is deleted
  (`CategoriesService.cleanUp`). **Categories the user made in HA are never deleted automatically.**
- Path rules, the same in both layers: `backend/src/categories/category-path.ts` and
  `frontend/src/utils/categoryPath.ts` (`isSameOrBelow` on whole levels, `replacePathPrefix`). The backend
  also normalizes input (`normalizeCategoryPath`: trims every level, `" Haus / Pool "` → `"Haus/Pool"`).

Verified against HA 2026.11.2 (`poc/categories-test.mjs`): in all four scopes HA stores names with `/`
unchanged, keeps the `category_id` on rename, and refuses a duplicate name within a scope.

## Where what lives

| What | File |
| --- | --- |
| Assign (create / clean up), rename across scopes | `backend/src/categories/categories.service.ts` |
| HA category and entity registry | `backend/src/categories/repositories/ha-categories.repository.ts` |
| Empty folders, colors, order (`/api/folders`, overlay only) | `backend/src/categories/folders.service.ts`, `folders.controller.ts`, `folder-order.ts` |
| Moving an entry (`POST /api/entries/:id/move`) | `backend/src/entries/entries.service.ts` → `CategoriesService.assign` |
| Moving a plain entity (`POST /api/entities/:id/move`), its folder in `GET /api/entities` | `backend/src/categories/entity-folders.controller.ts` → `CategoriesService.moveEntity`; `backend/src/lookups/entity-options.ts` |
| Tidy-up assistant (`/api/categories/cleanup`) | `backend/src/categories/cleanup/` (`cleanup-analysis.ts` is pure) |
| Frontend actions with toasts (move one / many, rename dialog + inline, order) | `frontend/src/composables/useCategoryActions.ts` |
| Rename dialog with preview of every changed HA category | `frontend/src/components/categories/RenameCategoryDialog.vue` |
| New folder, folder color | `components/categories/NewFolderDialog.vue`, `FolderColorDialog.vue`, `composables/useCreateActions.ts` |
| Move dialog for ticked rows, move field in the properties | `components/entries/MoveEntriesDialog.vue`, `CategoryMoveField.vue` |
| Tidy-up hint and dialog | `components/cleanup/CleanupHint.vue`, `CleanupDialog.vue`, `stores/cleanupStore.ts`, `utils/cleanupSelection.ts` |

## Call chains

**Move** (`POST /api/entries/:id/move { categoryPath | null }`):

1. `EntriesService.moveToCategory` loads the entry (kind → scope, current category id). Entries outside
   the registry → 400.
2. `CategoriesService.assign`: find the target category by name in that scope, or create it (and own it)
   → `config/entity_registry/update` with `categories: { [scope]: id | null }` (HA merges it, other scopes
   stay) → `cleanUp` of the old category.

**Rename** (`POST /api/categories/rename { from, to }`):

1. Refuse a move into itself (`CATEGORY_MOVE_INTO_ITSELF`).
2. Plan **every scope first**: every category named `from` or below it gets the new prefix. A name that
   already exists → 409 `CATEGORY_NAME_TAKEN`, and nothing is written.
3. Write the renames, then move overlay keys along: `folders`, `folderColors`, `folderOrder`.

If someone renames only the parent in HA, the children keep the old prefix. The tree then shows the old
prefix as a node of its own.

## Tidy-up assistant

Existing setups often fake nesting with a dash (`Büro - Licht`, `Büro-Licht`) or have near-duplicates
(`Routine` / `Routinen`). `findCleanupProposals` offers **split** (dash → `/`) and **merge** proposals.
Dashes also occur inside plain names (`Climate-Sensors`), so nothing is converted automatically: the dialog
asks for every line, shows a preview (`/preview`) and applies the confirmed changes in every scope
(`/apply`). Hidden proposals are kept in `overlay.cleanupIgnored` (`split:…`, `merge:…|…`).

## Rules

- Order and colors are HomeAce-only (overlay). HA itself stays alphabetical.
- A rename or move touches HA. Always go through `CategoriesService`. Never write the entity registry's
  `categories` directly from another module.
- Entries without a registry entry (YAML without `unique_id`) can't have a category, and the UI hides the
  move field for them.
