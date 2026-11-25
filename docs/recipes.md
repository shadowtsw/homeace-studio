# Recipes

Checklists for changes that touch several places. Feature-specific recipes are on the feature pages
(flow editor, scenes, helpers, check-up, detail tabs).

## New backend endpoint

1. **Module** `backend/src/<feature>/`: controller → service → repository interface (token in
   `<feature>.constants.ts`) → HA implementation in `repositories/`. Register the module in
   `app.module.ts`.
2. **DTO** with `class-validator` for every body. Validation errors come back as `VALIDATION_FAILED`
   with `fields` on their own.
3. **Responses** go through the global envelope (`ResponseEnvelopeInterceptor`). Return the data, and
   throw `BadRequestException(apiError(MESSAGE_ID.x, { params }))` and friends for errors.
4. **Message IDs** in `messages/message-ids.ts` plus a text in all five `catalog.*.ts`
   ([features/i18n.md](features/i18n.md)).
5. **Tests**: `*.spec.ts` next to the file. Pure logic in its own file without Nest (like
   `checkup-analysis.ts`).
6. **Docs**: a section in [api.md](api.md), the feature page, and the module line in
   [architecture.md](architecture.md).
7. **Frontend**: a function in `services/<feature>Service.ts` using `apiFetch` / `apiPost` / `apiSend`
   with **relative** paths (ingress), and types mirroring the backend model.

## New HA command or REST call

1. Add the command name to `HA_COMMAND` (`backend/src/ha/ha.constants.ts`) and call it through
   `HaConnectionService.call` (WebSocket) or `HaRestService` (REST, only where the WebSocket has no
   command).
2. **Teach the demo:** `backend/src/demo/fake-ha.ts` must answer it in HA's shape (the `switch` in its
   command handler, or `restGet` / `restPost` / `restDelete`). Otherwise demo mode and the screenshots
   break. Add data to `demo-home.ts` if needed.
3. Add the API to the table "HA APIs we rely on" in [architecture.md](architecture.md).
4. If HA's answer can arrive later than the call (new entities after create or reload), poll briefly like
   `waitForEntityId` (helpers) or `FLOW_LOOKUP_ATTEMPTS` (flows).

## New overlay field (own data HA does not know)

1. Field and default in `backend/src/overlay/overlay.model.ts` (`Overlay`, `EMPTY_OVERLAY`). Old files
   lack the field, so read it with a fallback.
2. Write only through `overlay.update(fn)` (queued, atomic). Never read, modify and write by hand.
3. If keys are folder paths or entity IDs, move them along on folder rename (`CategoriesService.rename`)
   and on entity ID rename (`RenameService`), and drop them on delete.

## New UI component or text

- No UI library: scoped plain CSS on the tokens in `frontend/src/styles/tokens.css` (light + dark).
  Shared button classes are in `base.css` (`btn`, `btn--primary`, `icon-btn`).
- Dialogs use `components/common/DialogFrame.vue` and are mounted in `StudioDialogs.vue`. Confirmations
  use `ConfirmDialog.vue`.
- Feedback goes through `toastStore.show(text, tone?, undo?)`, and errors through
  `messages.textFor(error, t("errors.actionFailed"))`.
- Every text in all five locales ([features/i18n.md](features/i18n.md)). Technical details only behind
  `isTechnicalDetailsVisible`.
- Everything must work on touch and narrow screens ([ui/layout.md](ui/layout.md)). Menus must be visible
  without hover on touch.

## Release

See [setup.md](setup.md#releases): version in `homeace-studio/config.yaml`, a `CHANGELOG.md` section, and
"What's new" highlights in `frontend/src/constants/whatsNew.ts`.
