# Labels

Labels are HA's own label registry (`config/label_registry/*`). They apply to all of HA: entities,
devices and areas can carry them, and flows can target them (`target: { label_id: … }`, since HA 2024.4).
HomeAce Studio shows and assigns them on entries and manages the registry itself (create, rename, colour,
icon, delete). The UI sides are in [../ui/detail.md](../ui/detail.md) (properties) and
[../ui/list.md](../ui/list.md) (bulk bar, list chips).

## Model

- A label has `label_id`, `name`, `icon` (`mdi:…` or null) and `color` (an HA colour name such as
  `indigo`, a hex value, or null). **Renaming keeps the `label_id`**, so assignments and flow targets stay.
- HA refuses a second label with the same name, ignoring case. The backend checks this first
  (`requireFreeName` → 409 `LABEL_NAME_TAKEN`), the edit form checks it while typing.
- **Deleting a label removes it everywhere** in HA, also from devices and areas HomeAce Studio does not
  show. A flow that targets it keeps running but switches nothing through that target any more, and HA
  says nothing. That is why deleting first asks `GET /api/labels/:id/usage` and names every use.

## Where what lives

| What | Where |
| --- | --- |
| API (create, update, delete, usage) | `backend/src/labels/labels.controller.ts`, `labels.service.ts` |
| Who uses a label (entries, entities, devices, areas, flows as target) | `backend/src/labels/label-usage.ts` |
| Limits (name length, icon and colour patterns) | `backend/src/labels/labels.constants.ts` |
| HA colour names → CSS, free colour for a new label | `frontend/src/utils/labelColors.ts` |
| Calls | `frontend/src/services/labelsService.ts` |
| Busy state, delete in two steps, reload | `frontend/src/stores/labelsStore.ts` |
| Toasts, counts per label, ticking on many entries | `frontend/src/composables/useLabelActions.ts` |
| Picker (search, ticks, create, pencil) | `frontend/src/components/labels/LabelPicker.vue` |
| Edit form inside the picker | `frontend/src/components/labels/LabelEditForm.vue` |
| Delete dialog with the uses | `frontend/src/components/labels/LabelDeleteDialog.vue` |
| Chip | `frontend/src/components/labels/LabelChip.vue` |
| Placement that never covers the field | `frontend/src/composables/useNoCoverPlacement.ts` |

## Two kinds of action

- **Assigning on one entry** belongs to the properties form: ticking changes the draft, "Speichern" of
  the form sends it with the other fields (`PATCH /api/entries/:id`).
- **Everything about the label itself** (create, rename, colour, icon, delete) acts at once in HA. A new
  label from the picker is ticked right away (in the form: in the draft).
- **Bulk bar ("Label"):** a tick acts at once on all ticked entries. When all of them carry the label, it
  is removed from all; otherwise it is added to those without it (`toggleOnEntries`). The picker shows
  "on all" as a tick, "on some" as a dash.

## Picker placement

The picker is `position: fixed` and must never cover the chips it belongs to (owner's feedback on dummy
v33). `useNoCoverPlacement(field, panel)`:

1. First placement: below the field; else above; else the field's scroll container scrolls it up and the
   picker opens below (shorter if need be).
2. After each tick (chips may wrap into a new row) it checks again. Still clear: it stays still (no
   jumping). Grown into: it stays on its side and gets shorter, down to 200 px, before it flips.
3. It closes on Escape, a click outside (the field itself does not count), a window resize and a scroll
   by the user. Its own scroll from step 1 is ignored (`isOwnScroll`).

## Usage check

`labelUsage(labelId, …)` counts entries (HomeAce's list), entities of the entity registry, devices and
areas with the label, and walks every automation and script config recursively for `label_id`, as a
string or in a list (`namesLabel`). Flows found there are listed by name in the delete dialog.

## Labels in the list

The setting "Labels in der Liste zeigen" (`PREFERENCES.listLabels`, per user) shows small chips under
each name. **Off by default:** the list showed no labels before, so an update changes nothing until the
user turns it on, and a busy HA does not turn the list colourful.

## Pitfalls

- HA's `label_registry/update` takes only the fields that change; `icon: null` and `color: null` clear.
- After every change the store reloads the lookups and the entries, because HA sends
  `label_registry_updated` without the new data.
- The demo (`fake-ha.ts`) supports create, update and delete; the script "Everything off" targets the
  label "lights", so the delete dialog has a flow to warn about.
