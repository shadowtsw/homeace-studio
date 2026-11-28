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
2. **Teach the demo:** `backend/src/demo/fake-ha/` must answer it in HA's shape: the `switch` in
   `FakeHa.call` (or `restGet` / `restPost` / `restDelete`) hands it to the module of its topic.
   Otherwise demo mode and the screenshots break. Add data to `demo-home.ts` if needed.
3. Add the API to the table "HA APIs we rely on" in [architecture.md](architecture.md), and a row with
   risk, code and quick check to [ha-compatibility.md](ha-compatibility.md#touchpoints-by-risk). Add
   that quick check to the HA check as well: an entry `{ area, name, run }` in
   `scripts/ha-check/checks-home.mjs` or `checks-flows.mjs`, with the area named as in the row.
4. If HA's answer can arrive later than the call (new entities after create or reload), poll briefly like
   `waitForEntityId` (helpers) or `FLOW_LOOKUP_ATTEMPTS` (flows).

## New overlay field (own data HA does not know)

1. Field and default in `backend/src/overlay/overlay.model.ts` (`Overlay`, `EMPTY_OVERLAY`). Old files
   lack the field, so read it with a fallback.
2. Write only through `overlay.update(fn)` (queued, atomic). Never read, modify and write by hand.
3. If keys are folder paths or entity IDs, move them along on folder rename (`CategoriesService.rename`)
   and on entity ID rename (`RenameService`), and drop them on delete.

## Shared code in core/

Code the frontend and the backend both need (the theme model and the check of an imported theme;
later the dry-run engine and templates) lives once in `core/`, see `core/README.md`.

1. Edit only in `core/`: plain TypeScript, relative imports, no Vue, NestJS, DOM or HA, no
   user-facing texts (return codes; the frontend says them in the user's language).
2. Run `node scripts/sync-core.mjs`. It copies `core/` into `frontend/src/core/` and
   `backend/src/core/` with a header line; tests (`__tests__/`, Vitest) go to the frontend only.
3. Import the copy: `@/core/themes/...` in the frontend, `../core/themes/...` in the backend.
4. The checks fail while a copy differs (`scripts/check-core-copies.mjs`). Both sides lint, test and
   build their copy, so core code must pass the stricter rules of both (the backend's type-aware
   ESLint, the frontend's `noUncheckedIndexedAccess`).

## Data from outside (a file, pasted text, a link)

Security first: check it like a theme import does ([features/themes.md](features/themes.md#import)).
Size before reading, parse in a Web Worker with a time limit, a fixed schema with an allowlist, a new
object built from known fields only (never merge the original), the same check again in the backend
before storing, and again whenever stored data is read.

## New kept preference (a setting or a remembered view state)

1. Add it to `PREFERENCES` in `frontend/src/constants/preferences.ts` with its scope. The rule: what the
   user sets on purpose is `user` (follows them to every device, later per HA user); what HomeAce Studio
   remembers by itself is `device` (pane widths differ per screen). Adjust the test in
   `constants/__tests__/preferences.spec.ts`; it lists both groups on purpose.
2. Read and write it only through `usePreference({ preference, defaultValue })`, never with
   `useLocalStorage` directly. Scope `user` is then synced with the HA user automatically
   (`stores/preferencesStore.ts`); the backend needs no change.
3. Settings changed on purpose go into `stores/settingsStore.ts`, the look of the columns into
   `stores/layoutStore.ts`, list filters into `stores/studioStore.ts`.

## New UI component or text

- No UI library: scoped plain CSS on the tokens in `frontend/src/styles/tokens.css` (light + dark).
  Shared button classes are in `base.css` (`btn`, `btn--primary`, `icon-btn`).
- Dialogs use `components/common/DialogFrame.vue` and are mounted in `StudioDialogs.vue`, or in one of
  its topic parts (`areas/AreaDialogs.vue`, `entries/EntryDialogs.vue`, `layout/CreateDialogs.vue`).
  Confirmations use `ConfirmDialog.vue`.
- Feedback goes through `toastStore.show(text, tone?, undo?)`, and errors through
  `messages.textFor(error, t("errors.actionFailed"))`.
- Every text in all five locales ([features/i18n.md](features/i18n.md)). Technical details only behind
  `isTechnicalDetailsVisible`.
- Numbers from HA (values with a unit, number fields) go through `formatNumber` / `formatWithUnit`
  (`utils/formatNumber.ts`): decimals and thousands in the UI language, as HA shows them; percent
  through `common.percent` ("25 %" in German and French, "25%" in English, Spanish, Russian, like HA).
  Never `${value} ${unit}` or a hard-coded "°C": the unit comes from HA.
- User-facing texts (UI, "Was ist neu", CHANGELOG, DOCS.md) say what the user notices, never how it is
  built. This wiki and code comments stay complete.
- A feature with a quirk brings a "Gut zu wissen" topic: add it to `GOOD_TO_KNOW_TOPICS`
  (`constants/settings.ts`) and its texts under `settings.goodToKnow.<topic>` in all five locales
  ([ui/layout.md](ui/layout.md#settings-window)).
- Everything must work on touch and narrow screens ([ui/layout.md](ui/layout.md)). Menus must be visible
  without hover on touch.

## New theme colour (token)

Every theme sets every token, so a new colour is added in all places at once
([features/themes.md](features/themes.md)):

1. `core/themes/themeFormat.ts` → `THEME_TOKENS` (then `node scripts/sync-core.mjs`; a file may also
   bring it as a fine-tuned value).
2. `frontend/src/utils/themes/tokens.ts` → `deriveTokens` derives it from the seven colours; if it is
   text or a mark on something, add the pair to `FLOOR_PAIRS`.
3. Standard's exact value in `STANDARD_TOKENS` (`builtInThemes.ts`) and the same in
   `frontend/src/styles/tokens.css` (light and dark; a test keeps both equal).
4. Components use it only through `var(--…)`; no fixed colour values in components.

## Release

See [setup.md](setup.md#releases): version in `homeace-studio/config.yaml`, a `CHANGELOG.md` section, and
"What's new" highlights in `frontend/src/constants/whatsNew.ts`.

## HA release check

HA releases once a month on the first Wednesday; the beta comes out the Wednesday before. Check in that
beta week, so a fix can be ready on release day. The areas and quick checks are in
[ha-compatibility.md](ha-compatibility.md).

1. **Read** the beta release notes, above all "Backward-incompatible changes", and the developer blog
   (developers.home-assistant.io/blog) since the last check. Look for the words of the touchpoint table:
   registry, category, label, area, device, entity, trace, automation, script, scene, the helper types,
   trigger, condition, translations, frontend, WebSocket, ingress, Supervisor, apps.
   Also look for anything new around blueprints (schema, versions, import, re-import, editor). Our planned
   blueprint editor builds on them; write it in the Check log even when it does not break anything.
2. **Test** on a real HA, at best a throwaway one with the beta, otherwise the own HA right after the
   release. Run the quick checks of every hit, and the 🔴 rows every time. `node scripts/ha-check/run.mjs`
   does this for the beta on its own: a fresh HA and the app from the working tree in Docker, then the
   quick checks through the API and a few flows in the UI ([setup.md](setup.md#ha-check)). It does not
   cover HA user, Supervisor and icon packs. Check those on the own HA after the release.
3. **Write it down:** a line in the "Check log" of ha-compatibility.md, also when nothing was found. A
   real change also goes to "Known changes" with our answer.
4. **Fix** in a patch release; the CHANGELOG line names the HA version. If an older HA can no longer work
   with the fix, raise `homeassistant:` (minimum HA version) in `homeace-studio/config.yaml`.
5. **Own release:** not on HA's release day. If it comes after it, test with the new HA version first.

Patch releases of HA (`2026.12.1`, …) rarely touch these interfaces: only scan their notes.
