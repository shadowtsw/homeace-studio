# Scenes

The "Zustände" tab of scenes. It edits what a scene sets per device **without switching anything**. The
values go straight into `scenes.yaml` through HA's config API. HA's own editor switches the devices
("photographs" them) instead. "Vorschau" and per-device "Ausprobieren" switch on purpose and restore
afterwards.

## Where what lives

| What | File |
| --- | --- |
| Tab: device rows, add device, preview, try, take current state, save footer (teleported) | `frontend/src/components/scenes/SceneEditorView.vue` |
| Controls of one device (on/off, brightness, white tone, color, position, temperature, …) | `frontend/src/components/scenes/SceneDeviceRow.vue` |
| HA attributes ↔ controls, light capabilities, presets, "extras" the editor cannot show | `frontend/src/utils/sceneValues.ts` (`readControls`, `writeControls`, `lightCaps`, `extrasOf`) |
| API calls, `sendBeacon` restore | `frontend/src/services/scenesService.ts` |
| Endpoints `/api/scenes` | `backend/src/scenes/scenes.controller.ts` |
| Read, save, preview, restore | `backend/src/scenes/scenes.service.ts` |
| HA access (storage id, REST config, `scene.apply`) | `backend/src/scenes/repositories/ha-scene.repository.ts` |

## Flow

```text
GET /api/scenes/:entityId
  scenes.yaml has it → isEditable, devices with `values` (what the scene sets) and `current` (live state)
  otherwise (package, …) → read-only, members from the state attribute `entity_id`
edit → local draft (nothing switches)
Vorschau      → POST :id/preview { entities }   (backend keeps the devices' states first, then scene.apply)
Ausprobieren  → POST :id/preview { one device }
back / leave  → POST :id/restore { deviceIds? }  (applies the kept states, forgets them)
In HA speichern → PUT :id { entities } → REST /api/config/scene/config/<id>
```

- **Snapshot in memory:** `ScenesService.snapshots` holds per scene what each previewed device did before.
  Only the first touch of a device is kept, and later live edits only apply. No snapshot scene is created
  in HA.
- **Live edits during a preview** wait 250 ms (`PREVIEW_DELAY_MS`), so a dragged slider does not flood HA.
- **Leaving restores:** changing the entry, unmounting the tab, and `pagehide` (via `navigator.sendBeacon`,
  because a normal request would be cancelled).
- **Saving** keeps name, icon and every other config key. Devices that left the scene lose their
  `metadata`, and new ones get `{ entity_only: true }` like HA does it.
- `scenes.yaml` allows a plain state (`light.x: "on"`), and `entitiesOf` turns it into `{ state }`.

## Rules

- A new color or white tone removes **all** old color attributes of a light (`sceneValues.ts`).
  Otherwise HA would get conflicting `hs_color` / `color_temp_kelvin` / `rgb_color`.
- Attributes without a control stay in the value unchanged and are listed as extras. "Aktuellen Zustand
  übernehmen" takes everything the device has right now.
- Devices offered for adding: `light`, `switch`, `cover`, `climate`, `fan`, `media_player`
  (`SCENE_DOMAINS`). Others may already be in a scene and stay as they are.
- Edits are local to the tab: opening another entry discards them (no per-entry draft as for flows).

## Recipe: support a new device kind

1. Controls in `SceneControls`, `readControls` / `writeControls` and the shown attributes in
   `sceneValues.ts`, plus tests in `utils/__tests__/sceneValues.spec.ts`.
2. The row UI in `SceneDeviceRow.vue` and texts under `scene.*` in all five locales.
3. Add the domain to `SCENE_DOMAINS` and, if it switches on/off, to the on/off list in `sceneValues.ts`.
4. The demo's `scene.apply` (`backend/src/demo/fake-ha.ts`) applies state and attributes generically.
   Check that the demo home has such a device.
