# Architecture

Built so far: reading entries (POC steps 2–3), moving entries and renaming folders (POC step 4). Everything
else is planned.

## Backend modules

```text
backend/src/
  app.module.ts          ConfigModule (reads ../.env locally), global envelope interceptor + exception filter
  common/api/, pipes/    response envelope, error filter, validation errors
  messages/              message IDs and the de/en/ru catalog, GET /api/messages
  ha/                    everything that talks to HA; HaModule swaps in demo/ when HOMEACE_DEMO=true
  ai/                    AI folder plans: McpHttpServer (own node http server on MCP_PORT 8098, stateless
                         Streamable HTTP per request), mcp-tools.ts (the four MCP tools), McpAccessService
                         (switch, token, Supervisor port lookup), AiPlansService (propose, states, apply,
                         reject; plans in the overlay), AiController (/api/mcp, /api/ai-plans)
  snapshot/              HomeSnapshotService: entries, states, entity registry and every flow config read
                         at once, plus devices and areas; shared by check-up, dependencies and the area
                         view; plus the newest run of every flow (one `trace/list`) for the check-up
                         (20 s cache, cleared by live changes)
  checkup/               check-up: checkup-analysis.ts (pure: collectEntityRefs, analyzeCheckup),
                         CheckupService (findings per snapshot), CheckupController (/api/checkup)
  dependencies/          dependency-analysis.ts (pure: collectRoleRefs walks a flow config with the context
                         trigger / condition / action, buildDependencyIndex adds scene and group members),
                         DependenciesService + Controller (GET /api/dependencies/:entityId)
  areas/                 entry-areas.ts (pure: deriveEntryAreas, own area, else areas of what is used, else
                         of the users), EntryAreasService + Controller (GET /api/entry-areas), AreasService +
                         Controller (POST/PATCH/DELETE /api/areas, names checked ignoring case first)
  traces/                run history: trace-mapper.ts (pure: HA trace → Run with result word, start, steps),
                         TracesService + Controller (GET /api/traces/:entityId)
  rename/                entity-id.ts (pure: countEntityId, replaceEntityId; whole IDs only, service names
                         left out), RenameService + Controller (GET references, POST rename)
  duplicate/             DuplicateService + Controller: FlowsService.create with the original as template,
                         then folder, labels, area; an automation copy is switched off
  demo/                  demo mode: FakeHa (an invented home in memory that answers the WebSocket and
                         REST calls with HA's shapes and events), DemoHaConnectionService / DemoHaRestService
                         (subclasses of the real services), MemoryOverlayRepository
    ha-endpoint.ts       resolveHaEndpoint(): Supervisor proxy (add-on) or HA_URL + HA_TOKEN (local)
    ha.module.ts         provides HA_ENDPOINT (resolved once at startup) and HaConnectionService
    ha-connection.service.ts   one shared WebSocket: login, call(type, payload) → result, timeouts
    ha.types.ts          raw HA shapes (snake_case as HA sends them)
  entries/               automations, scripts, scenes, helpers as one list
    entry.model.ts       Entry (what the UI gets)
    entry.mapper.ts      mapToEntries(): raw HA data → Entry[] (kind detection, category path, names)
    repositories/        EntryRepository interface + HaEntriesRepository (loads from HA)
    entries.service.ts / entries.controller.ts   GET /api/entries, POST /api/entries/:id/move
  categories/            HA categories as a folder tree
    category-path.ts     normalize, isSameOrBelow, replacePathPrefix (pure, tested)
    categories.service.ts  assign (create/clean up automatically), rename (plan all scopes, then write)
    repositories/        CategoryRepository + HaCategoriesRepository (category and entity registry)
  categories/folders.*   empty folders of the tree (overlay only), GET/POST/DELETE /api/folders
  categories/cleanup/    tidy-up assistant: cleanup-analysis.ts (pure: findCleanupProposals, planCleanup),
                         CleanupService + CleanupController under /api/categories/cleanup
  helpers/               POST /api/helpers: helper-payload.ts checks settings per type, then `<type>/create`,
                         wait for the entity, sort it into the folder
  editor/                catalog.mapper.ts (HA descriptions + translations → catalog), flow-entities.ts,
                         EditorService (catalog cache, flows, save), GET /api/editor/catalog,
                         GET + PUT /api/editor/flows/:id; FlowsService + FlowsController:
                         POST /api/flows (new empty flow), DELETE /api/flows/:id; flow-key.ts (script keys)
  ha/ha-rest.service.ts  REST calls to HA (only where the WebSocket API has no command, e.g. saving
                         automations.yaml / scripts.yaml)
  lookups/               GET /api/areas, /api/labels, /api/entities (entity-options.ts joins states,
                         entity registry, devices, areas and labels into picker rows)
  live/                  LiveService subscribes to state_changed and the registry events, filters them
                         (live-events.ts), debounces 500 ms; LiveController streams GET /api/events (SSE)
  entries/entry-extras.ts  withExtras / applyExtras / removeExtras: favorites and notes from the overlay
  overlay/               own extras in one JSON file (FileOverlayRepository: atomic write, queued updates):
                         ownedCategoryIds, folders, favorites, notes, folderColors
```

