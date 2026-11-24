# Decisions

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-11-19 | Runs as an HA add-on with ingress | Targets HA OS; no own login or token, overlay file lands in HA backups |
| 2026-11-19 | Name "HomeAce Studio" | "HA" only as an allusion; avoids the "Home Assistant" trademark in the name |
| 2026-11-19 | Visual editor, no YAML in the UI | Main reason the tool exists; unknown block types are kept unchanged on save |
| 2026-11-19 | Nesting stored in HA category names (`Haus/Terrasse`) | Structure lives in HA, no own DB; readable and sorted in the HA UI too |
| 2026-11-19 | No empty categories in HA; created and deleted automatically per scope | The user should never manage HA categories by hand; folders without entries live only in the UI (empty user folders in the overlay). Auto-delete only for categories HomeAce Studio created |
| 2026-11-19 | Migration assistant in version 1 | Existing categories often fake nesting with dashes (`Room - Topic`); a preview with per-line confirmation converts them to `/` and merges near-duplicates |
| 2026-11-19 | Node's built-in WebSocket, no `ws` package | Node 22+ has it; one dependency less |
| 2026-11-19 | One lazy HA connection; reconnect loop only while events are subscribed | Commands reconnect on demand; live updates need the connection back on their own |
| 2026-11-19 | Entries read from HA per request, no cache yet | A few hundred entries load fast; a cache only makes sense together with live updates |
| 2026-11-19 | Frontend: relative `base`, hash router, relative API path | HA ingress serves the app under a prefix that changes per session |
| 2026-11-19 | Plain scoped CSS on design tokens, no Sass | No UI library to theme; CSS custom properties cover light/dark |
| 2026-11-19 | `@mdi/font` for icons | HA delivers `mdi:` icon names as data; the full font renders any of them |
| 2026-11-19 | UI settings in localStorage for now | Moves to the overlay per HA user once the overlay exists |
| 2026-11-19 | Message-response envelope and backend catalog as in the guidelines | One contract for all endpoints; error texts in DE and EN come from `GET /api/messages`, UI texts from vue-i18n |
| 2026-11-19 | Move and rename as POST actions (`/entries/:id/move`, `/categories/rename`) | They create, rename and delete several HA categories on the way; not a field update of one resource |
| 2026-11-19 | Rename checks all scopes before writing | A conflict in one scope must not leave the folder half renamed |
| 2026-11-19 | Overlay as one JSON file, atomic writes, queued updates | No DB; the file survives in the add-on config folder and HA backups |
| 2026-11-19 | Brand fonts bundled with @fontsource | The add-on must work without internet (no Google Fonts) |
| 2026-11-19 | Add-on folder assembled by a script (sources copied next to config.yaml) | The Supervisor's build context is the add-on folder; the repo layout (frontend/, backend/) stays as it is |
| 2026-11-19 | Official `node:22-alpine` image instead of the HA base image | Same Node as in development, available for amd64 and aarch64; no s6 services needed for one process |
| 2026-11-19 | Lint and tests run in the image build | A failing check stops the build, so a broken version never replaces the running one |
| 2026-11-19 | Blueprint editor planned on top of the visual editor | Same sentence-and-chips principle: turn any chip of an automation into a blueprint input, edit blueprints and use them without YAML |
| 2026-11-19 | POC step 5 passed: installed as local app on HA 2026.11.2, reading works through ingress | Packaging, Supervisor build and SUPERVISOR_TOKEN access confirmed on real hardware |
| 2026-11-19 | Creating folders and helpers before the visual editor | Users need to create things right away; helpers have simple forms, automations need the editor anyway |
| 2026-11-19 | Helper settings checked per type in one pure function | One place mirrors HA's rules; errors name the field before HA is touched |
| 2026-11-19 | Creating folders and helpers tested on the real HA (app 0.2.0) | Both work end to end through ingress |
| 2026-11-19 | Name, icon, area and labels edited in the entity registry | Same place the HA UI writes them; works for automations, scripts, scenes and helpers alike |
| 2026-11-19 | "Run" on an automation calls `automation.trigger` | Same as HA's "Run actions": skips triggers and conditions |
| 2026-11-19 | Favorites, notes and folder colors in the overlay | HA has no place for them; they belong to HomeAce Studio |
| 2026-11-19 | Only storage helpers can be deleted here | Template, group and other config-entry helpers need HA's config-entry flow |
| 2026-11-19 | Live updates via SSE, UI reloads the whole list | Simple and robust; a few hundred entries load fast. Sensor states are ignored to avoid constant reloads |
| 2026-11-19 | Visual editor built from HA's own descriptions (generic blocks), hand-made blocks only for classic triggers, delay and if | HA 2026 describes 193 triggers, 154 conditions (`trigger_platforms/subscribe`, `condition_platforms/subscribe`) and all actions (`get_services`) with fields and selectors, and translates them (`frontend/get_translations`). The owner's automations use mostly those new-style triggers and plain action calls (POC 6a) |
| 2026-11-19 | Scenes from MQTT (Zigbee2MQTT) are not editable | HA has no config for them; only HA-native scenes can be edited |
| 2026-11-20 | Saving sends the whole config; the UI changes single values by path (6c) | HA's REST API takes only whole flows. Editing one path on a copy keeps every unknown field, key order and shape (single item vs. list, old `trigger:`/`data_template` keys). Checked read-only: 89 of the 92 flows matched their YAML byte for byte; the other 3 are scripts with a renamed entity ID, found under their registry key |
| 2026-11-20 | Only flows in automations.yaml / scripts.yaml are editable | REST POST would otherwise add a duplicate to those files; flows from packages and blueprints stay read-only |
| 2026-11-20 | Unsaved edits are drafts per entry in the browser | Switching entries loses nothing, the list marks them; HA sees changes only with "In HA speichern". If HA changed the flow meanwhile, the save bar says so |
| 2026-11-20 | Check-up for users who do not organize | Many users barely use categories or labels; the check-up gives them value without setup by finding broken references, unused helpers and idle automations |
| 2026-11-22 | Own folder order lives only in HomeAce Studio | HA has no order for categories; writing numbers into names would show up in HA. The order sits in the overlay, moves with renames, and "A–Z" brings HA's order back |
| 2026-11-22 | A duplicated automation starts switched off | Original and copy have the same triggers; both on would run everything twice. The toast says so; the copy opens with its name ready to change |
| 2026-11-22 | UI care: new handling hides until it is needed | The user asked not to bury people in UI. Folding sits on the column splitter, renaming on double click, hover pencil and F2, undo inside the toast; no new permanent buttons |
| 2026-11-22 | Renaming an entity ID rewrites the flows, but never service names | `action: script.x` calls a script by its key, not its entity ID; rewriting it would break the call. Everything else that names the whole ID (fields, targets, templates) is rewritten; scenes and groups are only listed |
| 2026-11-22 | Enabled, hidden and aliases save right away; name, icon, area and labels keep their save button | Switches and chips are single, clear actions; disabling asks first and names the flows that still use the entry. Aliases are read per entry because HA leaves them out of the registry list |
| 2026-11-22 | Checks on every push and before every release; a tag and GitHub release per version | The Dockerfile already tested each image, but only at release time and once per architecture; now one check job gates both images, so no half release (one arch built, the other failed). The release notes are the changelog section, so there is one source |
| 2026-11-22 | Public ROADMAP.md as tables, SECURITY.md, issue forms, Dependabot | What users and contributors expect from a public project; the roadmap is kept up to date with every step |
| 2026-11-21 | A failed last run is a check-up finding, ignored per failure | The check-up is where people look for what is broken; one `trace/list` for all flows is cheap. Ignoring hides that one failure, a new one shows again |
| 2026-11-21 | "Im Ablauf zeigen" marks the run on the editable flow | People think in the flow they built; the run is shown on its blocks instead of a second, read-only drawing, and editing stays possible |
| 2026-11-21 | Run history reads every kept run in full at once | At most a few dozen runs; one request gives the list and every detail, so switching runs needs no waiting. The backend passes HA's step results through; the UI maps paths onto the blocks it already shows |
| 2026-11-21 | Areas can be created, edited and deleted in HomeAce Studio | Users who start organizing by area should not have to switch to HA for a missing room. Written straight into HA's area registry; deleting is left to HA, so devices and entities lose the area the way HA does it |
| 2026-11-21 | The properties form keeps unsaved edits across live updates | Creating an area from the form triggers a live update; before, the form reset and lost the new selection (and any other unsaved edit). It now resets only for another entry, after saving, or when nothing was changed |
| 2026-11-21 | Area view derives areas instead of asking for setup | Few entries have an area of their own; the devices they use almost always do. Own area wins; else the areas of what is used; helpers take the areas of the flows that use them (one step, so it stays explainable). Every row says why ("über Bewegungsmelder") |
| 2026-11-21 | Areas are a second view of the tree, not a second filter next to folders | Folders and areas answer the same question (where is it?); a switch keeps the tree simple. "Ordnung in einem Klick" turns areas into folders with a preview, using folders with the same name first; nothing is deleted |
| 2026-11-20 | Dependencies computed from the flow configs, not with `search/related` | One read of all configs serves every entry at once and knows what a flow does with an entity (triggers, checks, controls, reads, starts); `search/related` needs one call per entry and only says "related". Checked read-only on the owner's HA: 259 entries in about half a second, same "gone" and "unused" results as the check-up |
| 2026-11-20 | Check-up and dependencies share one snapshot (`snapshot/`) | Both read the same data; one read and one cache instead of two |
| 2026-11-20 | Template IDs only count when the entity exists | Templates contain words like `states.sensor` that look like entity IDs; for gone entities the plain `entity_id` fields are enough |
| 2026-11-20 | Deleting something that is still used warns with the list of users | Deleting a helper silently broke flows before; the warning names them and that they will show up in the check-up |
| 2026-11-20 | Entity picker: area → device → function instead of one long list | Users think in rooms and devices, not entity IDs; HA's own picker is a flat search over thousands of rows. Checked in click dummy v13 with the owner |
| 2026-11-20 | Picker criteria are single-select, the chips stay open | Multi-select felt like clicking ballast in tests ("I meant to pick one"); a panel that closes after each pick felt worse. One value per criterion, a second click clears it |
| 2026-11-20 | The picker only shows what the field allows, without "show all" | HA rejects other kinds there anyway; a hint names the allowed kinds instead |
| 2026-11-20 | "All lights in the area" writes `target.area_id` | HA's own area target also covers devices added later; the entity list of that target is removed so nothing is targeted twice |
| 2026-11-20 | "Unused" only for HA-managed helpers | Template and group helpers often only feed dashboards, which HomeAce Studio cannot see; checking them would flood the list with false findings |
| 2026-11-20 | No version bump before a release is approved | A version change on main builds and publishes the images at once; unreleased work goes under "Unreleased" in the changelog and is tested with scripts/local.mjs first |
| 2026-11-20 | Released as an app repository with ready-made images on ghcr.io | Installing needs only the repository URL; HA downloads instead of building for minutes. The workflow builds on version changes, the JavaScript stages natively and only the runtime stage per arch |
| 2026-11-20 | Icon and logo must not resemble the Home Assistant logo | HA brand rules forbid confusable marks; a house with a node tree inside is HA's own logo |
| 2026-11-20 | AI access over MCP on its own port, off by default, with a token | Ingress only lets HA's frontend in, so an AI client needs another way; a separate port stays closed until the user maps it in the app's network settings and switches access on |
| 2026-11-20 | The AI only proposes plans; the user applies them | An AI must never rearrange a home on its own; the review reuses the preview idea of the tidy-up assistant, and the AI can ask for the outcome |
| 2026-11-20 | `@modelcontextprotocol/sdk` and `zod` (approved by the owner) | The official SDK keeps the protocol up to date for every client; zod is its schema library |
| 2026-11-20 | Token kept in plain text in the overlay | The settings dialog shows it again for copying; the overlay lives in the app's private config folder. Renewing replaces it at once |
| 2026-11-20 | Live messages carry a sequence number | The browser keeps only the latest message text; identical texts did not count as a change, so live updates stopped after the first one |
| 2026-11-20 | Tidy-up assistant: nothing ticked at first, plan again on apply | Dashes also occur inside plain names, so every line is the user's decision ("tick all clear ones" helps); the preview may be old, so apply plans from HA's current state again |
| 2026-11-20 | Near-duplicates by shared word forms, not by edit distance | "Routine", "Routinen", "Routines" share a form after cutting one ending; edit distance would also pair unrelated short names |
| 2026-11-20 | Demo mode with an in-memory fake HA (`HOMEACE_DEMO`) | README screenshots must never show real data; the fake sits behind the two HA services, so every module runs unchanged and the demo also serves for trying the UI and development |
| 2026-11-20 | Screenshots via the DevTools protocol of an installed Edge/Chrome | No Playwright or Puppeteer needed: Node 22 has WebSocket and fetch; `scripts/screenshots.mjs` regenerates all pictures |
| 2026-11-20 | Folder colors are inherited by subfolders without an own color | Coloring every subfolder by hand took many clicks; only own colors are stored, the inherited one is computed in the tree |
| 2026-11-20 | New automations and scripts are created in HA right away, empty (6e) | Deviation from the click dummy, where a new entry is an unsaved draft: a draft-only entry would need a fake entry in list, tree and detail. Created at once like helpers, it is a normal entry; an automation without triggers never runs, and delete removes abandoned ones |
| 2026-11-20 | Automations and scripts can be deleted, only from automations.yaml / scripts.yaml | Same rule as editing; flows from packages must be removed from their YAML by hand |
| 2026-11-24 | Russian as third UI language; first start follows the browser language | Asked for by a Russian-speaking user. Russian plurals need their own rule (`i18n/pluralRules.ts`): ru messages have one form more than en; German stays the default when the browser language is not supported |
| 2026-11-20 | Block operations as typed changes on the draft (6d) | One `FlowChange` type for values and list operations keeps the store simple and every operation testable as a pure function |
| 2026-11-20 | "Disable" writes `enabled: false` | HA's own way: the block stays in the config and can be enabled again |
| 2026-11-20 | New blocks start with defaults only where obvious, missing values shown in orange | Like the click dummy; HA would reject an empty block anyway, the chip shows what is still needed. Checked: none of the 93 real flows shows a false missing chip |
| 2026-11-20 | List groups collapsible, subfolders start collapsed | Wish of the owner: a folder reads as an overview. Search, the open entry and a single group stay expanded; hand toggles reset when another folder is selected |
| 2026-11-20 | Flow view first read-only (6b) | Shows that every real block is understood before anything is written; all 92 flows (204 blocks) of the owner render, none unknown |
| 2026-11-19 | POC step 1 passed (HA 2026.11.2) | All 4 scopes: names with one and two `/` stored unchanged, listed, renamed with the same id; HA refuses duplicate names |
| 2026-11-19 | Own extras (colors, notes, favorites, UI settings per HA user) in one overlay JSON | No DB for now; the add-on config folder is part of HA backups |
| 2026-11-19 | Scenes included next to automations, scripts and helpers | Same category concept, own config API |
| 2026-11-19 | No Vuetify, own components | The look should clearly differ from the HA UI; no UI library to fight against |
| 2026-11-19 | vue-i18n from the start (DE first, EN second) | A public add-on needs English |
| 2026-11-19 | Technical details hidden by default, toggle in settings | Entity IDs, storage badges and API names would put beginners off |
| 2026-11-19 | All panes resizable, responsive from the start | Desktop: drag splitters (keyboard too); phone: list, then detail as full screen |
