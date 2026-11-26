# Architecture

The overview: parts, layers, module map and HA APIs. Details live on the column pages in [ui/](ui/) and
the feature pages in [features/](features/). The table at the end says which page to read.

## Parts

```text
Browser (HA ingress) ──► backend (NestJS) ──► Home Assistant (REST + WebSocket)
                              │
                              ├──► /config/overlay.json   own extras, no DB
                              └──◄ MCP clients (own port 8098, token)   see features/ai-mcp.md
```

The HA token stays in the backend. As an add-on it is `SUPERVISOR_TOKEN` with `http://supervisor/core/api`
and `ws://supervisor/core/websocket`. Locally it is `HA_URL` + `HA_TOKEN` from `.env`. With
`HOMEACE_DEMO=true` an invented home in memory replaces HA (`backend/src/demo/`, see [setup.md](setup.md)).

## Backend modules

Layers per module: controller → service → repository interface → HA implementation. Pure logic sits in
its own files without Nest and is unit-tested (`*-analysis.ts`, `*.mapper.ts`, `entity-id.ts`, …).

```text
backend/src/
  app.module.ts     ConfigModule (reads ../.env locally), global envelope interceptor + exception filter
  common/           response envelope (api/), error filter, validation errors (pipes/)
  messages/         message IDs + de/en/fr/es/ru catalogs, GET /api/messages         features/i18n.md
  ha/               the only place that talks to HA: endpoint, WebSocket, REST, raw types;
                    HaModule swaps in demo/ when HOMEACE_DEMO=true
  overlay/          own extras in one JSON file (FileOverlayRepository)              see "Overlay" below
  snapshot/         HomeSnapshotService: everything at once for check-up, dependencies, areas (20 s cache)
  entries/          automations, scripts, scenes, helpers as one list; update, extras, run/on/off
                                                                                     features/entry-actions.md
  categories/       folders = HA categories: assign, rename, empty folders, colors, order, cleanup/
                                                                                     features/folders.md
  editor/           catalog, flows (read, save, create, delete)                      features/flow-editor.md
  scenes/           scene editor, preview, restore                                   features/scenes.md
  helpers/          storage helpers: create, settings, copy, delete                  features/helpers.md
  areas/            areas CRUD, derived areas per entry                              features/areas.md
  checkup/          findings                                                         features/checkup.md
  dependencies/     who uses what                                                    features/dependencies.md
  traces/           run history                                                      features/run-history.md
  rename/           entity ID rename with references                                 features/entry-actions.md
  duplicate/        copies of flows and helpers                                      features/entry-actions.md
  lookups/          GET /api/areas, /api/labels, /api/entities (picker rows)
  live/             HA events → SSE GET /api/events                                  features/live-updates.md
  ai/               MCP server, access, AI folder plans                              features/ai-mcp.md
  entity-sorting/   the tool "Entitäten einsortieren": context, memory, batch moves  features/entity-sorting.md
  demo/             FakeHa, demo home, demo traces, memory overlay                   setup.md
```

**Reading entries** (`GET /api/entries`): `EntriesService.findAll` → `HaEntriesRepository.findAll` loads
in parallel `config/entity_registry/list`, `get_states`, `config_entries/get` (type `helper`) and
`config/category_registry/list` for all four scopes → `mapToEntries` combines them: kind by domain (or
helper config entry), category name from the scope of the kind, display name like HA (user name →
friendly name → integration name), plus state-only entities (`isInRegistry: false`).

**HA connection:** `HaConnectionService` connects lazily on the first `call`. Each command gets an `id`,
and the answer with the same `id` resolves the promise. `success: false` rejects with `HaCommandError`,
and no answer within 15 s rejects with a timeout. `subscribe(eventType, handler)` adds a listener. After
a disconnect it reconnects every 5 s while subscriptions exist and sends them again. It uses Node's
built-in `WebSocket` (Node 22+), with no `ws` package.

`@nestjs/config` 12 is ESM-only, and Jest (CommonJS) cannot load it. So only `ha.module.ts` reads the
config, and `HaConnectionService` gets the resolved endpoint injected. Unit tests never import
`@nestjs/config`.

### Overlay

