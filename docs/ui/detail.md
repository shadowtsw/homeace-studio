# Detail column

The right column. It shows the entry opened in the [list](list.md): a fixed header, an optional check-up
banner, tabs, and a fixed save footer. Only the middle scrolls.

## Where what lives

| What | File |
| --- | --- |
| Column frame, tabs, which tab shows what, save footer slot | `components/entries/EntryDetail.vue` |
| Header: kind, title (inline rename), rename / duplicate buttons, on/off or "Aktivieren", run, favorite, delete, back (phone) | `components/entries/EntryDetailHeader.vue` |
| Start tab of a newly opened entry | `utils/detailTab.ts` (`startTab`) |
| Check-up banner above the tabs | `components/checkup/CheckupBanner.vue` |
| Save footer ("Ungespeicherte Änderungen · Verwerfen · In HA speichern", or the status line of automatic saving) | `components/common/SaveFooter.vue` |
| Unsaved helper settings and scene edits per entry | `stores/draftsStore.ts` |

## Tabs per kind

| Kind | Tabs (first one is the default) | Tab content |
| --- | --- | --- |
| automation, script | Ablauf · Eigenschaften · Verlauf · Abhängigkeiten | `FlowView` ([flow-editor](../features/flow-editor.md)), properties, `RunHistoryView` ([run-history](../features/run-history.md)), `DependencyView` ([dependencies](../features/dependencies.md)) |
| helper | Einstellungen · Eigenschaften · Abhängigkeiten | `HelperSettingsView` ([helpers](../features/helpers.md)) |
| scene | Zustände · Eigenschaften · Abhängigkeiten | `SceneEditorView` ([scenes](../features/scenes.md)) |

The tab the user picked last (`pickedTab`) stays when the next entry has it too, so clicking through the
list compares the same tab. Otherwise the entry starts on its first tab. The dependencies tab shows a
badge with uses + users.

## Properties tab ("Eigenschaften")

Top to bottom:

1. `CategoryMoveField`: folder with suggestions from every scope.
2. `EntryEditForm`: name, icon, area (with "+ Neuer Bereich …"), labels. It sends only the changed
   fields (`EntryChanges`) → `PATCH /api/entries/:id`.
3. `EntityIdField`: entity ID with "Ändern …" and a suggestion when it no longer fits the name, see
   [entry-actions](../features/entry-actions.md).
4. `EntryVisibilityForm`: enabled, hidden, aliases. Saved right away. Disabling asks first
   (`askDisable`, the dialog lists who still uses the entry).
5. `NoteField`: own note (overlay).
6. Status rows: state, enabled, hidden, plus entity ID and domain with technical details on.

Entries outside the registry (YAML without `unique_id`) only get a hint, the note and the status.

## Save footer

The footer `<div id="entry-detail-footer">` always exists while an entry is open.

- **Flows:** `EntryDetail` renders the `SaveFooter` itself (`hasUnsavedChanges`, note when HA changed
  meanwhile).
- **Helper settings and scenes:** the tab teleports its own `SaveFooter` in
  (`<Teleport defer to="#entry-detail-footer">`). `blockedBy` disables saving while the form has a problem.
- **Scenes with "Szenen automatisch speichern"** (gear menu, off by default): the footer becomes a status
  line (`autoStatus`: "Speichert gleich von selbst …" → "✓ Automatisch gespeichert · 14:25") with
  "Alles rückgängig". It stays up between saves, so it slides in only once. No toast per save.

## Data per open entry

| Data | Loaded by |
| --- | --- |
| Flow (automation, script) | StudioView watch → `editorStore.loadFlow` |
| Dependencies | `EntryDetail` watch → `dependenciesStore.load` |
| Run history | `RunHistoryView` → `tracesStore.load`. The run shown on the flow is reset when the entry changes |
| Scene / helper settings | their tab components on mount and on entity change; a kept draft from `draftsStore` comes back on top |

Every store drops answers that arrive for an entry that is no longer open.

## Pitfalls

- **Unsaved edits are kept per entry:** flows in `editorStore`, helper settings and scenes in
  `draftsStore`. The tabs are unmounted on switching (`v-else-if`), so their components write every edit
  into the store (deep `watch`) and take a kept draft back when they load. StudioView merges both
  `unsavedIds` for the dot in the list and the `beforeunload` prompt. A new editor tab needs the same,
  or its edits are lost silently. A scene preview is restored on leaving.
- Form components take over a new `entry` object from live updates only while the user is not editing
  (`EntryEditForm` compares with the entry it was filled from). New forms should follow the same pattern.
- A new tab needs: a key in `TAB`, the `tabs` list per kind, a `detail.tabs.<key>` text in every locale,
  and a body `v-else-if`.
