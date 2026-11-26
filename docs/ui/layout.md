# Page layout

The app is one page with three columns: **Navigation** (left), **List** (middle) and **Detail** (right).
The code calls them `nav`, `list` and `detail`. Each column has its own page:
[navigation.md](navigation.md), [list.md](list.md), [detail.md](detail.md).

**Names users see:** Navigation · Liste · **Details** (en Navigation · List · Details, fr Navigation ·
Liste · Détails, es Navegación · Lista · Detalles, ru Навигация · Список · Подробности). The topic
"Was ist was" in "Gut zu wissen" shows them in a sketch, so users name the columns the same way when
they help each other. Use exactly these words in every user text (app, README, DOCS.md, posts).

## Where what lives

| What | File |
| --- | --- |
| The page: loads data, wires the three columns, handles their events | `views/StudioView.vue` |
| Everything the page derives (tree, filtered entries, counts, area nav, open entry) | `composables/useStudioData.ts` |
| What the user is looking at: tree selection, scope tab, search, open entry, ticked rows, inline rename | `stores/studioStore.ts` |
| Settings the user changes on purpose (scope `user`): technical details, language, scene auto-save | `stores/settingsStore.ts` |
| How the columns look on this device (scope `device`): pane widths, nav mode, detail folded | `stores/layoutStore.ts` |
| Every kept preference with its storage key and scope; read and written only through `usePreference` | `constants/preferences.ts`, `composables/usePreference.ts` (all in localStorage for now, `homeace.*`) |
| Top bar (connection status, live dot, language menu, gear, What's new) | `components/layout/AppTopBar.vue`, `LanguageMenu.vue`, `WhatsNewMenu.vue` |
| Settings window (tabs, one file per tab, scope symbol per setting) | `components/settings/SettingsWindow.vue`, `SettingsRow.vue`, `Settings*Tab.vue`, `stores/settingsWindowStore.ts`, `constants/settings.ts` |
| Splitters between the columns | `components/layout/PaneSplitter.vue`, limits in `constants/layout.ts` |
| Every dialog and the toasts of the page | `components/layout/StudioDialogs.vue`, `components/common/ToastHost.vue` |
| Actions with toasts and error texts | `composables/useCategoryActions.ts` (move, rename, order), `useCreateActions.ts` (folders, helpers, flows), `useEntryActions.ts` (entry actions), `useAreaActions.ts` |

## Grid and splitters

- `.studio-view__panes` is a CSS grid `nav | splitter | list | splitter | detail`. The splitters have zero
  width and a wider, invisible grab area.
- The widths are CSS variables `--w-nav` and `--w-list` from `layout.paneWidths`. `min()` keeps at least
  380 px for the detail, whatever width the list was dragged to.
- `PaneSplitter` supports dragging, arrow keys (`SPLITTER_KEYBOARD_STEP` 16 px) and double-click to reset
  (`layout.resetPaneWidth`). `PANE_WIDTH_LIMITS`: nav 200–440, list 300–700 px.
- **Folding the detail:** the round button on the list splitter toggles `layout.isDetailFolded`. The list
  then takes the whole width and the button gets a 28 px rail of its own (`--fold-rail`). Opening an entry
  unfolds the detail again (`selectEntry` in StudioView).

## Responsive states

| Width | Navigation | Detail |
| --- | --- | --- |
| > 1180 px | column | column |
| ≤ 1180 px | drawer (`isNavOpen`, scrim closes it; the ☰ button in the list opens it) | column |
| ≤ 820 px | drawer | full-screen layer sliding in (`isDetailOpen`, "back" in the header closes it) |

`isNavOpen` and `isDetailOpen` only matter on narrow screens. CSS decides whether they have any effect.
Choosing a tree node always sets `isNavOpen = false`, and opening an entry always sets `isDetailOpen = true`.

## Data flow of the page

1. `onMounted`: `entriesStore.load()`, `foldersStore.load()`, `lookups.load()` (areas, labels),
   `ai.loadPlans()`.
2. Every new `entriesStore.entries` (after moves, renames or live updates) triggers a quiet reload of the
   cleanup proposals, check-up, dependencies, run history and entry areas (the `watch` at the end of
   StudioView).
3. Opening an automation or script loads its flow (`editorStore.loadFlow`). Other kinds clear it. The
   block catalog is loaded per UI language.
4. Live updates: see [../features/live-updates.md](../features/live-updates.md).

## Top bar and "What's new"

- `AppTopBar`: connection status (`loading` / `connected` / `failed` from `entriesStore`), live dot
  (`isLive`), entry count, the language menu (`LanguageMenu`, "DE ▾", the only quick setting) and the
  gear, which opens the settings window (see below).
- `WhatsNewMenu`: after an update, a gift with a dot next to the gear and a popover with the highlights.
  "Zeigen" leads to the feature (`utils/flash.ts` lets it light up), and only "OK" confirms.
  `constants/whatsNew.ts` holds the highlights per release in every language. `utils/whatsNew.ts` has the
  logic (unseen releases, test builds without a version show the newest). `stores/whatsNewStore` keeps
  the confirmed version (`PREFERENCES.seenVersion`, scope `user`). `utils/earlierVisit.ts` tells a fresh install from an
  earlier user. It is captured in `main.ts` before any store writes its defaults.

## Settings window

- The gear opens `SettingsWindow` (mounted in `StudioDialogs`). Tabs in `SETTINGS_TABS`
  (`constants/settings.ts`): Allgemein, Bearbeiten, Werkzeuge, KI-Zugang, Gut zu wissen, Über HomeAce;
  one component per tab. It opens on the tab used last (`PREFERENCES.settingsTab`, on this device).
- Every setting is a `SettingsRow` with the `preference` behind it. The row shows where it applies:
  person = follows the user to every device, screen = only on this device (`PREFERENCE_SCOPE`).
  Tools and links have no preference and no symbol. The AI access belongs to the whole add-on, so its
  tab says so in a note instead.
- **Settings per HA user** (`stores/preferencesStore.ts`): every `usePreference` of scope `user` is
  tracked. At start `load()` asks the backend who is there. With a HA user, the backend's values win;
  on the user's first visit through HA this browser's stored values are handed over (only values the
  browser really stored, so an unpicked default like the browser language is no choice). A change is
  sent after 400 ms (`PUT /api/preferences/:name`). Other open tabs pick it up on their next load.
  The browser always keeps a copy, so the app starts with the last values at once.
- Without a HA user (opened locally, in the demo) `settingsWindow.hasHaUser` is false: everything
  lives in this browser, every row shows the screen and the footer says "Ohne Anmeldung über Home
  Assistant …". With a user, the footer says "Gilt für <Name> auf allen Geräten" and explains both
  symbols.
- Tools ("Kategorien aufräumen", "Ordnung in einem Klick") and "Was ist neu" open their own windows;
  the settings window closes for them.
- **Gut zu wissen** (`SettingsGoodToKnowTab`): topics on the left (`GOOD_TO_KNOW_TOPICS`), text on the
  right (`settings.goodToKnow.<topic>.title` / `.text` / optional `.more`). Where it fits, the switch sits
  at the text. A `SettingsRow` with `moreTopic` gets a "Mehr dazu" link to its topic
  (`settingsWindow.showTopic`). **New feature with a quirk → new topic**, in all five languages; it
  says how HomeAce behaves, never how it is built. The first topic, "Was ist was" (`columns`), is the
  one exception to "quirks only": it names the columns with a drawn sketch (`SettingsColumnsSketch`,
  CSS on the tokens, so it follows light/dark and the language; no screenshot to keep up to date). The
  sketch reuses the app's own words (`areas.viewFolders`, `detail.tabs.*`, `save.save`); change the
  sketch when the top bar, the detail tabs or the save footer move. The window opens on this topic.
- **Über HomeAce** ends with the maker's signature "crafted with ♥ by shadowtsw" (link to the GitHub
  profile, `AUTHOR_URL`). The owner wanted a personal note; it is the same English words in every
  language, like a hand-written signature, so it has no locale keys.
