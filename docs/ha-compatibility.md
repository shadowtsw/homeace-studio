# HA compatibility

Where a new Home Assistant release can break HomeAce Studio, what already protects us, and how each HA
release is checked. The list of APIs is in [architecture.md](architecture.md#ha-apis-we-rely-on); this
page adds the risk, the code and a quick check per area. The routine is in
[recipes.md](recipes.md#ha-release-check).

## Why it can break

- Most commands we use are the ones HA's own frontend uses (`config/*_registry/*`,
  `trigger_platforms/subscribe`, `frontend/get_translations`, REST `/api/config/<kind>/config/<id>`,
  `<helper type>/update`). They are not part of HA's documented WebSocket and REST API. HA changes them
  together with its frontend in the same release, often only mentioned in the release notes or the
  developer blog, sometimes not at all.
- The format of automations and scripts grows with every release (new trigger and condition styles, new
  keys). Old configs must keep working, new ones must not be broken by our editor.
- **Tests and the demo do not catch it.** Unit tests and `backend/src/demo/fake-ha/` answer in the
  shape HA had when we wrote them, so they stay green when HA changes. Only a real HA shows it.

## Safety nets already in place

| Net | Where |
| --- | --- |
| One place talks to HA; every command name is in `HA_COMMAND` / `HA_REST_PATH` | `backend/src/ha/ha.constants.ts` |
| Unknown blocks are shown and saved unchanged with their raw config | [features/flow-editor.md](features/flow-editor.md#round-trip) |
| New syntax (`triggers` / `conditions` / `actions`) is read with a fallback to the old one | `frontend/src/utils/flow/toDisplayFlow/index.ts` |
| Edits change only the touched path; key order and untouched objects stay | `setAtPath`, flow editor |
| HA validates on save; a rejection comes back as `FLOW_INVALID` instead of breaking a file | `backend/src/editor/flow-errors.ts` |
| Saving a helper sends the whole stored helper, so unknown fields survive | [features/helpers.md](features/helpers.md) |
| Saving a scene keeps every config key we do not edit | [features/scenes.md](features/scenes.md) |
| `trace.stored_traces` is merged into the existing `trace` object | `backend/src/traces/traces.service.ts` |
| HA's `null` alias (the entity's own name) is kept | [api.md](api.md#patch-apientriesentityid) |
| HA's colours for "Wie mein HA" are read with fallbacks and checked like an import; if they cannot be read the card is off and a stored choice shows Standard | [features/themes.md](features/themes.md#wie-mein-ha) |
| Plan B if HA ever refuses the own category scope `homeace_entities`: labels with the prefix "📁 " | [decisions.md](decisions.md) (2026-11-25) |

## Touchpoints by risk

🔴 high: interface of HA's frontend that changes often, or a file we write. 🟠 medium: registry or
storage interface, changed rarely, but once already. 🟢 low: documented core API or Supervisor basics.

**Automated:** `node scripts/ha-check/run.mjs` ([setup.md](setup.md#ha-check)) runs the quick checks of
every row on a throwaway HA, except **HA user** (needs ingress), **Supervisor** (needs HA OS) and
**icon packs** (need HACS). For dashboard resources it only checks that HA answers without an error.
Those three need the own HA.

| Risk | Area | HA interface | Code | Breaks as | Quick check |
| --- | --- | --- | --- | --- | --- |
| 🔴 | Block catalog | WS `trigger_platforms/subscribe`, `condition_platforms/subscribe`, `get_services` | `editor/repositories/ha-editor.repository.ts`, `editor/catalog.mapper.ts` | picker empty or missing groups, generic blocks without title or fields | New automation: add a trigger, a condition and an action; groups, names and fields are there |
| 🔴 | Texts from HA | WS `frontend/get_translations` | `editor/catalog.mapper.ts` | raw keys or English names in a German UI | Same check with the UI in German |
| 🔴 | Flow format | keys and block shapes in automations and scripts | `frontend/src/utils/flow/toDisplayFlow/`, `backend/src/labels/label-usage.ts` | known blocks shown as unknown, wrong chips; deleting a label no longer names the flows that target it | Open a few existing flows (new-style triggers too): no unexpected unknown blocks; save one unchanged and compare in HA's YAML editor; "Löschen …" on a label used as a flow target names that flow |
| 🔴 | Flow files | REST `config/automation/config/`, `config/script/config/`; WS `automation/config`, `script/config` | `editor/repositories/ha-editor.repository.ts` | read, save, create or delete fails | Create, save and delete a test automation and a test script |
| 🔴 | Scene file | REST `config/scene/config/`; service `scene.apply` | `scenes/repositories/ha-scene.repository.ts` | scene create, save or preview fails | Create a test scene with "Neu", edit it, preview, save |
| 🟠 | Entitäten einsortieren | WS `config/entity_registry/list` fields `entity_category`, `has_entity_name`, `platform`; device `manufacturer`, `model`; area `floor_id`; WS `manifest/list` | `entity-sorting/sorting-context.ts`, `entity-sorting/repositories/ha-sorting-sources.repository.ts` | technical entities not recognized, disabled ones without a name, integration groups named by domain | Open the tool: battery and signal entities show "technisch", the FRITZ!Box group says "AVM FRITZ!Box Tools", disabled entities have names |
| 🔴 | Own category scope | `config/category_registry/*` with scope `homeace_entities` | `categories/categories.constants.ts`, `lookups/entity-options.ts` | entity folders refused or gone | Move an entity into a folder, reload the page |
| 🔴 | Icon packs | `window.customIcons[prefix].getIcon · getIconList` in HA's page (how custom-brand-icons and co. register; no official API) | `frontend/src/services/iconPacksService.ts`, `stores/iconPacksStore.ts` | pack icons show the fallback, the search lists no pack | With custom-brand-icons installed: open HomeAce from the sidebar without opening a dashboard first; "Auswählen …" shows the filter "phu", an entry with a `phu:` icon shows it in the list |
| 🟢 | Wie mein HA | CSS variables `--primary-background-color`, `--card-background-color` (then `--ha-card-background`, `--secondary-background-color`), `--primary-text-color`, `--primary-color` on HA's page; `hass.themes.theme` on `<home-assistant>` (no official API) | `frontend/src/utils/themes/haTheme.ts`, `stores/themeStore.ts` | the card "Wie mein HA" stays off in the panel ("nur in Home Assistant"), or HomeAce shows other colours than HA; the note misses the theme's name. Should HA drop these names for newer tokens, they are added to the fallback list | From the HA sidebar, also in the companion app: "Aussehen" → "Wie mein HA" can be chosen, the colours match HA, the note names a custom HA theme; switch HA to dark, open "Aussehen" again: HomeAce follows |
| 🟠 | Dashboard resources | WS `lovelace/resources` | `lookups/lookups.controller.ts`, `lookups/icon-resources.ts` | packs not loaded until a dashboard was open; the search says "Paket-Icons fehlen?" | Same check; `GET /api/icon-packs/resources` lists the pack's script |
| 🟠 | Helpers | WS `<type>/list · create · update · delete` | `helpers/repositories/ha-helpers.repository.ts` | settings lost or save error | Change the max of a number helper; the other fields stay |
| 🟠 | Entity registry | WS `config/entity_registry/list · get · update` | `entries/repositories/ha-entries.repository.ts`, `categories/`, `rename/` | wrong names, icons, areas, labels, aliases; rename fails; without `created_at` new entries show in the check-up at once | Rename an entry, add an alias, change an entity ID; create a helper: no "Wird nirgends benutzt" |
| 🟠 | Categories, labels, areas | WS `config/category_registry/*`, `config/label_registry/*`, `config/area_registry/*` | `categories/`, `labels/labels.service.ts`, `areas/areas.service.ts` | folders, labels or areas missing or not saved | Create, rename and delete a folder, a label and an area |
| 🟢 | Floors | WS `config/floor_registry/list` | `lookups/lookups.controller.ts` (`GET /api/floors`) | a flow target shows the floor ID instead of its name | A flow that targets a floor shows "Etage" with the floor's name |
| 🟠 | Devices, config entries | WS `config/device_registry/list`, `config_entries/get` | `ha/device-context.ts`, `lookups/lookups.controller.ts`, `snapshot/home-snapshot.service.ts`, `entries/` | derived areas missing, template or group helpers missing from the list; child devices (since 2026.9) without an own area show no area | Area view shows device areas, also for an outlet of a split multi-outlet plug; a template helper is listed |
| 🟠 | Run history | WS `trace/list`, `trace/get` | `traces/traces.service.ts`, `traces/trace-mapper.ts` | history empty or steps wrong | Run an automation, open its history |
| 🟠 | Live updates | event names `state_changed`, `*_registry_updated` | `live/live-events.ts` | list does not refresh after a change in HA | Rename something in HA; HomeAce follows without reload |
| 🟠 | Panel history | the browser history of the ingress frame: back gesture and back key in the panel and in the companion app | `stores/settingsWindowStore.ts`, `utils/settingsPlace.ts` | back leaves the HomeAce panel instead of going one step in the settings window | On a phone (HA app, Android back key, iOS swipe): open the settings, then a page; back goes to the list, again closes the window, the panel stays |
| 🟠 | Panel frame for theme import and sharing | a Web Worker, a file download and the clipboard inside the ingress frame (panel and companion app) | `utils/themes/themeGate.ts`, `themeCheck.worker.ts`, `composables/useThemeSharing.ts` | import says the isolated check cannot start (nothing taken over); export or copy does nothing | Einstellungen → Aussehen: "Text einfügen" with an exported theme → check report; "Exportieren" saves a file; "Kopieren" copies or shows the text page |
| 🟠 | HA user | ingress headers `x-remote-user-*` | `preferences/ha-user.ts`, `preferences/preferences.service.ts` | user not recognized: settings no longer follow the user and stay in the browser | With technical details on, "Über HomeAce" shows the user; the settings footer names them |
| 🟢 | Core | WS auth, `get_states`, `call_service`, `subscribe_events` | `ha/ha-connection.service.ts`, `entries/` | nothing loads, run and on/off fail | App loads; run a script |
| 🟢 | Supervisor | proxy URLs, `SUPERVISOR_TOKEN`, ingress prefix, `config.yaml` schema, app store | `ha/ha.constants.ts`, `homeace-studio/config.yaml` | app does not start, open or update | Install or update the app, open it from the sidebar |

New HA command: add a row here and its quick check to `scripts/ha-check/`
([recipes.md](recipes.md#new-ha-command-or-rest-call)).

## Known changes

| HA version | Change | Our answer |
| --- | --- | --- |
| 2024.10 | `trigger:` / `condition:` / `action:` lists renamed to the plural, `platform:` in triggers became `trigger:` | Read both, write what the config has (`toDisplayFlow/index.ts`) |
| unknown, seen 11/2026 | `<type>/update` replaces the stored helper instead of merging | Send the whole stored helper (decisions.md 2026-11-24) |
| unknown, seen 11/2026 | Entity aliases can hold `null` for the entity's own name | Never shown, kept on save (api.md) |
| 2026.11.2 | Supervisor: "Check for updates" does not always notice a new version of a local app | `ha store reload` ([setup.md](setup.md)) |
| 2026.9, used from 2026.12 | Child devices: `config/device_registry/list` also returns parts of one product (outlets, channels) with `parent_device_id`; a child without `area_id` takes the parent's area. 2026.12 splits multi-outlet devices of Matter, ZHA, HomeKit and UniFi into children named like "Top" or "Channel 2" | `createDeviceContext` (`ha/device-context.ts`): a child without an area takes the parent's, like HA's `getDeviceAreaId`; its name gets the parent's in front. Used by the area view and the entity picker; the demo has a power strip with two outlets (0.14.0) |
| unknown, blog 2026-10-21 | Targets can have an `exclude` block with the same keys as the target | `targetChips` (`toDisplayFlow/targetChips.ts`) shows floors and labels by name and the exclusion as a read-only chip "ohne …"; a floor or label alone counts as a target. Saving keeps everything. Shown from 0.14.0; editing them comes later |
| 2026.12 | Ingress requests also carry `X-Forwarded-Prefix`; `X-Ingress-Path` is deprecated (removal 2027.12) | Not affected: we read neither header, everything uses relative paths |
| 2026.12 | WS `supervisor/api` needs an admin | Not affected: we only call the Supervisor's REST `/addons/self/info` with `SUPERVISOR_TOKEN` |
| Supervisor 2026.12 (new installs), 2027.05 (all) | Apps lose `NET_RAW`, `MKNOD`, `AUDIT_WRITE`, `SETFCAP` | Not affected: no raw sockets, device nodes or `setcap` |
| 2027.8 | Device fields `config_entries`, `config_entries_subentries`, `primary_config_entry` removed | Not affected: not read |
| seen in 2026.12.0b1 | `config/entity_registry/update` refuses `area_id` for an entity without a name of its own ("set the area on its device instead") | Not affected: we only set the own area of entries (automations, scripts, scenes, helpers), which have their own name. Area for plain entities: put it on the device |

## Check log

One line per checked HA release (see [recipes.md](recipes.md#ha-release-check)).

| HA version | Checked on | Found | Tested on |
| --- | --- | --- | --- |
| 2026.12 (beta 0) | 2026-11-25 | Read the beta notes (still unfinished) and the developer blog since 2026-08: child devices and target `exclude` (both fixed the same day, see Known changes), the rest does not affect us. The new `button.*` triggers and condition come from HA's catalog | not tested yet; 🔴 rows after the release on 2026-12-02 |
| 2026.12 (beta 1) | 2026-11-26 | Throwaway HA `2026.12.0b1` in Docker with the demo integration, app built from `5b8f004` and again from `a2d07bb` on a fresh HA (with the fixes for hand-started runs and script names in the catalog): every 🔴 and 🟠 quick check green through the API (29/29, results checked in HA), five flows in the UI (new and old syntax, floor + label target, `exclude`, if/then) without unknown blocks or console errors; `button.*` in the catalog with German names; editing a scene switched nothing. New: area refused on entities without an own name (Known changes, not affected). Not testable there: HA user (ingress), Supervisor, icon packs | throwaway HA 2026.12.0b1; own HA after the release on 2026-12-02 still open |
| 2026.12 (beta 1) | 2026-11-26 | Released 0.14.0 (`ddd3497`) checked with `scripts/ha-check/run.mjs`, now in the repo, on a fresh HA: API 30/30 and UI 5/5 flows green, no console errors. HA again refused an own area on the two demo lights without a name of their own (Known changes, not affected) | throwaway HA 2026.12.0b1; own HA after the release on 2026-12-02 still open |
| 2026.12 (beta 2) | 2026-11-27 | 0.14.1 checked with `scripts/ha-check/run.mjs` on a fresh HA: API 30/30 and UI 5/5 flows green, no console errors; the image build ran lint, tests and build of frontend and backend. HA again refused an own area on the two demo lights without a name of their own (Known changes, not affected) | throwaway HA 2026.12.0b2; own HA after the release on 2026-12-02 still open |
