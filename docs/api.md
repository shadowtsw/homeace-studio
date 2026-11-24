# API

All routes are under `/api`. Every response uses one envelope:
`{ message, error, data }`. `message` is always a message ID; the texts live in the
backend catalog (`GET /api/messages`). Below, "returns" means the content of `data`.

## GET /api/entries

All automations, scripts, scenes and helpers, sorted by name (case-insensitive).

```json
{
  "message": "OK",
  "error": false,
  "data": [
    {
      "entityId": "automation.terrasse_licht_bei_bewegung",
      "kind": "automation",
      "domain": "automation",
      "name": "Terrasse Licht bei Bewegung",
      "icon": "mdi:lightbulb-on",
      "categoryId": "01JD3…",
      "categoryPath": "Haus/Terrasse",
      "labels": [{ "labelId": "licht", "name": "Licht", "color": "amber" }],
      "area": { "areaId": "terrasse", "name": "Terrasse" },
      "state": "on",
      "isDisabled": false,
      "isHidden": false,
      "isInRegistry": true
    }
  ]
}
```

- `kind`: `automation` | `script` | `scene` | `helper`.
- Helpers are the HA-managed domains (`input_*`, `counter`, `timer`, `schedule`) plus entities of config entries
  of type `helper` (template, group, utility_meter, …), so `domain` can be e.g. `sensor` or `light`.
- `icon`: the user's icon, else the icon from the state; `null` means "default icon of the kind".
- `categoryPath` is the category name from the scope that fits the kind (`helpers` for helpers); `null` when not
  categorized. Labels HA no longer knows are left out.
- `state` is `null` for disabled entities (HA has no state for them).
- `isInRegistry: false`: the entity exists only as state (YAML without `unique_id`); it cannot have a category,
  labels or an area.
- `isFavorite`, `note`: own extras from the overlay (not in HA).

## PATCH /api/entries/:entityId

Changes what HA keeps in its entity registry. Every field is optional; missing ones stay.

```json
{ "name": "Licht Terrasse", "icon": "mdi:lightbulb", "areaId": "terrasse", "labelIds": ["licht"],
  "aliases": ["Licht draußen"], "isHidden": false, "isDisabled": false }
```

- A blank `name` or `icon` goes back to the default of the integration (sent to HA as `null`).
- `aliases` (up to 20) replace the list; they are trimmed, blanks dropped, each name kept once
  (ignoring case).
- `isHidden` / `isDisabled` set `hidden_by` / `disabled_by` to `user` or back to `null`. HA does not load
  a disabled entity, so it has no state until it is enabled again.

`GET /api/entries/:entityId/details` → `{ aliases }`: HA leaves aliases out of the registry list, so
they are read for the open entry only (`config/entity_registry/get`). Newer HA versions keep a `null` in the
aliases that stands for the entity's own name: it is never shown and is kept when the aliases are saved.
- Returns the updated entry with `ENTRY_UPDATED`. `400 ENTRY_NOT_IN_REGISTRY` for YAML-only entities.

## Entity ID: GET /api/entries/:entityId/references · POST /api/entries/:entityId/rename

`GET …/references` lists where the ID appears: automations and scripts (with how often, and
`isEditable` when they live in automations.yaml / scripts.yaml), and scenes and groups that have it as a
member (`isEditable: false`, HomeAce Studio does not write them yet):

```json
[{ "entityId": "script.terrace_evening_mood", "name": "Terrace evening mood", "kind": "script",
   "count": 1, "isEditable": true }]
```

`POST …/rename` `{ "newEntityId": "input_number.patio_brightness", "withReferences": true }` changes the
ID in HA's registry (`new_entity_id`; HA moves history and statistics), carries favorite, note and
ignored check-up findings over, and with `withReferences` rewrites every editable flow that names it.
Answers `{ entityId, updated, skipped }` with `ENTRY_RENAMED`; `skipped` are places that still name the
old ID. `400 ENTRY_ID_INVALID` (another domain, not `[a-z0-9_]`), `409 ENTRY_ID_TAKEN`,
`400 ENTRY_NOT_IN_REGISTRY`.

- Only the whole ID is replaced: `light.terrace` does not touch `light.terrace_paths`. Templates count.
- Values of `action` / `service` stay as they are: `action: script.x` calls a script by its key in
  scripts.yaml, which does not change with the entity ID.