- **Rules:** a setting only exists when users really want it differently. Texts describe what the
  user notices, never how it is built (technical detail only behind "Technische Details").
- Phone: for now the window fills the screen with the tabs on top; a list → page layout comes later.

## Keyboard

- `↑` / `↓` walk through the open list rows and open each entry (`EntryList`, not inside inputs or dialogs).
- `F2` renames the open entry, in its list row when that row is visible, otherwise in the detail title
  (StudioView).

## Rules

- Entries with unsaved flow edits make the browser ask before closing the tab (`beforeunload` in StudioView).
- Detail handlers run only while an entry is open. They are wrapped in `onSelected(...)`.
- Technical details (entity IDs, domains, API keys, the category name HA stores for a folder) are
  hidden unless `settings.isTechnicalDetailsVisible` is on. Pass the flag down; don't read the store in
  leaf components.
- Every popup closes in at least two ways by mouse or finger, plus Escape. Clicking outside alone is
  no real way when little free space is around it. Panels with a title line (entity menu `QuickMenu`,
  `ChipEditorPopover`, scene `SceneDevicePicker`, `WhatsNewMenu`) get the X `PopoverClose` at its right;
  pickers that change something get "Fertig" or "Abbrechen" instead (labels, icons). Small dropdowns
  ("Neu", "DE ▾", the filter menu) close again with their own button.