`OVERLAY_FILE` (add-on: `/config/overlay.json`, locally `../data/overlay.json`). Writes go to a temp file
and are renamed into place. `update()` calls run one after another, so two moves at once cannot lose an
id. Fields (`overlay/overlay.model.ts`): `ownedCategoryIds`, `folders`, `favorites`, `notes`,
`folderColors`, `folderOrder`, `cleanupIgnored`, `checkupIgnored`, `mcp`, `aiPlans`, `entitySorting`,
`userPreferences`. A new field:
[recipes.md](recipes.md#new-overlay-field-own-data-ha-does-not-know).

## Frontend

```text
frontend/src/
  views/StudioView.vue   the one page; wires Navigation · List · Detail        ui/layout.md
  components/<feature>/  one folder per feature (categories, entries, flow, scenes, helpers, areas, …)
  components/common/     DialogFrame, ConfirmDialog, SaveFooter, InlineNameInput, SwitchToggle, ToastHost
  components/layout/     AppTopBar, LanguageMenu, WhatsNewMenu, PaneSplitter, StudioDialogs
  components/settings/   the settings window and one file per tab
  composables/           page actions with toasts (useCategoryActions, useEntryActions, …), useStudioData
  stores/                Pinia, one per concern (entries, studio, settings, editor, folders, …)
  services/              API calls, one file per backend area; api.ts has apiFetch / ApiError
  utils/                 pure logic, unit-tested in utils/__tests__/
  types/                 mirrors of backend models (entry.ts, editor.ts)
  constants/             kinds, filters, actions, layout, helpers, What's new
  i18n/, locales/        vue-i18n, de.ts is the schema                         features/i18n.md
  styles/                tokens.css (light + dark), base.css (shared buttons)
```

- **Behind HA ingress** the app runs under a changing prefix (`/api/hassio_ingress/<token>/`). So Vite
  builds with `base: "./"`, the router uses hash history, and API calls use the relative path `api/...`.
  Locally Vite proxies `/api` to the backend on port 3000 (no rewrite, the backend keeps the prefix).
- No UI library: own components with scoped plain CSS on the tokens. Icons: `@mdi/font`, because HA
  delivers icon names like `mdi:lightbulb` that must render as they are.

## Add-on

```text
homeace-studio/config.yaml   slug homeace_studio, ingress on 8099, homeassistant_api, map addon_config:rw
homeace-studio/Dockerfile    stage 1 frontend (lint, test, build) · stage 2 backend (lint, test, build, prune)
                             · stage 3 node:22-alpine with backend dist + node_modules and frontend dist in /app/public
scripts/build-addon.mjs      copies homeace-studio/ + frontend/ + backend/ (no node_modules, dist, .env) into one folder
```

`main.ts` serves `STATIC_DIR` with Express static when the variable is set, and the API stays under
`/api`. Behind ingress, HA strips the `/api/hassio_ingress/<token>` prefix, so the backend sees `/` and
`/api/...`.

## HA APIs we rely on

Risk per area, quick checks and the check per HA release: [ha-compatibility.md](ha-compatibility.md).

| Purpose | API |
| --- | --- |
| Categories (per scope: automation, script, scene, helpers) | WS `config/category_registry/list · create · update · delete` |
| Entity properties: name, icon, area, labels, category, aliases, hidden, disabled, entity ID | WS `config/entity_registry/list · get · update` |
| Labels, areas | WS `config/label_registry/*`, `config/area_registry/*` |
| Floors (names for flow targets) | WS `config/floor_registry/list` |
| Devices (name and area, for the entity picker and derived areas; child devices through `parent_device_id`) | WS `config/device_registry/list` |
| Automation / script config as HA runs it | WS `automation/config`, `script/config` |
| Automation config (stored, write, delete) | REST `GET/POST/DELETE /api/config/automation/config/<id>` |
| Script config | REST `/api/config/script/config/<object_id>` |
| Scene config | REST `/api/config/scene/config/<id>`; preview with service `scene.apply` |
| Helpers (input_*, counter, timer) | WS `<domain>/list · create · update · delete` |
| Config-entry helpers (template, group, …) | WS `config_entries/get` (listed only) |
| Integration names for the tool "Entitäten einsortieren" ("hue" → "Philips Hue") | WS `manifest/list` (optional: without it the domains are used) |
| Block catalog of the visual editor | WS `trigger_platforms/subscribe`, `condition_platforms/subscribe`, `get_services`, `frontend/get_translations` |
| Run, on / off, `scene.apply` | WS `call_service` |
| Run history | WS `trace/list`, `trace/get` |
| Live changes | WS `subscribe_events` (`state_changed`, `*_registry_updated`) |
| Dependencies | computed from the flow configs and the members of scenes and groups (no extra API; `search/related` would need one call per entry and knows no roles) |
| Blueprints (planned) | WS `blueprint/list · import · save · delete · substitute` |

## Which page to read

| Task touches … | Read |
| --- | --- |
| page layout, splitters, responsive, top bar, What's new | [ui/layout.md](ui/layout.md) |
| tree, special nodes, area view, drag and drop | [ui/navigation.md](ui/navigation.md) |
| list, filter, search, groups, ticking, "Neu" | [ui/list.md](ui/list.md) |
| detail header, tabs, properties, save footer | [ui/detail.md](ui/detail.md) |
| automations / scripts editor | [features/flow-editor.md](features/flow-editor.md) |
| scenes | [features/scenes.md](features/scenes.md) |
| helpers | [features/helpers.md](features/helpers.md) |
| folders, HA categories, tidy-up assistant | [features/folders.md](features/folders.md) |
| labels: assign, manage, uses before delete | [features/labels.md](features/labels.md) |
| icons, icon packs, icon search | [features/icons.md](features/icons.md) |
| areas | [features/areas.md](features/areas.md) |
| check-up | [features/checkup.md](features/checkup.md) |
| dependencies | [features/dependencies.md](features/dependencies.md) |
| run history | [features/run-history.md](features/run-history.md) |
| run, rename, entity ID, duplicate, delete, favorites, notes | [features/entry-actions.md](features/entry-actions.md) |
| live updates | [features/live-updates.md](features/live-updates.md) |
| AI / MCP | [features/ai-mcp.md](features/ai-mcp.md) |
| the tool "Entitäten einsortieren" | [features/entity-sorting.md](features/entity-sorting.md) |
| texts, languages, error messages | [features/i18n.md](features/i18n.md) |
| new endpoint, HA command, overlay field, component | [recipes.md](recipes.md) |
| a new HA release, what it can break, HA interfaces at risk | [ha-compatibility.md](ha-compatibility.md) |