Call chain for `GET /api/entries`:

1. `EntriesController.findAll` → `EntriesService.findAll` (sorts by name)
2. → `HaEntriesRepository.findAll`: in parallel `config/entity_registry/list`, `get_states`,
   `config_entries/get` (type `helper`) and `config/category_registry/list` for all four scopes
3. → `mapToEntries` combines them: kind by domain (or helper config entry), category name from the scope of
   the kind, display name like HA (user name → friendly name → integration name), plus state-only entities.

`HaConnectionService` connects lazily on the first `call`. `subscribe(eventType, handler)` adds a listener;
events are matched by `event_type`. After a disconnect it reconnects on its own every 5 s while subscriptions
exist and sends them again. Each command gets an `id`; the answer with the same `id` resolves the
promise, `success: false` rejects with `HaCommandError`, no answer within 15 s rejects with a timeout. It uses
Node's built-in `WebSocket` (Node 22+), so there is no `ws` package.

`@nestjs/config` 12 is ESM-only and Jest (CommonJS) cannot load it. That is one more reason why only
`ha.module.ts` reads the config and `HaConnectionService` gets the resolved endpoint injected: unit tests never
import `@nestjs/config`.

Call chain for moving (`POST /api/entries/:id/move`):

1. `EntriesService.moveToCategory` loads the entry (kind → scope, current category id; YAML-only → 400).
2. `CategoriesService.assign`: find the target category by name in that scope, or create it and add its id to
   `overlay.ownedCategoryIds` → `config/entity_registry/update` with `categories: { [scope]: id | null }`
   (HA merges it, other scopes stay) → if the old category is owned and nobody uses it anymore, delete it and
   drop it from the overlay.

Renaming (`POST /api/categories/rename`) first plans every scope (all categories named `from` or below it get
the new prefix) and checks for names that already exist. Only when no scope has a conflict does it write.

The overlay file is `OVERLAY_FILE` (add-on: `/config/overlay.json`, locally `../data/overlay.json`). Writes go
to a temp file and are renamed into place; `update()` calls run one after another so two moves at once
cannot lose an id.

## Frontend

