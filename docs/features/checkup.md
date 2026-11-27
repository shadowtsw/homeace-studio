# Check-up

"What needs a look", without any setup. It is the special node "Check-up" in the navigation (the list
column shows `CheckupList`), plus a banner above the tabs of an affected entry.

## Findings

`analyzeCheckup` (`backend/src/checkup/checkup-analysis.ts`, pure). Kinds in display order:

| Kind | Meaning |
| --- | --- |
| `gone` | a flow names an entity HA no longer has (its chips show in red, `markGoneChips`) |
| `unavailable` | a flow names an entity that is unavailable right now |
| `failed` | the newest run of an automation or script ended with an error |
| `unused` | a storage helper (or `schedule`) no automation or script uses (`CHECKED_HELPER_DOMAINS`), created at least `UNUSED_GRACE_DAYS` (7) days ago |
| `stale` | an automation that has not run for `STALE_AFTER_DAYS` (30) days; one that never ran counts from its creation |

The creation time is the entity registry's `created_at` (`createdTimes`), which HA has since 2024.7.
Entities older than that carry the time of HA's update or 0; without it, an entry counts as old and
gets no grace.

`collectEntityRefs` finds plain entity IDs in `entity_id` fields (also targets and lists) and directly
called scripts (`action: script.x`). Values with templates or `!input` are skipped. Template and group
helpers are left out of `unused`, because they often only feed dashboards, which HomeAce Studio cannot
see.

## Where what lives

| What | File |
| --- | --- |
| Analysis | `backend/src/checkup/checkup-analysis.ts` |
| Findings per snapshot, ignore list | `backend/src/checkup/checkup.service.ts`, `checkup.controller.ts` (`GET /api/checkup`, `POST/DELETE /api/checkup/ignore`) |
| Shared data (entries, states, registry, every flow config, newest run per flow; 20 s cache, cleared by live changes) | `backend/src/snapshot/home-snapshot.service.ts` |
| List view (grouped by kind, ignore, restore hidden) | `frontend/src/components/checkup/CheckupList.vue` |
| Banner in the detail (to the flow, to the history, turn off, delete, ignore) | `frontend/src/components/checkup/CheckupBanner.vue` |
| Store (`findings`, `findingsFor(entityId)`) | `frontend/src/stores/checkupStore.ts`, `services/checkupService.ts` |

## Recently deleted

At the end of the list, "Kürzlich gelöscht" shows deleted automations, scripts and scenes for 30 days, with
when and where they were deleted, how many versions they keep and the days left (warning colour from 7
days). "Wiederherstellen" creates the entry in HA again and opens it (`components/checkup/CheckupTrash.vue`;
model and caveats in [versions.md](versions.md#trash-kürzlich-gelöscht)). With the battery overview the
check-up becomes cards, and this becomes one of them.

## Rules

- Ignored findings are kept in `overlay.checkupIgnored` as `<kind>:<entityId>`.
- The check-up reloads after every entries change and when its view opens.
- A new kind needs: `CHECKUP_KIND` (backend) and the frontend type, an icon in `CheckupList` `KIND_ICON`,
  a reason text in `reason()`, texts `checkup.kinds.*` / `checkup.rows.*` in all five locales, and
  banner actions if they make sense.
