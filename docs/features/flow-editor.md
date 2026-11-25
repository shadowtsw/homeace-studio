# Flow editor

The "Ablauf" tab of automations and scripts. It turns HA's stored config into sentence blocks
(Wenn / Und nur wenn / Dann, or just the sequence for scripts) with clickable chips. It edits a draft and
saves the whole config back to HA. No YAML in the UI.

## Where what lives

**Frontend** (`frontend/src/`)

| What | File |
| --- | --- |
| Tab view: mode bar, three sections, the one popover for every editor and menu | `components/flow/FlowView.vue` |
| One block (recursive): icon, title, chips, "+ Option", ⋮ menu, branches, run state | `components/flow/FlowBlock.vue` |
| Popover / bottom sheet (≤ 560 px) for a value or a menu | `components/flow/ChipEditorPopover.vue` (+ `ChoiceList.vue`) |
| Entity editor | `components/flow/EntityPicker.vue`, `EntityPickerRow.vue`, pure parts in `utils/entityPicker.ts` |
| Add button of a list | `components/flow/AddBlockButton.vue` |
| New automation / script (name + folder) | `components/flow/NewFlowDialog.vue` |
| What FlowView provides to nested blocks | `components/flow/flowEditing.ts` (`FLOW_EDITING`, `FLOW_RUN_STATES`) |
| Config → display blocks | `utils/flow/toDisplayFlow.ts` |
| Which editor a value gets | `utils/flow/valueEditors.ts` (`editorForSelector`, `classicFieldEditor`) |
| Typed input → HA value | `utils/flow/editValue.ts` |
| Chip texts (durations, entity names, values) | `utils/flow/formatValue.ts` |
| Block types to add and their new config | `utils/flow/blockTypes.ts` (`CLASSIC_KINDS`, `blockTypes`, `newBlock`) |
| Icons | `utils/flow/blockIcons.ts` |
| Changing the config | `utils/flow/configPath.ts` (`parsePath`, `setAtPath`, `getAtPath`), `utils/flow/flowChanges.ts` (`applyFlowChange`) |
| Red chips for entities the check-up found gone | `utils/flow/markGoneChips.ts` |
| State suggestions for "to" / "state" fields | `utils/flow/stateSuggestions.ts` |
| Texts the converter needs | `composables/useFlowTexts.ts` (`flow.titles`, `flow.labels`, `flow.choices` in the locales) |
| Catalog, flow, drafts, save | `stores/editorStore.ts`, `services/editorService.ts`, `services/flowsService.ts` |
| Types (mirror the backend) | `types/editor.ts` |

**Backend** (`backend/src/editor/`)

| What | File |
| --- | --- |
| `GET /api/editor/catalog`, `GET/PUT /api/editor/flows/:id` | `editor.controller.ts`, `editor.service.ts` |
| `POST /api/flows`, `DELETE /api/flows/:id` | `flows.controller.ts`, `flows.service.ts` |
| HA calls (config, storage key, REST save) | `repositories/ha-editor.repository.ts` |
| HA descriptions + translations → catalog | `catalog.mapper.ts` (`buildCatalog`) |
| Names for the entities a config mentions | `flow-entities.ts` (`collectEntityIds`) |
| Script keys from names (`gute_nacht`, `_2` for duplicates) | `flow-key.ts` |
| HA's rejection → `FLOW_INVALID` | `flow-errors.ts` |

## Round trip

```text
GET /api/editor/flows/:id
  → WS automation/config | script/config (the config HA runs)
  → storage key: automation `id` / script registry unique_id
  → editable only if REST /api/config/<kind>/config/<key> has it and it has no `use_blueprint`
  → { config, entityNames, isEditable }
editorStore.flow ─┐
drafts[entityId] ─┴→ editedFlow → toDisplayFlow(flow, catalog, texts) → markGoneChips → FlowView
chip / menu → FlowChange → editorStore.applyChange → applyFlowChange(draft) (HA untouched)
"In HA speichern" → PUT /api/editor/flows/:id { config } → REST POST (HA validates and reloads)
```

