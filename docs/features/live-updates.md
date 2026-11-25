# Live updates

The UI follows changes made in HA (or by an AI plan) without a reload: the backend listens to HA events,
debounces them and tells every browser over Server-Sent Events. The browser then reloads quietly.

## Chain

```text
HA WebSocket ──state_changed, *_registry_updated──► LiveService (isRelevantChange)
   ──debounce 500 ms, shared──► GET /api/events (SSE, LiveController, heartbeat as own event type)
   ──► useLiveUpdates (VueUse useEventSource, autoReconnect)
        → entriesStore.refresh()   → StudioView watch → cleanup, check-up, dependencies, traces, entry areas
        → editorStore.refreshFlow() → hasRemoteChange if a draft's base differs
        → ai.loadPlans()
tab visible again → entries, folders and AI plans reload once (events may have been missed)
```

## Where what lives

| What | File |
| --- | --- |
| Which events count | `backend/src/live/live-events.ts` (`LIVE_EVENT_TYPES`, `isRelevantChange`) |
| Subscribing, debounce, `notify()` for own changes | `backend/src/live/live.service.ts` |
| SSE endpoint | `backend/src/live/live.controller.ts` |
| HA subscriptions and reconnect | `backend/src/ha/ha-connection.service.ts` (`subscribe`) |
| Browser side | `frontend/src/composables/useLiveUpdates.ts` (returns `isLive` for the top bar) |
| Snapshot cache cleared by live changes | `backend/src/snapshot/home-snapshot.service.ts` |

## Rules

- Registry events always count. `state_changed` counts only for shown domains (automation, script,
  scene, HA-managed helpers) and only when the **state** changes. Attribute-only changes like
  `last_triggered` do not count, and neither do sensors or config-entry helpers, which change constantly.
- Changes that do not come from HA (a new AI plan) call `LiveService.notify()`.
- `HaConnectionService` reconnects every 5 s while subscriptions exist and subscribes again.
- Every quiet reload must keep what the user is doing: drafts stay, forms keep the user's edits
  (see [../ui/detail.md](../ui/detail.md)), and selections stay.
