# Areas

HA areas (rooms) as a second view of the [navigation](../ui/navigation.md), next to the folders. An entry
shows up in an area even without its own area: HomeAce Studio derives one from what it uses.

## Where an entry's areas come from

`deriveEntryAreas` (`backend/src/areas/entry-areas.ts`, pure) gives every entry a list of
`{ areaId, name, source, via }`:

| `source` | Rule |
| --- | --- |
| `own` | the entity registry has an area for the entry itself |
| `uses` | otherwise: areas of the devices and entities its flow, scene or group uses |
| `usedBy` | otherwise: areas of the automations and scripts that use it (one step, not further; mostly helpers) |

The input is the [dependency index](dependencies.md) plus devices and areas from `HomeSnapshotService`.
An entity's area is its own, else its device's, else, for a child device (HA 2026.9+, e.g. one outlet
of a power strip, `parent_device_id`), the parent's. Device names of children get the parent's name
in front ("Power strip Outlet 1"), because HA names them on their own ("Outlet 1"). Both come from
`createDeviceContext` (`backend/src/ha/device-context.ts`), which the entity picker uses too.
`GET /api/entry-areas` returns the list for all entries. In the frontend, `entryAreasStore.linksOf(entityId)`
serves it to the filter (`areaIdsOf`), the area nav counts and the row notes (`utils/areas/areaNotes.ts`:
"über Bewegungsmelder · auch in Garten").

## Where what lives

| What | File |
| --- | --- |
| Derivation, service, `GET /api/entry-areas` | `backend/src/areas/entry-areas.ts`, `entry-areas.service.ts`, `entry-areas.controller.ts` |
| Create / rename / delete areas (`POST/PATCH/DELETE /api/areas`), names unique ignoring case | `backend/src/areas/areas.service.ts`, `areas.controller.ts` |
| Area nav, nodes | `frontend/src/components/areas/AreaNav.vue`, `AreaNavNode.vue` |
| New / edit area (name + icon guessed from the name) | `components/areas/AreaDialog.vue`, `utils/areas/areaIcons.ts` (`guessAreaIcon`) |
| Set the own area of ticked rows | `components/areas/SetAreaDialog.vue` |
| "Ordnung in einem Klick": folders from areas | `components/areas/AreaTidyDialog.vue`, `utils/areas/areaTidy.ts` (`tidyCandidates`, `planAreaTidy`, `folderForArea`) |
| Which area dialog is open (the properties form opens it too) | `stores/areasStore.ts` |
| Saving with toasts, inline rename with undo | `composables/actions/useAreaActions.ts` |
| Derived areas per entry | `stores/entryAreasStore.ts`, `services/entryAreasService.ts` |

## Behavior

- Dropping a row on an area, or "Bereich" for ticked rows, sets the **own** area (`setOwnArea`).
  Dropping on "Ohne Bereich" removes the own area. Derived areas stay, so the entry may still show in an
  area.
- Deleting an area: HA takes it away from its devices and entities, and they stay.
- **Tidy-up:** entries without a folder that have an area (`tidyCandidates`) can be moved into folders
  named after their areas (`folderForArea` reuses an existing folder with that name). After applying, the
  nav switches to folders and selects the new folder (`onTidied` in StudioView).
- `entryAreasStore` reloads after every entries change and after area actions.

## Rules

- Area names are compared ignoring case **before** HA is called (HA would refuse anyway, but with a worse
  error).
- The derivation goes one step for `usedBy`. Don't make it transitive, because helpers would end up in
  every room.
