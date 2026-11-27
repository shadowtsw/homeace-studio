# Themes

Themes give HomeAce Studio other colours: the same CSS variables of `styles/tokens.css`, other values.
Only HomeAce's own look, never HA dashboard themes. The settings window has the page "Aussehen" (second
section): the brightness for this device and the theme for the user. The layout of the window is in
[../ui/layout.md](../ui/layout.md#settings-window).

## Model

- **A theme has a light and a dark version** (`ThemeDefinition` in `utils/themes/builtInThemes.ts`). A
  version is seven colours (`ThemeColors`): background, surface, text, accent, and the colours of the
  flow sections `flowWhen`, `flowIf`, `flowThen` ("Wenn", "Und nur wenn", "Dann"). Everything else is
  derived (`deriveTokens` in `utils/themes/tokens.ts`). A theme may have one version only (Mitternacht is
  dark only); then the brightness switch is locked and says why.
- **Brightness** Hell / Dunkel / System only picks the version. It depends on the device (a wall tablet
  light, a phone dark), so it is `PREFERENCES.colorMode` with scope device. The **theme** is
  `PREFERENCES.theme`, scope user: it follows the HA user like the language.
- **Standard is today's HomeAce, value for value** (`STANDARD_TOKENS`), not derived: whoever picks no
  theme sees no change. `styles/tokens.css` holds the same values for the first paint, before the app
  runs; `utils/themes/__tests__/themes.spec.ts` keeps both equal. Change a Standard colour in both.
- **Flow sections have tokens of their own**: `--flow-when`, `--flow-if`, `--flow-then` (each with
  `-soft`). They keep their family (orange, teal, blue) in every theme, also where the accent is another
  colour (Wald: green accent, blue "Dann"). `FlowView.vue` and the version comparison use them.
- **Kinds of entries** in lists and filters: automation follows "Wenn", helper follows "Und nur wenn"
  (as before). Script (purple) and scene (pink) keep Standard's colour of the version; their soft
  backgrounds are mixed onto the theme's surface.
- **Floor** (`MIN_CONTRAST` = 2 : 1): checked on the end result for text on background and surface, quiet
  text, accent, text on accent buttons, the flow, kind and state colours on the surface
  (`FLOOR_PAIRS`). Derived colours below it are moved in lightness (`ensureContrast`), so every theme stays
  readable, the settings window included. The ready-made themes reach at least 4.5 : 1 for text (test).
- **Fine-tuned values** (prepared pro mode, no UI): single tokens per version on top of the derived ones
  (`fineTokens.light` / `.dark`). One that adds a pair below the floor is dropped (`withFineTokens`
  reports it). Found in the dummy: a white `--bg` made the dark version unreadable.
- **Applying**: `stores/themeStore.ts` sets every token of the chosen theme inline on `<html>` and its
  `color-scheme`, so every `var(--…)` follows at once. App.vue creates the store before the first picture.
  An unknown or broken stored theme (another device's newer one, a typo) shows Standard.
- **Escape hatch**: `…?theme=standard` (before the `#`) sets Standard for this visit, also over a value
  the backend brings later, until the user picks a theme. It works on the direct port and in a new tab;
  inside the HA panel the address is HA's, so there the floor keeps every theme readable.

## Own themes

- "Meine Themes" on the page "Aussehen": themes the user imported (later also made in the editor).
  **Per HA user** in the overlay (`userThemes`, `GET/POST/DELETE /api/themes`, [../api.md](../api.md)),
  at most 20 (`MAX_OWN_THEMES`). Without a HA user (direct port, demo) only in this browser. The
  browser always keeps a copy (`PREFERENCES.ownThemes`), so they show at once on the next start; the
  backend's list replaces it (`stores/ownThemesStore.ts`). Whatever comes from storage or the backend
  is checked again (`readOwnThemes`).
- The chosen theme is the preference `theme` with the own theme's id (`own-` + twelve hex digits). A
  deleted or unknown id shows Standard; deleting the theme that is on switches to Standard.
- A name another own theme has gets " (2)" (`uniqueThemeName`); nothing is ever overwritten.

## Import

Never silent: a file or pasted text goes through the **gate**, the page "Theme importieren" (a step
below "Aussehen" in the history, `SETTINGS_SUB_PAGE.themeImport`) shows a preview of both versions with
the **check report**, and only "Übernehmen" keeps the theme and puts it on.

- **Gate** (`utils/themes/themeGate.ts`): the size is checked before anything is read (64 KB,
  `File.size`), then the text goes to a Web Worker of its own (`themeCheck.worker.ts`) with a 2 s
  limit; the worker is ended afterwards. If it cannot start, nothing is taken over (no check without
  the gate). The worker's answer is checked once more in the page (`readGateAnswer`): the theme again
  with `checkThemeValue`, the report only with known kinds and codes and short plain-text values.
- **Check** (`core/themes/checkTheme.ts`, the same in the backend): the marker `"homeace-theme": 1`
  (older versions are converted later, newer ones refused), only known fields (unknown ones are named
  and dropped, `__proto__` included), colours only `#rrggbb`, a missing colour from Standard, an
  invalid one replaced, names as plain text (no HTML, no invisible or direction characters, at most
  40), fine-tuned values only for known colour tokens. A new object is built from what passed; the
  original text never reaches the app. A missing dark version is derived (`deriveDarkColors`).
- **Report**: codes from the check plus what the floor will do (`floorFindings`): text it makes
  readable, fine-tuned values it drops. Texts in `settings.appearance.report.<code>`.
- Pasted text comes from a text field; the app never reads the clipboard by itself.

## Sharing

"Exportieren" saves `<name>.homeace-theme.json`, "Kopieren" puts the same text on the clipboard (for a
forum code block). Where the clipboard is closed (HA over plain http, some apps) the page "Theme als
Text" shows it to copy by hand (`composables/useThemeSharing.ts`). The file is the format of
`core/themes/themeFormat.ts` (`themeFileText`).

**Only own themes are shared** (owner's decision 2026-11-27): everyone has the ready-made ones, and a
file holds only the seven colours per version, so a shared "Standard" would come back derived, not with
its exact values. For a ready-made theme the bar under the cards only says "Fertiges Theme"; a copy to
change comes with the editor ("Als Kopie bearbeiten").

## Editor

A page below "Aussehen" (`SETTINGS_SUB_PAGE.themeEditor`, a step in the history like the import), with
the action bar (phone preview · Abbrechen · Speichern) fixed at the bottom.

- **Ways in**: "Neues Theme" (a draft from Standard; "Ausgehend von" picks another ready-made start),
  "Als Kopie bearbeiten" on a ready-made theme ("Wald (Kopie)"), "Bearbeiten" on an own one. Ready-made
  themes are never changed themselves. Saving adds a new theme or replaces the own one in place
  (`PUT /api/themes/:id`, checked again, keeps its id); names stay unique with " (2)".
- **Fields** (`ThemeEditorFields`, `ThemeColorField`): four base colours and the three flow colours per
  version, each with a colour picker and its code; a typed code counts only as a full `#rrggbb`.
  "Hell bearbeiten / Dunkel bearbeiten" picks the version; a copy of a dark-only theme has only dark.
- **"Dunkel automatisch ableiten"** (`deriveDarkColors`): on, the dark fields show the derived values
  and cannot be changed; off, the hand-made dark version starts from the derived one. The file format
  has no field for it: a theme opens with it on when its dark version is exactly the derived one. A new
  theme from Standard starts with it on, a copy of another ready-made theme keeps its crafted dark.
- **Contrast warnings** (`utils/themes/contrastChecks.ts`): text on background and on surfaces (reads
  well from 4.5 : 1), accent on surfaces (3 : 1), for the version being edited; below the floor
  "unlesbar, wird angepasst". "Vorschlag übernehmen" moves the lightness until it reads well (text
  against both backgrounds). Saving stays allowed; the toast says what the floor adjusts.
- **Previews** show only the draft (the page keeps its theme, so the window stays readable):
  `ThemePreview` (list row, flow sections, buttons, switches, hint) and the **phone preview**
  `ThemePhonePreview` (owner's variant B): beside the window from 1260 px
  (`PHONE_PREVIEW_SIDE_MEDIA_QUERY`, the window keeps 880 px and moves left), narrower it takes the normal
  preview's place, not offered in the list layout. Both are drawings in the app's look, not the live
  app: a frame with the real app would share this browser's storage and need a second live connection.
- **Draft** (`stores/themeEditorStore.ts`): kept until "Speichern" or "Verwerfen"; the back gesture or
  another tab leave it, "Aussehen" then offers "Weiter bearbeiten · Verwerfen". "Abbrechen" asks once
  when something changed. Closing the settings window drops it. Fine-tuned values of an imported theme
  stay as they are (no UI yet).

## Where what lives

| What | Where |
| --- | --- |
| File format, token list, Standard's colours, file text and name | `core/themes/themeFormat.ts` (copied into both sides, see [../recipes.md](../recipes.md#shared-code-in-core)) |
| Colour arithmetic (`#rrggbb` only, mix, WCAG contrast, lightness) | `core/themes/color.ts` |
| Check of a theme from outside, report codes | `core/themes/checkTheme.ts` |
| Dark version from a light one | `core/themes/deriveDark.ts` |
| Own themes: ids, unique names, reading stored lists | `core/themes/ownThemes.ts` |
| Derivation, floor, fine-tuned values | `frontend/src/utils/themes/tokens.ts` |
| Standard's exact values, the ready-made themes, version of a theme | `frontend/src/utils/themes/builtInThemes.ts` |
| Gate (Web Worker, size, time limit), what the floor will do | `frontend/src/utils/themes/themeGate.ts`, `themeCheck.worker.ts`, `floorReport.ts` |
| Chosen theme, brightness, applying, escape hatch | `frontend/src/stores/themeStore.ts` |
| Own themes, import steps, copy page text, editor draft | `frontend/src/stores/ownThemesStore.ts`, `themeImportStore.ts`, `themeEditorStore.ts` |
| Contrast warnings and suggestions of the editor | `frontend/src/utils/themes/contrastChecks.ts` |
| Page "Aussehen", cards, actions, import, copy and editor pages, previews, report | `frontend/src/components/settings/SettingsAppearanceTab.vue`, `components/settings/appearance/` |
| Names, notes, report and editor texts | `settings.appearance.*` in `frontend/src/locales/*.ts`, `composables/texts/useThemeTexts.ts` |
| Backend: list, create, replace (checked again), delete | `backend/src/themes/` |

## Rules and pitfalls

- Components use only tokens; a new colour in a component needs a token, and every theme sets it
  (`THEME_TOKENS`, `deriveTokens`, `STANDARD_TOKENS`, `tokens.css`).
- Values reach the page only through `style.setProperty` and only from checked data: colours are
  `#rrggbb` (`isHexColor`), nothing like `url(…)`.
- A theme card draws its theme with the card's own inline tokens; only the small preview uses them.
- Field names avoid `then`: an object with a `then` field looks like a promise to `await` (oxlint
  `no-thenable`), hence `flowWhen` / `flowIf` / `flowThen`.

- The gate is shared with the templates of 0.16: keep `checkTheme.ts` free of anything theme-only that
  a template check could not reuse (size, parse, allowlist, plain text, report codes).

## Still to come in 0.15

"Wie mein HA" with "Als eigenes Theme übernehmen" (package 5).
