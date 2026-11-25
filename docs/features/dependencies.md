# Dependencies

The "Abhängigkeiten" tab of every entry: what it **uses** (grouped by role) and who **uses it**. The same
index feeds the derived [areas](areas.md), the rename references and the disable / delete dialogs.

## Index

`buildDependencyIndex` (`backend/src/dependencies/dependency-analysis.ts`, pure) maps every user
(automation, script, scene, group) to the entities it names, with roles:

| Role | Meaning |
| --- | --- |
| `trigger` | a trigger listens to it |
| `condition` | a condition (or a wait, or the `if` of an action) checks it |
| `action` | an action switches or sets it |
| `member` | a scene or group contains it |
| `value` | a template reads its value |
| `call` | an action starts it (script, scene, automation) |

- `collectRoleRefs` walks a flow config with the context trigger / condition / action. Inside actions,
  `CONDITION_KEYS` (`if`, `conditions`, `condition`, `while`, `until`, `wait_for_trigger`) switch to
  condition.
- Inside templates, only IDs of entities that exist count (`isKnown`), so a word like `states.sensor` is
  not taken for one.
- Scripts called by their key (`script.<key>`, which stays when the entity ID is renamed) are mapped to
  their entity ID.
- No HA API for this: `search/related` would need one call per entry and knows no roles.

## Where what lives

| What | File |
| --- | --- |
| Index, `GET /api/dependencies/:entityId` | `backend/src/dependencies/dependency-analysis.ts`, `dependencies.service.ts`, `dependencies.controller.ts` |
| Tab: uses by role with device names and live state, "+2 weitere", used by | `frontend/src/components/dependencies/DependencyView.vue`, `DependencyUseRow.vue`, `DependencyUserRow.vue` (also in the delete dialog) |
| Store (loads with the open entry, refreshes after live changes) | `frontend/src/stores/dependenciesStore.ts`, `services/dependenciesService.ts` |

## Rules

- The detail header badge counts uses + users of the open entry.
- If the check-up banner already names gone or unavailable entities, the tab leaves out its summary line
  (`hasFindingBanner`).
- A use that no longer exists says where to fix it, after the kind of the open entry (`goneHintKey`):
  a scene under "Zustände", automations and scripts in the flow.
- Entity-ID matching is on whole IDs (`ENTITY_ID` regex). Keep it in step with
  `checkup-analysis.ts` `collectEntityRefs` and `rename/entity-id.ts`.
