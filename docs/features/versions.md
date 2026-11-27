# Versions ("Git light")

Earlier versions of automations, scripts and scenes: compare them with today, keep the good ones under a
name, bring one back, and get deleted entries back from the trash. HA has none of this (it overwrites on
every save and deletes for good), so HomeAce Studio keeps the versions itself. The endpoints are in
[../api.md](../api.md#versions-git-light-apiversions); the tab sits in the detail column ([../ui/detail.md](../ui/detail.md)).

## Model

- **One gzipped file per entry** in `<config>/versions/` (the add-on's own config folder, part of HA
  backups), not in the overlay. The key is HA's fixed storage id (automation and scene config `id`,
  script object id), found through the entity registry, so renaming the entity ID keeps the history.
  Model: `backend/src/versions/versions.model.ts`; rules: `version-history.ts` (pure functions, tested).
- **Sources** (`VERSION_SOURCE`): `base` (first seen), `homeace` (saved here, with the HA user),
  `outside` (HA reported a reload and the stored config differs), `offline` (changed while HomeAce was
  off, found by the compare on start; `since` = the last compare), `restore` (brought back; `fromTrash`
  when the whole entry came back). `ai` is reserved.
- **Open version:** saves in HomeAce within 10 minutes (`OPEN_VERSION_MS`) join one version; any other
  source closes it. For 15 s after an own save a reload never counts as outside.
- **Limits:** 20 versions without a name per entry (`MAX_UNNAMED_VERSIONS`), the oldest drops out; up
  to 10 named ones (`MAX_NAMED_VERSIONS`) that do not count against the 20. Names are plain text: control
  and direction characters are removed, at most 40 characters (`cleanVersionName`).
- **Renames:** entity IDs renamed in HomeAce Studio are logged (`EntityRename`, at most 500); bringing a
  version back replaces old IDs by their current ones and the answer lists them.
- **Never through the AI access (MCP).** Versions hold whole configs of the home.

## Taking the name away

A named version that becomes normal again drops out at once when 20 newer versions without a name exist
(`wouldDropWhenUnnamed`, same rule in `frontend/src/utils/versions/naming.ts`). The UI asks first
("Nicht mehr merken und löschen"); the backend refuses it without `confirmDrop: true`
(`409 VERSION_WOULD_DROP`), so a stale tab or a second device cannot delete it by accident.

## Trash ("Kürzlich gelöscht")

- Deleting in HomeAce Studio keeps the last config first (`prepareDelete`, then `markDeleted` with
  `where: "homeace"`). An entry deleted outside is noticed by the compare on start or after a reload, but
  only when HA really has no config any more (missing from the registry for a moment while HA starts does
  not count): `where: "outside"`.
- Kept 30 days (`TRASH_DAYS`) with all versions, then removed by the compare (`sweepTrash`).
- Bringing it back saves the last config with its old id, waits for HA to register it
  (`waitForEntityId`) and adds a `restore` version with `fromTrash`. HA may give it a new entity ID; the
  toast then names old and new, because references elsewhere still use the old one (to check on a real
  HA: whether HA keeps the old ID).
- Shown at the end of the check-up list (`components/checkup/CheckupTrash.vue`); with the battery
  overview it becomes a card of its own, as in the dummy.

## UI

| What | Where |
| --- | --- |
| Tab "Versionen": list, open version with "jetzt abschließen", filter "Nur gemerkte" | `components/versions/VersionsView.vue`, `VersionRow.vue` |
| Card "So funktionieren Versionen" on top; "Verstanden" folds it to one line (per device, `PREFERENCES.versionsGuideRead`); "Mehr dazu" opens the topic in "Gut zu wissen" | `VersionsGuide.vue` |
| Compare dialog, fixed size (owner rule); title "Version von heute 07:30", button "Version von … zurückholen …" | `VersionCompareDialog.vue` |
| Row "Links: ‹ … › Rechts: jetzt": three versions in time order (old left, new right), the window slides with the chosen one; phones show two | `VersionPicker.vue`, `quickVersions` in `utils/versions/naming.ts` |
| Head above both columns: the chosen version with its name control ("Merken", or the name with a pen), right "Jetzt"; in "Mit Vorgänger" the control sits right; the drop question across the whole width | `VersionCompareHead.vue`, `VersionNameControl.vue` |
| Rows side by side or "Nur Änderungen"; sections in their flow colours (`--flow-when/-if/-then`) | `VersionCompareRows.vue`, lines from `composables/versions/useVersionLines.ts` and `utils/versions/compareLines.ts` |
| Note under a save: which version it went into, minutes left | `VersionSaveNote.vue` |

Rules from the owner that shaped it:

- **Older left, "Jetzt" right**, never swapped; the picker and arrows follow the same time direction.
- **One word:** everything kept is a "Version"; "Stand" only for what is in HA now ("der jetzige Stand").
- **"Merken" sits at the version it is about**, not in the footer.
- **The dialog never changes size** when switching views, naming or asking.

## Tests

`backend/src/versions/*.spec.ts` (history rules, service with fake HA, trash, file repository),
`frontend/src/utils/versions/__tests__/` (compare lines, naming and picker window).

## To check on a real HA

Reload events for scenes too; the config comes back unchanged (no phantom changes); a restored or
re-created entry keeps its entity ID.