## POST /api/entries/:entityId/duplicate

`{ "name": "Terrace light on motion (Kopie)" }` copies an automation or script from automations.yaml /
scripts.yaml: the whole flow under a new id (automations) or key (scripts), then folder, labels and
area of the original (HA's own duplicate keeps only the flow). An automation copy is switched off, so
original and copy do not both react to the same triggers. Answers `{ entityId }` with
`ENTRY_DUPLICATED`; `400 FLOW_NOT_EDITABLE` / `FLOW_UNSUPPORTED` like the flow editor.

## PATCH /api/entries/:entityId/extras

`{ "isFavorite": true, "note": "…" }`, both optional; a blank or null note is removed. Overlay only.
Returns `null` with `ENTRY_EXTRAS_SAVED`.

## POST /api/entries/:entityId/run · /turn-on · /turn-off

Calls the matching HA service: run = `automation.trigger` (ignores conditions), `script.turn_on`,
`scene.turn_on`, `input_button.press`; turn-on/off = `automation.*`, `input_boolean.*`; turn-off also
stops a running `script`. Returns `null` with `ENTRY_ACTION_DONE`;
`400 ENTRY_ACTION_UNSUPPORTED` (`params.entityId`, `params.action`) for other domains.

## GET /api/areas · GET /api/labels

HA's areas `[{ areaId, name, icon }]` and labels `[{ labelId, name, icon, color }]`, sorted by name.

`GET /api/entities` lists every entity HA has, for the entity picker of the flow editor, sorted by name:

```json
[{ "entityId": "sensor.front_door_battery", "name": "Front door sensor Battery", "shortName": "Battery",
   "domain": "sensor", "state": "91", "unit": "%", "options": null,
   "deviceId": "…", "deviceName": "Front door sensor", "areaId": "hallway", "areaName": "Hallway",
   "labels": [] }]
```

- `shortName` is the name within its device ("Battery"), or the full name when it does not start with
  the device name.
- `areaId` / `areaName` are the entity's own area, otherwise its device's area, otherwise `null`.
- `labels` are label names; `unit` is `unit_of_measurement` or `null`.
- `options` holds the possible states of select-like entities (input_select, select, enum sensors),
  otherwise `null`.

## Areas: POST /api/areas · PATCH /api/areas/:areaId · DELETE /api/areas/:areaId

Creates, changes and deletes areas in HA's area registry (`config/area_registry/create · update ·
delete`). Bodies: `{ "name": "Bedroom", "icon": "mdi:bed" }`; for PATCH both fields are optional and
`icon: null` removes the icon. Answers with the area `{ areaId, name, icon }` (DELETE: null).

- Names are trimmed and must be unique ignoring case: `409 AREA_NAME_TAKEN` (`params.name`). Checked
  before HA is asked, so the text comes from our catalog. An unknown area: `404 AREA_NOT_FOUND`.
- `icon` must look like `mdi:name`.
- Deleting is done by HA: devices and entities in the area lose it and stay.
- Giving an entry its own area stays `PATCH /api/entries/:entityId` with `areaId` (null takes it away).

## POST /api/entries/:entityId/move

Puts an entry into a folder. Written straight to HA's entity registry.

```json
{ "categoryPath": "Haus/Pool" }
```

- `categoryPath: null` takes the entry out of its category.
- The path is normalized (levels trimmed). If HA has no category with that name in the entry's scope, it is
  created and remembered as owned by HomeAce Studio (overlay). If the old category is now empty and owned,
  it is deleted. User-made categories are never deleted.
- Returns `null` with message `ENTRY_MOVED`.
- Errors: `404 ENTRY_NOT_FOUND` (`params.entityId`), `400 ENTRY_NOT_IN_REGISTRY`,
  `400 CATEGORY_PATH_INVALID` (`params.path`, a level is empty), `400 VALIDATION_FAILED`.

## POST /api/categories/rename

Renames a folder and everything below it, in all four scopes.

```json
{ "from": "Haus", "to": "Heim" }
```

- Returns `{ "renamedCount": 3 }` with message `CATEGORY_RENAMED`.
- All scopes are checked before anything changes. If a new name already exists in a scope, nothing is renamed:
  `409 CATEGORY_NAME_TAKEN` (`params.path`).
- `400 CATEGORY_MOVE_INTO_ITSELF` when `to` lies below `from` (e.g. `Haus` → `Haus/Neu`).
- Folders that are only a prefix (no HA category of their own) work too: their subcategories are renamed.

## Tidy-up assistant: /api/categories/cleanup

- `GET` → `{ proposals, ignoredCount }`. A proposal is either
  `{ key: "split:Office - Heating", kind: "split", from, to: "Office/Heating", isCertain, counts }`
  (a top-level name with a dash; `isCertain` is false for a dash without spaces, which may belong to
  the name) or `{ key: "merge:Routine|Routines", kind: "merge", names, to, counts }` (names that only
  differ by an ending; `to` is the one with most entries, on a tie the longer one). `counts` are entries
  per scope. Hidden proposals are left out.
- `POST /preview` `{ changes: [{ from, to }] }` → `{ steps: [{ scope, kind: "rename" | "merge", from, to,
  entryCount }] }`. Per scope, in order: a rename when `to` is free there, a merge (entries move, the emptied
  category is deleted) when `to` already exists or an earlier change produced it.
- `POST /apply` with the same body plans again from HA's current state and runs the steps →
  `{ categoryCount, stepCount }`, `CLEANUP_APPLIED`. Folder colors and empty folders move to the new path.
  `400 CATEGORY_PATH_INVALID` for an empty level, `400 CLEANUP_DUPLICATE` when a name is listed twice.
- `POST /ignore` `{ key }` hides a proposal (overlay `cleanupIgnored`, `CLEANUP_IGNORED`);
  `DELETE /ignore` shows all again (`CLEANUP_RESTORED`).

## Folders: GET /api/folders, POST /api/folders, DELETE /api/folders?path=…

Empty folders the user created in the tree. They live only in the overlay; HA has no empty categories and gets
the category when the first entry moves in (`POST /api/entries/:id/move`).

- `GET` returns `{ "saved": ["Haus/Pool"], "colors": { "Haus": "#e3a64e" } }`: saved empty folders (sorted)
  and own folder colors.
- `PUT /api/folders/color { "path": "Haus", "color": "#e3a64e" }` sets a color (`#rrggbb`); `color: null`
  removes it. Returns `null` with `FOLDER_COLOR_SAVED`. Colors move along when a folder is renamed.
- `POST { "path": "Haus/Pool" }` returns `{ "path": "Haus/Pool" }` (levels trimmed) with `FOLDER_CREATED`;
  `409 FOLDER_EXISTS`, `400 CATEGORY_PATH_INVALID`.
- `DELETE ?path=Haus%2FPool` (path in the query, because it contains "/") returns `null` with
  `FOLDER_DELETED`; `404 FOLDER_NOT_FOUND`. HA categories are never touched.
- Renaming a folder (`POST /api/categories/rename`) renames saved folders below it too.


`GET /api/folders` also has `order`: parent path (`""` for the top level) → its subfolders in the user's
order. `PUT /api/folders/order` `{ "parent": "Haus", "order": ["Haus/Terrasse", "Haus/Garten"] }` sets it
(`FOLDER_ORDER_SAVED`); an empty `order` goes back to A–Z; a path that is not a direct child gives
`400 CATEGORY_PATH_INVALID`. Only HomeAce Studio shows the order; HA keeps categories alphabetical.
Renames and the tidy-up move it along.

## POST /api/helpers

Creates a helper in HA and optionally sorts it into a folder.

```json
{
  "type": "input_number",
  "name": "Terrasse Helligkeit",
  "icon": "mdi:brightness-6",
  "categoryPath": "Haus/Terrasse",
  "settings": { "min": 10, "max": 100, "step": 5, "unitOfMeasurement": "%" }
}
```

- `type`: `input_boolean`, `input_button`, `input_number`, `input_text`, `input_select`, `input_datetime`,
  `counter`, `timer`.
- `settings` per type (camelCase; mapped to HA's names in `backend/src/helpers/helper-payload.ts`):
  - `input_number`: `min`, `max` (required, max > min), `step` (1), `mode` (`slider` | `box`), `unitOfMeasurement`
  - `input_text`: `min` (0), `max` (100, at most 255), `mode` (`text` | `password`), `pattern`
  - `input_select`: `options` (at least one, no blanks, no duplicates)
  - `input_datetime`: `hasDate`, `hasTime` (at least one true)
  - `counter`: `initial` (0), `step` (1), `minimum`, `maximum`, `restore` (true)
  - `timer`: `duration` (`HH:MM:SS`), `restore` (false)
- Returns `{ "entityId": "input_number.terrasse_helligkeit" }` with `HELPER_CREATED` (201).
- `400 HELPER_SETTINGS_INVALID` (`params.field`, the camelCase name) before anything is created in HA.
- `DELETE /api/helpers/:entityId` deletes a storage helper (the 8 types above) via `<type>/delete`, removes
  its favorite and note, and deletes its category if HomeAce Studio created it and it became empty.
  `400 HELPER_NOT_DELETABLE` for template, group and other config-entry helpers; `404 ENTRY_NOT_FOUND`.
- HA registers the entity a moment after creating the helper; the backend looks it up a few times
  (10 × 200 ms) before sorting it into the folder.

## GET /api/events

Server-sent events (no envelope). After relevant changes in HA, a default message with
`{ "type": "changed" }` (bursts are combined: one message 500 ms after the last change); every 25 s a
`ping` event as heartbeat for proxies. The UI reloads its entries on `changed`.

Relevant are: registry changes (entities, categories, labels, areas) and real state changes of
automations, scripts, scenes and HA-managed helpers. Sensor and attribute-only changes are ignored.

## GET /api/editor/catalog?lang=de

All trigger, condition and action types HA describes, with translated names and fields:
`{ triggers: { "zone.entered": { name, description, fields: { for: { name, required, default, selector } },
target } }, conditions: {…}, actions: { "climate.set_temperature": {…} } }`. Built from
`trigger_platforms/subscribe`, `condition_platforms/subscribe`, `get_services` and `frontend/get_translations`;
cached 10 minutes per language (`de`, `en`, `ru`; others fall back to `de`). Classic triggers like `state` are not
in it; the UI has its own blocks for them.

## GET /api/editor/flows/:entityId

`{ entityId, kind: "automation" | "script", config, entityNames, isEditable }`: the config as HA keeps it
(`automation/config`, `script/config`) and the names of all entities it mentions.
`isEditable` is true when the flow lives in automations.yaml / scripts.yaml (REST
`GET /api/config/<kind>/config/<key>` finds it) and is not built from a blueprint. The key is the
automation's `id`, or the script's unique ID from the entity registry (it stays the same when the
entity ID is renamed). `400 FLOW_UNSUPPORTED` for other entries.

## PUT /api/editor/flows/:entityId

Body `{ "config": { … } }`: the whole config, as GET returned it plus the edits. Fields the editor does
not know must come back unchanged. The backend writes it with REST `POST /api/config/<kind>/config/<key>`;
HA validates it and reloads the flow. For automations the `id` is always set to the stored one.

- Returns the saved flow (same shape as GET) with `FLOW_SAVED`. It is built from the sent config, because
  HA reloads in the background and could still return the old version for a moment.
- `400 FLOW_NOT_EDITABLE` (`params.entityId`) when `isEditable` would be false.
- `400 FLOW_INVALID` (`params.reason`, HA's own text) when HA rejects the config.

## POST /api/flows · DELETE /api/flows/:entityId

`POST` body `{ kind: "automation" | "script", name, categoryPath? }` creates an empty flow in
automations.yaml / scripts.yaml (REST `POST /api/config/<kind>/config/<key>`) and sorts it into the folder.
An automation gets the current time in milliseconds as `id` (like HA's editor), no triggers and no actions,
so it never runs on its own; a script gets a key from its name (`Gute Nacht` → `gute_nacht`, `_2`, `_3`, …
when taken) and an empty sequence. The backend waits up to 25 × 200 ms for HA to register the entity.
Returns `{ "entityId": "automation.licht_flur" }` with `FLOW_CREATED`; `400 FLOW_INVALID` when HA
rejects it.

`DELETE` removes the flow from its file (REST `DELETE /api/config/<kind>/config/<key>`), its favorite and
note, and its category if HomeAce Studio created it and it became empty. `FLOW_DELETED`;
`400 FLOW_NOT_EDITABLE` for flows outside those files.

## AI access: GET/PUT /api/mcp · POST /api/mcp/token

`GET` → `{ isEnabled, token, path: "/mcp", containerPort, hostPort, isAddon, lastConnection }`.
`hostPort` is the host port the user mapped in the app's network settings (Supervisor
`/addons/self/info`), null while none is set; outside the app it is the container port. `PUT`
`{ isEnabled }` switches access on or off (`MCP_SAVED`; the first switch-on creates a token).
`POST /api/mcp/token` replaces the token (`MCP_TOKEN_RENEWED`). Overlay field `mcp`.

## AI plans: GET /api/ai-plans · POST /api/ai-plans/:id/apply · POST /api/ai-plans/:id/reject

`GET` → plans, newest first: `{ id, title, reasoning, client, createdAt, status: "open" | "applied" |
"partial" | "rejected", operations, appliedOperationIds, decidedAt }`. An operation is
`{ id: "op1", type: "renameFolder", from, to }` or `{ id, type: "moveEntry", entityId, entryName, to,
currentFolder, kind }`, each with `state`: `ok`, `gone` (folder or entry no longer exists), `done`
(already true) or `conflict` (rename target exists; entry cannot have a category).
`apply` `{ operationIds }` runs the chosen operations that are still `ok` (renames first, through
`POST /api/categories/rename` logic; moves like `POST /api/entries/:id/move`) →
`{ appliedCount, failed: [{ operationId, messageId }] }`, `AI_PLAN_APPLIED`. The plan becomes `applied`
when every operation is true afterwards, else `partial`. `reject` → `AI_PLAN_REJECTED`.
`404 AI_PLAN_NOT_FOUND`, `409 AI_PLAN_CLOSED` for decided plans.

## MCP endpoint (own port 8098, not under /api)

Streamable HTTP, stateless: `POST /mcp` with `Authorization: Bearer <token>`. `503` while switched
off, `401` for a missing or wrong token, `405` for GET/DELETE, `413` above 1 MB. Tools:
`list_folders`, `list_entries` (`folder`, `includeSubfolders`, `kind`), `propose_folder_plan`
(`title`, `reasoning`, `operations` with `renameFolder` / `moveEntry`, at most 200; every problem is
returned at once and nothing is saved; at most 10 open plans) and `get_plan_status` (`planId`).

## Check-up: GET /api/checkup · POST/DELETE /api/checkup/ignore

`GET` → `{ findings, ignoredCount, checkedAt }`. A finding is `{ key: "gone:automation.x", kind, entityId,
name, entryKind, refs: [{ entityId, name, since }], lastTriggered, isOn, failedAt, error }` with `kind`:
- `gone`: the flow names an entity (in an `entity_id` field, a target, or `action: script.x`) that is
  neither in the states nor in the entity registry (`action: script.x` also counts when `x` is the key of a
  script in scripts.yaml, which stays the same when the script entity is renamed);
- `unavailable`: such an entity is `unavailable`; `since` is its `last_changed`;
- `failed`: the newest run HA kept of an automation or script ended with an error; `failedAt` is its
  start, `error` HA's text. The key carries the start (`failed:automation.x:2026-…`), so ignoring hides
  this failure only and a later one shows again; a newer run that went fine makes it go away;
- `unused`: an HA-managed helper (input_*, counter, timer, schedule) whose entity ID appears in no
  automation or script config (templates included) and in no scene or group; dashboards are not checked;
- `stale`: an automation whose `last_triggered` is older than 90 days, or null.
Disabled entries are skipped. The data comes from a shared snapshot (`snapshot/`), cached 20 s and
dropped on every live change.
`POST /ignore` `{ key }` hides a finding (overlay `checkupIgnored`, `CHECKUP_IGNORED`), `DELETE /ignore`
shows all again (`CHECKUP_RESTORED`).

## Dependencies: GET /api/dependencies/:entityId

What an entry uses and who uses it. Works for every entity ID (automation, script, scene, helper, or any
other entity, which then only has users):

```json
{
  "entityId": "automation.terrace_light_on_motion",
  "uses": [
    { "entityId": "light.terrace", "name": "Terrace light", "roles": ["condition", "action"], "exists": true,
      "alsoUsedBy": [{ "entityId": "script.terrace_evening_mood", "name": "Terrace evening mood", "roles": ["action"] }] }
  ],
  "usedBy": []
}
```

- `roles`, in this order: `trigger` (a trigger listens to it), `condition` (a condition, `if`, `while`,
  `until` or a wait checks it), `action` (an action switches or sets it), `member` (a scene or group
  contains it), `value` (a template in an action reads it), `call` (an action starts it: script, scene,
  automation, also `action: script.x`).
- Sources: the configs of all automations and scripts (`entity_id` fields and targets; inside templates
  only IDs of entities that exist, so `states.sensor` is not taken for one) and the `entity_id` attribute
  of scenes and groups. Scripts called by their key are mapped to their entity ID. Dashboards are not
  covered; device IDs and areas in targets are not resolved.
- `exists`: false when neither the states nor the entity registry know the entity (the check-up's
  `gone`); `name` is null then.
- Reads the same shared snapshot as the check-up (20 s, dropped on every live change).

## Area view: GET /api/entry-areas

The areas of every entry, own or derived, for the area view:

```json
[
  { "entityId": "automation.arm_alarm_when_leaving",
    "areas": [{ "areaId": "hallway", "name": "Hallway", "source": "uses",
                "via": { "entityId": "alarm_control_panel.home", "name": "Alarm panel" } }] },
  { "entityId": "input_boolean.guest_mode",
    "areas": [{ "areaId": "hallway", "name": "Hallway", "source": "usedBy",
                "via": { "entityId": "automation.arm_alarm_when_leaving", "name": "Arm the alarm when everyone left" } }] }
]
```

- `source`: `own` (the entry has the area in HA; then it is the only one and `via` is null), `uses`
  (a device or entity the flow, scene or group uses is in it; the entity's own area, else its
  device's), `usedBy` (only when neither of those gives one: an automation or script that uses the
  entry is in it, with its own or `uses` areas; one step, not further).
- Several areas are sorted by how many used things are in them, then by name; the first one is what
  "Ordnung in einem Klick" goes by unless the user picks another.
- Areas HA no longer has are ignored. Uses the dependency index and the shared snapshot (20 s,
  dropped on every live change). Sorting into folders uses the normal move
  (`POST /api/entries/:entityId/move`), one entry after another.

## Run history: GET /api/traces/:entityId

The runs HA kept of an automation or script (`trace/list`, then `trace/get` for each), newest first:

```json
{ "entityId": "automation.solar_surplus_to_wallbox", "storedTraces": 5,
  "runs": [{ "runId": "…", "startedAt": "2026-11-21T11:20:00Z", "finishedAt": "2026-11-21T11:20:00.4Z",
    "result": "error", "lastStep": "action/0", "error": "Entity switch.wallbox is unavailable",
    "start": { "triggerIndex": 0, "entityId": "sensor.solar_surplus", "from": null, "to": "1840",
               "description": "numeric state of sensor.solar_surplus", "by": "trigger" },
    "steps": [{ "path": "condition/0", "at": "…", "result": { "result": true }, "error": null }] }] }
```

- `result`: `finished`, `conditionsFailed`, `error`, `running`, `cancelled` (ended from outside, e.g.
  restarted by a new trigger), `ignored` (was already running: HA's `failed_single` / `failed_max_runs`),
  `stopped` (a stop action), `unknown`.
- `steps`: every recorded step in time order with HA's path and HA's `result` as it is (conditions:
  `result`, one level deeper `state` / `wanted_state`; if / choose: `choice`; delays: `delay`).
  The UI maps a path to its block: `action/1/then/0` is `actions[1].then[0]`; if-conditions sit under
  `action/1/if/condition/0`.
- `start.by`: `trigger`, `user` (run by hand), `flow` (started by another automation or script).
- `storedTraces`: the config's `trace.stored_traces`, HA's default 5.
- Other kinds, and flows without an `id` / key (HA keeps no runs for them): `runs: []`.

`PUT /api/traces/:entityId/stored` `{ "count": 20 }` (1–50) writes `trace.stored_traces` into the flow's
config, nothing else (`TRACES_KEPT`); `400 FLOW_NOT_EDITABLE` for flows outside automations.yaml /
scripts.yaml.

## GET /api/messages?lang=de

The backend catalog: message ID → text, for `de` (default) and `en`. Placeholders like `{path}` are filled from
`data.params` of an error. Sent with `Cache-Control: no-cache` and an ETag, so reloads cost a `304`.
