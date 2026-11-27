# Entry actions

Everything you can do to one entry outside its editor tab: run, switch, favorite, note, rename (name and
entity ID), duplicate, enable / disable / hide, delete. The buttons sit in the detail header, the list
rows and the properties tab.

## Who can do what

`frontend/src/utils/entries/entryActions.ts` decides it, mirroring the backend:

| Action | Entries | Backend |
| --- | --- | --- |
| Run | automation, script, scene, `input_button` (`ACTION_DOMAINS.run`) | `POST /api/entries/:id/run` → `SERVICE_BY_ACTION` |
| On / off switch | automation, `input_boolean` (both directions needed; `canToggle`) | `/turn-on`, `/turn-off` (script: off = stop) |
| Favorite, note | every entry (overlay) | `PATCH /api/entries/:id/extras` (`entry-extras.ts`) |
| Name, icon, area, labels, aliases, hidden, disabled | registry entries | `PATCH /api/entries/:id` (only the changed fields) |
| Entity ID | registry entries | `GET /api/entries/:id/references`, `POST /api/entries/:id/rename` |
| Duplicate | automations and scripts in `automations.yaml` / `scripts.yaml`, storage helpers | `POST /api/entries/:id/duplicate` |
| Delete | automations and scripts in those files, storage helpers | `DELETE /api/flows/:id`, `DELETE /api/helpers/:id` |

Disabled entries have no state and cannot act (`supportsAction`). The header shows "deaktiviert" and an
"Aktivieren" button instead.

## Where what lives

| What | File |
| --- | --- |
| Frontend actions with toasts, confirmations, undo | `frontend/src/composables/actions/useEntryActions.ts` |
| Dialogs (delete with users, disable with users, entity ID) | `frontend/src/components/entries/EntryDialogs.vue` (mounted by `layout/StudioDialogs.vue`), `components/entries/RenameEntityDialog.vue` |
| Entity ID field with suggestion (`slugifyName` like HA) | `components/entries/detail/EntityIdField.vue`, `utils/entities/entityId.ts` |
| Enabled / hidden / aliases | `components/entries/detail/EntryVisibilityForm.vue` |
| Inline name input (list row, title, folders, areas) | `components/common/InlineNameInput.vue`. Enter or blur saves, Esc cancels |
| Entries, update, extras, actions | `backend/src/entries/entries.service.ts`, `entries.controller.ts`, `entry-extras.ts` |
| Entity ID rename | `backend/src/rename/rename.service.ts`, `entity-id.ts` (pure: `countEntityId`, `replaceEntityId`) |
| Duplicate | `backend/src/duplicate/duplicate.service.ts` |

## Behavior

- **Rename (name):** saved in HA with "Rückgängig" in the toast (`toastStore.show(text, tone, undo)`).
- **Entity ID:** the dialog lists every reference first (flows with a count, members of scenes and
  groups). The registry rename moves history and statistics along. Favorite, note and ignored findings move
  to the new ID, and editable flows are rewritten when "Verweise" is ticked. Matching is on whole IDs only
  (`light.terrace` never hits `light.terrace_paths`), and service names are left out. Places that cannot
  be rewritten are reported back.
- **Duplicate:** flows: `FlowsService.create` with the original as template, then folder, labels and area.
  An automation copy is **switched off**. Helpers: `HelpersService.copy`. The copy opens with its name in
  inline rename.
- **Disable:** asks first and lists who still uses the entry (dependencies).
- **Delete:** removes the flow from its file or the helper from HA, then its extras and its category if
  that became empty and HomeAce owns it.

## Pitfalls

- `ACTION_DOMAINS` (frontend `constants/entries.ts`) and `SERVICE_BY_ACTION` (backend) must stay in step.
