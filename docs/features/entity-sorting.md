# Entitäten einsortieren (tool, beta)

A tool in the settings window (tab "Werkzeuge") that proposes folders for plain entities without one.
It bundles entities by device, lets several hints vote for a folder, learns from what is already sorted,
and proposes new folders for the rest. The user reviews grouped by target folder; nothing changes before
"Anwenden", and the last run can be undone. Concept and dummy: Dummy v36 (planning file, part 11 of
0.14.0).

Public texts name the results only (see [../recipes.md](../recipes.md#new-ui-component-or-text)); this
page stays complete.

## Where what lives

| What | File |
| --- | --- |
| `GET /api/entity-sorting`, `PUT /memory`, `POST /moves`, `POST /undo` | `backend/src/entity-sorting/entity-sorting.controller.ts`, `dto/` |
| Context (pure): plain entities incl. disabled and state-only, devices, areas with floors, flows with folders | `backend/src/entity-sorting/sorting-context.ts` |
| Reads besides the snapshot: floors, labels, own-scope categories, integration names | `backend/src/entity-sorting/repositories/ha-sorting-sources.repository.ts` |
| Apply and undo in batches, last run | `backend/src/entity-sorting/entity-sorting.service.ts` |
| Batch move (one registry read per batch, clean-up once) | `CategoriesService.moveEntities` in `backend/src/categories/categories.service.ts` |
| Overlay `entitySorting` and how it follows renames | `backend/src/entity-sorting/entity-sorting.model.ts`, `sorting-memory.ts` |
| Demo: a larger part of the house without folders | `backend/src/demo/demo-sorting-home.ts` |

## Backend rules

- **Proposals are computed in the browser**, not here: every tick changes them, and a round trip per
  tick would be too slow. The backend only serves the data and moves.
- The context leaves automations, scripts, scenes and helpers out as entities (they have folders of their
  own scopes) but lists them as `flows`, with their folder: those folders are the strongest hint.
- Names of disabled entities (no state) follow HA: user name, else device name + `original_name` when
  `has_entity_name`, else `original_name`.
- `manifest/list` is optional. Without it, integration groups are named by domain.
- **Batch moves:** `moveEntity` reads the registry per call, which is far too slow for 1500 entities.
  `moveEntities` reads assignments and categories once, creates each missing folder once (owned), and
  cleans up emptied folders once at the end. One failing entity does not stop the others; HA's
  `not_found` becomes `notInRegistry`.
- **Runs:** the browser picks a `runId` per apply and sends batches of at most 100. The first batch of a
  new `runId` replaces `lastRun`. Undo passes `expectedPath`, so an entity moved elsewhere since stays.
- **Memory** is shared by all HA users (folders are shared in HA too). Bundle keys are the device id, or
  `entity:<entityId>` for entities without a device. Folder renames move rule targets, turned-down paths
  and the last run along (`moveSortingPaths`); entity ID renames move `entity:` keys and the last run
  (`renameSortingEntity`).
- Rule targets store the placeholders as `{area}` and `{floor}`; the UI shows them in its language.
