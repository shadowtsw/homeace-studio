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

## Where what lives

| What | Where |
| --- | --- |
| Colour arithmetic (`#rrggbb` only, mix, WCAG contrast, lightness) | `frontend/src/utils/themes/color.ts` |
| Token list, derivation, floor, fine-tuned values | `frontend/src/utils/themes/tokens.ts` |
| Standard's exact values, the ready-made themes, version of a theme | `frontend/src/utils/themes/builtInThemes.ts` |
| Chosen theme, brightness, applying, escape hatch | `frontend/src/stores/themeStore.ts` |
| Page "Aussehen": brightness switch, theme cards with a small preview | `frontend/src/components/settings/SettingsAppearanceTab.vue` |
| Names and notes of the themes | `settings.appearance.themes.<id>` in `frontend/src/locales/*.ts` |

## Rules and pitfalls

- Components use only tokens; a new colour in a component needs a token, and every theme sets it
  (`THEME_TOKENS`, `deriveTokens`, `STANDARD_TOKENS`, `tokens.css`).
- Values reach the page only through `style.setProperty` and only from checked data: colours are
  `#rrggbb` (`isHexColor`), nothing like `url(…)`.
- A theme card draws its theme with the card's own inline tokens; only the small preview uses them.
- Field names avoid `then`: an object with a `then` field looks like a promise to `await` (oxlint
  `no-thenable`), hence `flowWhen` / `flowIf` / `flowThen`.

## Still to come in 0.15

Own themes and the import check (package 3), the editor with the phone preview (package 4), "Wie mein
HA" (package 5).