```text
frontend/src/
  views/StudioView.vue           the one page: loads entries, wires tree, list, detail, splitters, responsive states
  components/layout/             AppTopBar, SettingsMenu, PaneSplitter (drag, keyboard, double-click reset)
  components/categories/         CategoryTree + recursive CategoryTreeNode
  components/entries/            EntryList (+ EntryListRow, draggable), EntryDetail (+ CategoryMoveField)
  components/categories/         … plus RenameCategoryDialog (preview of every changed HA category)
  components/common/             … plus ToastHost
  composables/                   useEntryDropTarget (tree nodes accept dragged rows),
                                 useCategoryActions (move / rename with toasts and catalog error texts),
                                 useCreateActions (folders, helpers), useEntryActions (edit, run, favorite,
                                 note, delete, folder color), useStudioData (tree, filters, counts)
  components/layout/StudioDialogs.vue  all dialogs and toasts of the page
  composables/useLiveUpdates.ts  VueUse useEventSource on api/events → entriesStore.refresh() (quiet);
                                 reloads once when the tab becomes visible again
  utils/flow/toDisplayFlow.ts    HA config → display blocks: generic blocks from the catalog (title, target
                                 entities, set fields without defaults), hand-made ones for state, numeric_state,
                                 delay, if, choose, repeat, …; anything else becomes an "unknown" block kept as is
                                 Every editable chip carries `edit` (path in the config, editor type from
                                 HA's selector, value); blocks list unset optional fields in `addable`
  utils/flow/valueEditors.ts     HA selector or classic field → editor (entity, number, choice, duration, …)
  utils/flow/configPath.ts       setAtPath(): copy of the config with one value changed, rest untouched
  utils/flow/flowChanges.ts      applyFlowChange(): set a value, insert / move / duplicate / remove /
                                 disable a block in its list (every block knows its `position`)
  utils/flow/blockTypes.ts       block types to add (hand-made first, then HA's catalog) and their new config
  components/areas/              AreaNav (the tree of the area view: every area with its count, empty ones
                                 dimmed, "Ohne Bereich", the "Ordnung in einem Klick" card), AreaNavNode (drop
                                 target: own area; edit and delete on hover), AreaDialog (name + icon, icon
                                 guessed from the name: utils/areaIcons.ts), SetAreaDialog (ticked rows),
                                 AreaTidyDialog (preview, pick an area, untick); stores/areasStore.ts says which
                                 area dialog is open (the properties form opens it too), composables/
                                 useAreaActions.ts saves with toasts;
                                 utils/areaTidy.ts (planAreaTidy, folderForArea), utils/areaNotes.ts (row
                                 reasons), stores/entryAreasStore.ts; the switch folders / areas is in
                                 CategoryTree, the mode stays in the browser (settingsStore.navMode)
  components/history/            RunHistoryView (the "Verlauf" tab of automations and scripts: runs by day,
                                 the selected run block by block), RunStepRow; utils/runStates.ts maps a run
                                 onto the display flow (tracePathOf, runStatesFor), utils/runTime.ts formats;
                                 stores/tracesStore.ts loads with the open entry and after live changes and
                                 knows the run shown on the flow (RunOverlayBar above it; FlowView provides
                                 the block states, FlowBlock shows them; texts in composables/useRunTexts.ts)
  components/entries/EntryVisibilityForm  enabled, hidden and aliases in the properties; saved right
                                 away, disabling asks first (StudioDialogs lists who still uses it);
                                 a disabled entry shows "deaktiviert" and "Aktivieren" in the header
  components/entries/EntityIdField, RenameEntityDialog   the entity ID in the properties with "Ändern …"
                                 and a suggestion when it no longer fits the name (utils/entityId.ts:
                                 slugifyName like HA); the dialog lists the references before renaming
  components/common/InlineNameInput  renaming in place (list row, title; later folders and areas): Enter or
                                 leaving saves, Esc cancels; studioStore.renaming says which entry and where;
                                 toastStore.show(text, tone, undo) adds "Rückgängig"
  locales/__tests__/keys.spec.ts every fixed t("…") key of the code exists in de, en and ru; ru plurals
                                 have one form more than en
  utils/folderOrder.ts           own folder order (applyFolderOrder, moveSibling); composables/useFolderDrag
                                 tells tree nodes which folder is dragged (sorting only between siblings)
  components/dependencies/       DependencyView (the "Abhängigkeiten" tab of every entry: uses grouped by
                                 role with device names and live state, "+2 weitere" users, used by),
                                 DependencyUseRow, DependencyUserRow (also in the delete dialog);
                                 stores/dependenciesStore.ts loads with the open entry and after live changes
  components/flow/EntityPicker   the entity editor: search (word order free, umlauts folded), criteria
                                 area / label / kind (one value each, chips stay open), area view with device
                                 cards and "All lights · Living room" (writes target.area_id), suggestions
                                 (entities the flow uses, then the entry's area), live state per row;
                                 pure parts in utils/entityPicker.ts, entityIdsInFlow.ts
  components/flow/               FlowView (mode bar, sections Wenn / Und nur wenn / Dann, opens the editor),
                                 recursive FlowBlock (chips as buttons, "+ Option", ⋮ menu), AddBlockButton, ChipEditorPopover
                                 (+ ChoiceList), FlowSaveBar; FlowView provides the editing callbacks to
                                 nested blocks (flowEditing.ts) instead of passing events up every level
  stores/editorStore.ts          catalog per language, flow of the open entry (refreshed on live changes),
                                 drafts per entry ({ base, config }), save, remote-change check
  utils/entryActions.ts          which actions an entry supports (mirrors SERVICE_BY_ACTION in the backend)
  components/common/             SwitchToggle
  stores/                        entriesStore (data + move/rename actions), studioStore (selection, scope, search),
                                 messagesStore (backend catalog for error IDs), toastStore,
                                 settingsStore (technical details, pane widths, language; localStorage for now;
                                 without a stored language the browser language, else German)
  utils/categoryTree.ts          buildCategoryTree(): "Haus/Terrasse" paths → folder tree with counts
  utils/entryFilter.ts           scope / category / search filter, counts per scope, grouping by category,
                                 isGroupOpenByDefault() (which list groups start expanded)
  i18n/, locales/de.ts, en.ts,   vue-i18n; German is the schema, English and Russian must have the same keys;
  ru.ts                          i18n/pluralRules.ts picks the Russian plural form (1 | 2–4 | 5+, zero form
                                 where en has one); preferredLocale() maps navigator.languages to a locale
  styles/tokens.css, base.css    design tokens (light + dark), shared button classes
```

