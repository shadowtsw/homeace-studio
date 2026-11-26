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
| Engine (pure, browser): weights and thresholds | `frontend/src/utils/entitySorting/constants.ts` |
| Lookups built once per load, area folders and their pattern | `utils/entitySorting/home.ts` |
| Bundles (one per device), what is offered | `utils/entitySorting/bundles.ts` |
| Rules: match, `{area}`/`{floor}`, which rule wins, stats | `utils/entitySorting/rules.ts` |
| Learning from sorted and ticked bundles | `utils/entitySorting/learning.ts` |
| Votes, common parent, confidence | `utils/entitySorting/votes.ts` |
| One proposal per bundle | `utils/entitySorting/suggest.ts` |
| Groups, the four stages for the rest, pre-ticks | `utils/entitySorting/layout.ts` |
| Target of a bundle, computation, moves, changes | `utils/entitySorting/targets.ts`, `compute.ts` |
| Types and API calls | `frontend/src/types/entitySorting.ts`, `services/entitySortingService.ts` |
| Tests with a small home like the dummy's | `utils/__tests__/entitySorting.spec.ts`, `entitySortingFixture.ts` |

## Backend rules

- **Proposals are computed in the browser**, not here: every tick changes them, and a round trip per
  tick would be too slow. The backend only serves the data and moves.
- The context leaves automations, scripts, scenes and helpers out as entities (they have folders of their
  own scopes) but lists them as `flows`, with their folder: those folders are the strongest hint.
- Names of disabled entities (no state): user name, else device name + `original_name` for entities of a
  device, else `original_name`. `has_entity_name` is used only when present: HA 2026.11 leaves it out
  of `config/entity_registry/list` (throwaway HA, 2026-11-26).
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

## Engine (frontend)

`computeSorting` runs on every tick (about 15 ms for 1500 entities), `layoutSorting` only when the list is
ordered (opening, "Liste neu ordnen", after an apply). In between, rows never jump: a row whose proposal
changed shows the new folder and is marked.

1. **Offered:** registry entities without folder, not kept out, not disabled or hidden (unless asked).
   With "auch einsortierte umsortieren" also sorted ones a rule would move.
2. **Bundles:** one per device; the main entity is the first non-technical one by `DOMAIN_ORDER`. Service
   devices and system entities without device (`SYSTEM_DOMAINS`, `SYSTEM_INTEGRATIONS`) form the
   system group, proposed as "System/<Name>", never pre-ticked.
3. **Rules** decide alone (main entity). The more specific one wins (more conditions), else the higher
   one. A target with `{area}` or `{floor}` leaves entities without one alone. A rule on another entity of
   the bundle moves only that entity ("Firmware → Technik/Updates").
4. **Votes** otherwise, per folder:
   - area: `AREA_WEIGHT` for the area's folder (an existing one by name, `Küche` = `kueche`, else one
     after the pattern of the existing area folders, e.g. "Haus/…");
   - flows: `ROLE_WEIGHT` per use, divided by √(entities the flow uses), so "Alles aus" counts little. An
     entity used in ≥ `EVERYWHERE_TOP_FOLDERS` top folders without a majority does not vote;
   - learned words: shared with sorted or ticked bundles, full strength at `LEARN_FULL_AT` examples,
     corrections count `CORRECTION_WEIGHT`, a word in more than `LEARN_MAX_FOLDERS` folders says nothing,
     a bundle never learns from itself. There is no stored model.
   - turned-down folders (and below) get no votes.
5. **Decision:** the deepest folder holding `COMMON_PARENT_SHARE` of the votes, never a bare main folder
   when votes went below it. "sicher" / "wahrscheinlich" / "unklar" from the lead over the best folder
   elsewhere (`SURE_*`, `LIKELY_*`).
6. **Layout:** sure and likely ones go to their folder's group (or to "Neue Ordner" when it does not
   exist). Unclear ones pass four stages, each grouping only `GROUP_MIN_BUNDLES` bundles or
   `GROUP_MIN_ENTITIES` entities: same area, same first word, same integration (not `HUB_INTEGRATIONS`:
   MQTT, ZHA, Template … say nothing), same device class (names from the UI texts). The rest is "Ohne
   Gruppe". Groups are ordered by impact (entities × confidence).
7. **Pre-ticks:** rule hits, and sure ones into existing folders. What the user touched stays.

Language-dependent folder names ("System", "Sonne", "Rauchmelder") come in as `SortingNames` from the UI
texts; reasons come back as data (`SortingReason`) and are written by the UI.
