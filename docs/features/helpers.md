# Helpers

HA has two kinds of helpers, and HomeAce Studio treats them differently:

| Kind | Domains | Create, settings, copy, delete here | How the backend tells them apart |
| --- | --- | --- | --- |
| **Storage helpers** (HA keeps them in its storage collections) | `input_boolean`, `input_button`, `input_number`, `input_text`, `input_select`, `input_datetime`, `counter`, `timer` | yes | registry `platform` is one of `HELPER_TYPES` |
| **Config-entry helpers** (template, group, utility_meter, …) | ordinary domains like `sensor` | no, only list, move, properties ("later" note in the settings tab) | `config_entries/get` of type `helper` (`entry.mapper.ts` `detectKind`) |

## Where what lives

| What | File |
| --- | --- |
| "Neuer Helfer" dialog (type, name, icon, folder, settings) | `frontend/src/components/helpers/NewHelperDialog.vue` |
| Settings fields per type, shared by the dialog and the tab | `frontend/src/components/helpers/HelperSettingsFields.vue` |
| "Einstellungen" tab (first tab of every helper), teleported save footer | `frontend/src/components/helpers/HelperSettingsView.vue` |
| Checks while typing, never stricter than the backend | `frontend/src/utils/helperSettings.ts` (`helperSettingsProblem`, `badOptionIndexes`) |
| Types, icons, form defaults (same as the backend's) | `frontend/src/constants/helpers.ts` |
| Which helpers are deletable / copyable / editable | `frontend/src/utils/entryActions.ts`, `DELETABLE_HELPER_DOMAINS` in `constants/entries.ts` |
| `POST /api/helpers`, `GET/PUT /api/helpers/:id/settings`, `DELETE /api/helpers/:id` | `backend/src/helpers/helpers.controller.ts` |
| Create, delete, settings, copy | `backend/src/helpers/helpers.service.ts` |
| Settings checks and mapping (camelCase UI ↔ HA field names) | `backend/src/helpers/helper-payload.ts` |
| HA calls (`<type>/create · list · update · delete`, registry) | `backend/src/helpers/repositories/ha-helpers.repository.ts` |

## Flows

- **Create:** `buildHelperPayload` checks per type → `<type>/create` → wait for the entity (HA registers it
  a moment later, `waitForEntityId` with a few retries) → sort into the folder
  (`CategoriesService.assign`, scope `helpers`). If the entity never shows up, the helper still exists.
  Only the folder is missing, and the answer falls back to `<type>.<id>`.
- **Settings:** `helperSettingsOf(type, stored)` maps HA → form. `buildUpdatePayload` maps form → the
  **whole** stored helper for `<type>/update`, because HA replaces it. Name, icon and fields the form does
  not show are sent along unchanged.
- **Copy** (duplicate): `buildCopyPayload` = everything stored with a new name, then folder, labels and
  area. HA starts its value fresh.
- **Delete:** `<type>/delete`, then own extras (favorite, note) and the category if it became empty.
- An invalid setting throws `HelperSettingsError(field)` → `HELPER_SETTINGS_INVALID` with
  `params.field`, so the UI can name the field.

## Rules

- The frontend check (`helperSettings.ts`) shows problems while typing and marks the fields red. It must
  never refuse what the backend accepts. The backend is the authority.
- Timer durations: HA stores `0:05:00`, and the form shows `00:05:00` (`helper-payload.ts`).
- `input_text` max length is capped at HA's own limit.
- Unsaved settings are kept per entry in `draftsStore` (`keepHelper`), so they survive switching tabs
  and entries. The tab reloads HA's settings on entity change and puts the kept draft on top; when HA's
  settings differ from the draft's `base`, the footer says so (`save.remoteChanged`).

## Recipe: support a new storage helper type

1. Backend: add the type to `HELPER_TYPE` (`helpers.constants.ts`; `HELPER_TYPES` derives from it), plus checks and mapping in
   `buildHelperPayload`, `helperSettingsOf` and `buildUpdatePayload`. Add tests.
2. Frontend: add it to `HELPER_TYPES`, `HELPER_TYPE_ICON` and `DEFAULT_HELPER_SETTINGS`
   (`constants/helpers.ts`), add it to `DELETABLE_HELPER_DOMAINS` (`constants/entries.ts`), add fields in
   `HelperSettingsFields.vue` and checks in `helperSettings.ts`, and add texts under `helper.*` /
   `helperSettings.*` in all five locales.
3. Backend `HELPER_DOMAINS` (`entries/entries.constants.ts`) so it lists as a helper and its state
   changes reach the live updates, and `CHECKED_HELPER_DOMAINS` (`checkup/checkup-analysis.ts`) if unused
   ones should be reported.
4. Demo: `fake-ha.ts` `helperCommand` handles `<type>/*` generically. Add the type's settings
   attributes if it has any.