- **Behind HA ingress** the app runs under a changing prefix (`/api/hassio_ingress/<token>/`). Therefore Vite
  builds with `base: "./"`, the router uses hash history, and API calls use the relative path `api/...`.
  Locally Vite proxies `/api` to the backend on port 3000 (no rewrite, the backend keeps the prefix).
- The tree is built from the `categoryPath` of the entries in the current scope tab. A folder without own
  entries (e.g. `Arbeitszimmer` above `Arbeitszimmer/Heizung`) is shown as folder only.
- Selecting a category includes everything below it (`Haus` matches `Haus/Terrasse`, not `Hausflur`).
- Layout: CSS grid `nav | splitter | list | splitter | detail`; splitters have zero width and a wider invisible
  grab area. `min()` in the grid keeps at least 380 px for the detail. Up to 1180 px the categories are a
  drawer, up to 820 px the detail opens full screen.
- No UI library: own components with scoped plain CSS on the tokens. Icons: `@mdi/font`, because HA delivers
  icon names like `mdi:lightbulb` that must render as they are.

## Add-on

```text
homeace-studio/config.yaml   slug homeace_studio, ingress on 8099, homeassistant_api, map addon_config:rw
homeace-studio/Dockerfile    stage 1 frontend (lint, test, build) · stage 2 backend (lint, test, build, prune)
                             · stage 3 node:22-alpine with backend dist + node_modules and frontend dist in /app/public
scripts/build-addon.mjs      copies homeace-studio/ + frontend/ + backend/ (no node_modules, dist, .env) into one folder
```

`main.ts` serves `STATIC_DIR` with Express static when the variable is set; the API stays under `/api`.
Behind ingress, HA strips the `/api/hassio_ingress/<token>` prefix, so the backend sees `/` and `/api/...`.

## Parts

```text
Browser (HA ingress) ──► backend (NestJS) ──► Home Assistant (REST + WebSocket)
                              │
                              └──► /config/overlay.json   own extras, no DB
```

The HA token stays in the backend. As an add-on it is `SUPERVISOR_TOKEN` with `http://supervisor/core/api` and
`ws://supervisor/core/websocket`; locally it is `HA_URL` + `HA_TOKEN` from `.env`.

## HA APIs we rely on

| Purpose | API |
| --- | --- |
| Categories (per scope: automation, script, scene, helpers) | WS `config/category_registry/list · create · update · delete` |
| Entity properties: name, icon, area, labels, category, aliases, hidden, disabled, entity ID | WS `config/entity_registry/list · get · update` |
| Labels, areas | WS `config/label_registry/*`, `config/area_registry/*` |
| Devices (name and area, for the entity picker) | WS `config/device_registry/list` |
| Automation config | REST `GET/POST/DELETE /api/config/automation/config/<id>` |
| Script config | REST `/api/config/script/config/<object_id>` |
| Scene config | REST `/api/config/scene/config/<id>` |
| Helpers (input_*, counter, timer, schedule) | WS `<domain>/list · create · update · delete` |
| Config-entry helpers (template, group, …) | config entry options flow |
| Action forms in the visual editor | WS `get_services` (fields with selectors) |
| Device triggers / conditions / actions | WS `device_automation/*/list` and `*/capabilities` |
| Run history | WS `trace/list`, `trace/get` |
| Dependencies | computed from the flow configs and the members of scenes and groups (no extra API; `search/related` would need one call per entry and knows no roles) |
| Live state | WS `subscribe_entities` |
| Blueprints (planned) | WS `blueprint/list · import · save · delete · substitute` |

## Categories as a tree

The tree is built only from category names: `Haus/Terrasse/Beleuchtung` is three levels. Renaming a node renames
every category whose name starts with that path, in every scope. If someone renames only the parent in HA, the
children keep the old prefix; the tree then shows the old prefix as a node of its own and offers to fix it.

HA only ever holds categories that have entries. A folder without own entries is UI-only; empty folders the user
created are kept in the overlay (`folders`). When an entry moves, the backend creates the target category in that
entry's scope if missing, and deletes the source category if it became empty and HomeAce Studio created it (the
overlay lists the `category_id`s it owns). Existing user categories are never auto-deleted.

Verified against HA 2026.11.2 (`poc/categories-test.mjs`): in all four scopes HA stores names with `/` unchanged,
keeps the `category_id` on rename, and refuses a duplicate name within a scope.

Existing setups often fake nesting with a dash, e.g. `Office - Heating` or `Office-Heating`, sometimes with
near-duplicates (`Routine` / `Routines`). Dashes also occur inside plain names (`Climate-Sensors`), so a dash
cannot be read as nesting automatically; the migration assistant asks for every line.