- **Display:** `toDisplayFlow` reads the new syntax (`triggers` / `conditions` / `actions`) with a fallback
  to the old one (`trigger`, …). Paths use the key the config really has. Scripts only have `sequence`.
- **Block kinds:** structural actions (delay, if, choose, repeat, parallel / sequence, wait, stop) and classic
  triggers/conditions (state, numeric_state, time, sun, template, …) are hand-made. Everything HA
  describes (new-style triggers like `zone.entered`, every service action) is a **generic block** from the
  catalog: title from HA, target chips, set fields, missing required fields, addable optional fields.
- **Unknown blocks:** anything else becomes `isUnknown` with its raw config. It is shown and saved
  unchanged. This is a core promise of the editor (docs/decisions.md). Never drop or rewrite what you don't
  understand.
- **Chips carry their place:** `edit.path` is the exact config path (`["actions", 2, "data", "brightness"]`).
  An edit is `{ type: "set", path, value }`, and `undefined` removes the key. `setAtPath` copies only the
  changed branch and keeps key order and untouched objects.
- **Block positions:** every block knows `position = { listPath, index, count }`. Move, duplicate, remove
  and toggle work on that list.
- **Single item vs. list:** HA allows `triggers: {…}` instead of a list. Index 0 then means the item
  itself, and the item becomes a real list once its length changes.
- **Disabling** sets `enabled: false` and enabling removes the key. A string condition (template
  shorthand) is first expanded to `{ condition: "template", value_template, enabled: false }`.

## Drafts and saving

- `drafts[entityId] = { base, config }`. `base` is the config the edits started from. Edits survive
  switching entries. The list shows a dot for every `unsavedIds` entry, and the tab asks before closing
  (`beforeunload`).
- Editing back to the original removes the draft (`sameConfig(config, base)`).
- Live updates refresh `flow` quietly (`refreshFlow`). If HA's config no longer equals `base`,
  `hasRemoteChange` shows a note in the save footer. Saving then overwrites HA's version.
- Saving forces the automation's `id` to the storage key (the id ties config and entity). The backend
  returns the saved config instead of reading it back, because HA reloads in the background.
- **Read-only:** flows from packages or other YAML, and blueprint automations (`use_blueprint`), get
  `isEditable: false`. Chips are plain text, and menus and add buttons are hidden.

## Editors

`editorForSelector` maps HA selectors: entity, area, number (also `color_temp`), boolean, select →
choice, duration, time, date, text, template, icon → text, state → text with state suggestions. A value
that is a template (`{{ … }}`) always gets the template editor. Classic fields have their own mapping
(`classicFieldEditor`). Values that cannot be a chip (objects, lists of objects) get no editor and stay
read-only.

The entity picker supports free word order and folded umlauts, criteria area / label / kind, an area view
with device cards, and "Alle Lichter · Wohnzimmer". The last writes `target.area_id` and removes the entity
list (`onApplyArea`). Suggestions: entities the flow already uses, then the entry's area.

## Recipes

- **New hand-made block kind:** add it to `CLASSIC_KINDS` (order = menu order) and a template in
  `blockTypes.ts`. Rendering goes in `toDisplayFlow.ts` (structural: `structuralBlock` /
  `loopOrWaitBlock`, classic: `CLASSIC_*_FIELDS`, `REQUIRED_FIELDS`), the icon in `CLASSIC_ICON`, the
  title in `flow.titles.<kind>` (or `<kind>_<section>`) in all five locales, plus a test in
  `utils/__tests__/flowDisplay.spec.ts` / `flowBlocks.spec.ts`. The demo home should contain an example (`backend/src/demo/demo-home.ts`).
- **New value editor type:** extend `ValueEditor` in `types/editor.ts`, map it in `valueEditors.ts`,
  render it in `ChipEditorPopover.vue`, and convert input in `editValue.ts`.
- **Block menu action:** `BLOCK_ACTION` + `blockChange` in `FlowView.vue`, a new `FlowChange` type in
  `types/editor.ts`, and its handling in `applyFlowChange`.

## Related

- Showing a run on the blocks ("Im Ablauf zeigen"): [run-history.md](run-history.md).
- Endpoints: [../api.md](../api.md) (editor and flows sections).
