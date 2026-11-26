# Changelog

## Unreleased

- Folders for devices: the new filter "Entitäten" shows lights, sensors and every other plain entity,
  each in its folder after the automations and helpers there. Drag one onto a folder to sort it in, or
  onto "Ohne Kategorie" to take it out. The folders are stored in Home Assistant and its backups,
  without crowding HA's own label and category lists.
- Drag entities into flows: drop a motion sensor on "Wenn" and pick "Bewegung erkannt", a lamp on
  "Dann" and pick HA's "Einschalten". Fitting sections light up, the others say why not (a sensor
  cannot be switched). Branches of a Wenn/Sonst block are targets of their own; dropped next to them,
  HomeAce Studio asks where exactly. A measured value starts with its current value as the limit.
  Dropped on a scene, a device joins with its current state. On a phone, tap the entity instead.
  Helpers, scripts, scenes and automations from the list can be dragged in the same way ("Gästemodus
  ist aus", "Szene aktivieren"); an automation or script never into itself. A script either runs and
  the automation waits for it ("Ausführen"), or starts while the automation goes on ("Starten, ohne zu
  warten", HA's "Einschalten", which now has a short explanation in the flow).
- Filters can be combined: Strg+Klick (⌘+Klick on a Mac), right-click or a long press on a filter
  adds it, a plain click shows only that one. The choice is kept, and the filter bar wraps instead of
  scrolling.
- Labels: the properties show an entry's labels as chips, "+ Label" opens a search to tick, create or
  edit labels (name, colour, icon). Several ticked entries get or lose a label in one go with "Label"
  in the selection bar. Before a label is deleted, HomeAce Studio shows where it is used, including
  automations and scripts that switch everything with that label. New setting "Labels in der Liste
  zeigen" (off by default).
- Icons from icon packs: icons of packs like custom-brand-icons now show in the list, the details and
  on labels and areas. "Auswählen …" next to the icon of an entry or label opens a search over HA's
  standard icons and your packs. It also works when HomeAce Studio is opened before any dashboard.
- Ready for Home Assistant 2026.12, which splits plugs with several outlets into one device per
  outlet: each outlet stays in the room of its plug and is named with it ("Eve Energy Top").
- Automations and scripts that switch a whole floor or everything with a label show it ("Etage
  Erdgeschoss", "Label Nachtlicht") instead of asking for a device, and what such a block leaves out
  shows as "ohne Küche".
- Settings window: the gear opens a larger window with tabs (Allgemein, Bearbeiten, Werkzeuge,
  KI-Zugang, Gut zu wissen, Über HomeAce) instead of the short menu. The language sits right next to
  the gear ("DE ▾"). Every setting shows whether it applies to you on every device or only on this
  one.
- Your settings follow you: opened from Home Assistant's sidebar, HomeAce Studio knows which HA user
  you are. What you set on purpose (language, technical details, auto-save, kept runs) follows you to
  every device; what it remembers on its own (column widths, chosen filters) stays on the device. The
  first time, the values of this browser are taken over. Every HA user keeps their own view.
- "Gut zu wissen" in the settings: short answers on how HomeAce Studio behaves, e.g. why editing a
  scene switches nothing or what happens when a folder is renamed in Home Assistant. The first topic,
  "Was ist was", names the three columns (Navigation, Liste, Details), so everyone uses the same words
  when helping each other.
- "Durchläufe merken" (tab "Bearbeiten"): how many runs Home Assistant keeps for new automations and
  scripts (5, 10, 20 or 50). More runs help when you look for an error.
- The Home Assistant name of a folder only shows with "Technische Details" switched on.

- What's new: after an update, a gift next to the gear shows the highlights of the new version in
  plain words. "Zeigen" leads to the feature, "OK" puts the gift away; "Über HomeAce" in the
  settings keeps "Was ist neu" for later. Skipped updates show too; a fresh install starts without it.
- Helper settings: storage helpers (toggle, button, number, text, dropdown, date/time, counter, timer)
  have a tab "Einstellungen" for their ranges, steps, options, lengths and durations. A setting that
  Home Assistant would refuse is marked in red before saving. Fields HomeAce Studio does not show stay
  as they are. Template and group helpers follow later.
- Duplicate helpers like automations and scripts: the copy icon next to the pencil keeps settings,
  folder, labels and area; the value starts fresh.
- Clicking through the list keeps the tab you picked in the details (e.g. "Verlauf"), so entries
  are easy to compare. An entry without that tab opens on its first one.
- Scene editor: edit scenes without your lights changing. Each device gets its controls (on/off,
  brightness that runs up to the light's colour, white tones and colours as the light can do them,
  cover position, thermostat). Nothing switches while editing; "Vorschau" shows the whole scene and
  "Ausprobieren" one device, and both go back to how it was afterwards. "Aktuellen Zustand
  übernehmen" reads a device without switching it. What the editor has no control for (an effect, a
  fan speed) stays as it is and is named. Scenes outside scenes.yaml are shown read-only.
- "In HA speichern" moved to a footer at the bottom of the details, always in view, for flows,
  helper settings and scenes. The header and tabs of the details no longer scroll away.
- "Szenen automatisch speichern" in the settings, tab "Bearbeiten" (off by default): scenes save shortly after the
  last change. The footer shows "Speichert gleich von selbst …" and then "Automatisch gespeichert",
  with "Alles rückgängig" back to how the scene was when you opened it.
- Unsaved helper settings and scene edits are no longer lost when you open another tab or entry. Like
  automations and scripts, they show a dot in the list, and the browser asks before closing the tab.
- The fold button of the details no longer covers the list's scrollbar; folded, it has a slim rail of
  its own at the right edge.
- Check-up: an automation counts as "Lange nicht gelaufen" after 30 days without a run instead of 90.
  A new automation gets these 30 days from when it was created, and a new helper gets a week before
  "Wird nirgends benutzt", so neither shows up right after creating it.
- Helpers and scripts you just created can be dragged into a flow right away, without reloading.
- "Neu" → "Szene" creates an empty scene in the chosen folder and opens it in the scene editor; add
  devices by dragging them in or with "Gerät hinzufügen".

## 0.13.0

- Five languages: German and English as before, now also Russian, French and Spanish. The Russian
  translation comes from the community (thanks, pcmaster4u!); French and Spanish are machine-assisted,
  so native speakers are very welcome to improve them.
- Without a choice in the settings, HomeAce Studio now starts in the browser language if it has it,
  else in German. A language picked under the gear stays as before.

## 0.12.1

- Fixed: opening an entry made HomeAce Studio load the whole entity registry and every state from
  Home Assistant, which cost noticeable CPU in both. It now asks for that one entry only: clicking
  through all entries takes about a seventh of the CPU time and much less memory.

## 0.12.0

- The details pane folds away with the round button in the middle of the column splitter, for a
  wider list; opening an entry brings it back.
- Rename in place: double click the name in the list or the title, the pencil on hover, or F2.
  The toast offers "Rückgängig".
- Double click a folder or area name in the tree to rename it in place, also with "Rückgängig".
- Duplicate an automation or script from the icon next to the pencil, in the list row or the title: the copy keeps
  folder, labels and area (HA's own duplicate does not) and opens with its name ready to change. An
  automation copy starts switched off so nothing runs twice.
- "Aktion hinzufügen" and other long menus are wider, in two columns, with one scroll area; entries
  with the same name say which kind they are for ("Einschalten · Licht"). Popovers stay inside the
  window.
- Popovers (device picker, value editors) and dialogs keep their search field and their buttons in
  view; only the list in between scrolls.
- "Neuer Ordner" moved from the list head into the "Neu" menu; the list head is calmer.
- Arrow keys up and down walk through the list and open the entry.
- After "Später" the tidy-up hint stays as a single line instead of disappearing.
- Sort folders by dragging them between their siblings. The order is only in HomeAce Studio (HA keeps
  categories alphabetical); the A–Z icon next to "Kategorien" brings the default back.
- Fixed: the toast after disabling an entry showed a raw text key. A test now checks that every
  text the app uses exists in German and English.
- Properties: new section "Sichtbarkeit & Sprache" with enabled, hidden and aliases for Assist.
  Disabling asks first and names the automations and scripts that still use the entry; a disabled
  entry says so in its header and can be enabled again from there.
- Change an entity ID: "Ändern …" next to it in the properties, or "Angleichen …" when it no
  longer fits the name. Before renaming you see every automation, script and scene that uses it;
  HomeAce Studio rewrites the automations and scripts with it (only the whole ID, never a script
  call by its key). Favorite and note move along.

## 0.11.0

- Dependencies: every automation, script, scene and helper has a tab "Abhängigkeiten". It shows what
  the entry uses, grouped by what it does with it (triggers on, checks, controls, reads values,
  starts), with device names, areas and the current state; "+2 more" shows who else uses a device.
  And it shows who uses the entry itself, e.g. which automations read a helper.
- Deleting a helper or script that is still used names the flows that would then point into the void.
- Helpers and scenes now have tabs too (properties, dependencies).
- Area view: a switch above the tree shows areas instead of folders. Entries without an area of
  their own count in the areas of the devices they use, helpers in those of the flows that use
  them; every row says why ("über Bewegungsmelder Terrasse · auch in Garten"). Nothing to set up.
- Run history: automations and scripts have a tab "Verlauf" with the runs Home Assistant kept, by
  day: finished, condition not met, stopped by an error, running, interrupted (restarted), ignored
  (was already running). The selected run goes block by block: what triggered it, what each
  condition found ("war ‚an‘, verlangt: aus"), which branch an if took, how long it waited, and
  errors in plain words.
- "Im Ablauf zeigen" puts a run on the flow: every block shows what it did in it.
- "Die letzten 20 merken" lets Home Assistant keep 20 runs instead of 5 (writes `trace: stored_traces`).
- Check-up: "Zuletzt mit Fehler" lists automations and scripts whose last run stopped with an error.
- Create areas right here: "+" next to "Bereiche", "+ Neuer Bereich …" in an entry's properties, or
  from "Bereich" for ticked entries. Name and icon (guessed from the name, e.g. Schlafzimmer → bed).
  Edit and delete them in the area tree. Drag entries onto an area to give them their own area;
  dropping on "Ohne Bereich" takes it away. Empty areas show too, so you can drop onto them.
- Unsaved changes in an entry's properties no longer get lost when something changes in HA meanwhile.
- "Ordnung in einem Klick": sorts entries into folders by area, after a preview. Existing folders
  named like the area are used, missing ones created; entries in several areas get a choice;
  every row can be unticked.

## 0.10.0

- Check-up ("Durchsicht"): shows what needs a look, without any setup. Automations and scripts
  that use devices which no longer exist (shown in red in the flow) or are unavailable, helpers no
  automation or script uses, and automations idle for more than 90 days. Every finding can be
  ignored; the entry shows the finding with what to do about it.
- New device picker in the flow editor: pick by area, then device, then its function ("Front door
  sensor → Battery"), or search with words in any order. Filter by area, label or kind; suggestions
  from the flow and the automation's area; every row shows the current state. "All lights · Living
  room" targets the whole area, including lights added later.
- Local test environment outside Home Assistant: `node scripts/local.mjs` or `docker compose`.

## 0.9.1

- The settings (gear icon) show the app version.
- Move several entries at once: tick them (Shift ticks a range), then "Move to …" or "Take out of
  folder" in the bar above the list, or drag one of the ticked rows onto a folder.
- "New subfolder" button right below the folder title ("New folder" in the overview); after creating
  it, the new folder opens and the tree unfolds down to it.
- The tree opens down to the selected folder however it was selected.
- Folder actions in the tree are easier to see and always shown on the selected folder.
- An empty folder explains how to fill it.
- The tree keeps all folders when you switch between All, Automations, Scripts, Scenes and Helpers;
  folders without entries of that kind are shown dimmed instead of disappearing.

## 0.9.0

- First public release: install it from the app repository; HA downloads a ready-made image for
  amd64 or aarch64 instead of building it.
- AI access (MCP): an AI like Claude can read folders and entries and propose a folder plan. You
  review it in HomeAce Studio, untick what you do not want and apply the rest; the AI cannot change
  anything itself. Off by default: needs a host port in the app's network settings, the switch in
  Settings → AI access, and a token.
- Fixed: live updates stopped after the first change in Home Assistant.
- The tidy-up assistant no longer proposes empty categories.

## 0.8.0

- Tidy-up assistant: old categories that fake subfolders with dashes ("Office - Heating") become
  real subfolders, and near-duplicates ("Routine" / "Routines") are merged. Every line is your
  choice, with a preview of each change in Home Assistant. Open it from the hint in the tree or
  from the settings.
- The scope tabs above the list no longer show a scrollbar.

## 0.7.2

- Fixed: a strip at the bottom of the window where the columns ended too early.
- Fixed: short labels inside a value (e.g. "Message") no longer break in the middle of the word.
- Opening a value editor no longer shifts the columns.

## 0.7.1

- Subfolders without a color of their own take the color of their nearest colored parent folder.

## 0.7.0

- "Neu" in the list now creates automations and scripts as well as helpers: give a name and a
  folder, and the new, empty flow opens right away for filling in.
- Delete automations and scripts (those kept in automations.yaml / scripts.yaml).

## 0.6.0

- Add triggers, conditions and actions with "+ Auslöser", "+ Bedingung" and "+ Aktion", also inside
  if/then/else, choose, repeat and groups. The picker offers the common blocks first, then every type
  Home Assistant describes, with search.
- Block menu (⋮): move up or down, duplicate, disable (kept in the config) or enable, delete.
- Values a block still needs are shown in orange until they are set.

## 0.5.1

- Folder groups in the list can be collapsed and expanded. Subfolders start collapsed; the folder's own
  entries, the open entry and search results stay visible. Each group shows how many entries it holds.

## 0.5.0

- Edit automations and scripts in the tab "Ablauf": tap a value (entity, state, number, duration,
  time, choice, template) to change it, add optional fields with "+ Option", remove them again.
- Choose how a running flow reacts when it starts again (ignore, restart, queue, parallel).
- Edits stay unsaved until "In HA speichern"; the list marks entries with unsaved edits. Fields
  HomeAce Studio does not know are saved back unchanged.
- Flows outside automations.yaml / scripts.yaml (packages, blueprints) are shown read-only.

## 0.4.0

- New tab "Ablauf" for automations and scripts: triggers, conditions and actions as readable blocks with
  names from Home Assistant (German and English). Read-only for now; editing follows.

## 0.3.0

- Edit name, icon, area and labels of an entry (saved in Home Assistant).
- Switch automations and toggles on or off; run automations, scripts and scenes; press buttons.
- Delete helpers (toggle, button, number, text, dropdown, date/time, counter, timer).
- Favorites, own notes and folder colors (kept in HomeAce Studio only).
- Live updates: changes in Home Assistant show up on their own.

## 0.2.0

- Create empty folders in the tree, also as subfolders; delete empty ones.
- Create helpers with a form per type, sorted into a folder right away.

## 0.1.0

- First version: automations, scripts, scenes and helpers in one list with nested categories
  (`Haus/Terrasse`), move entries by drag and drop, rename folders with a preview.
