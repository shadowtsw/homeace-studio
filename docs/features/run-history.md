# Run history

The "Verlauf" tab of automations and scripts: HA's traces as runs by day. The selected run is shown block
by block, and "Im Ablauf zeigen" puts it on the flow.

## Where what lives

| What | File |
| --- | --- |
| `GET /api/traces/:entityId`, `PUT /api/traces/:entityId/stored` (keep more runs) | `backend/src/traces/traces.controller.ts`, `traces.service.ts` |
| HA trace → `Run` (result word, what started it, steps in time order) | `backend/src/traces/trace-mapper.ts` (pure) |
| Tab: runs by day, selected run step by step, "Die letzten 20 merken" | `frontend/src/components/history/RunHistoryView.vue`, `RunStepRow.vue` |
| Bar above the flow while a run is shown on it | `frontend/src/components/history/RunOverlayBar.vue` |
| Run → state per display block (`fired`, `passed`, `failed`, `notReached`, …) | `frontend/src/utils/runStates.ts` (`tracePathOf`, `runStatesFor`) |
| Durations and times | `frontend/src/utils/runTime.ts` |
| Store: runs of the open entry, `shownRunId` | `frontend/src/stores/tracesStore.ts`, `services/tracesService.ts` |
| Texts per run state | `frontend/src/composables/useRunTexts.ts` |

## Flow

1. `RunHistoryView` loads on mount and on entity change (`tracesStore.load`). The store drops answers for
   an entry that is no longer open. After live changes, `refresh()` reloads quietly, because a running
   run may be done now.
2. The backend reads `trace/list` (summaries), then `trace/get` for the runs it shows. If HA dropped a run
   meanwhile, the summary has to do.
3. "Im Ablauf zeigen" → `traces.showOnFlow(runId)` and the tab switches to the flow. `EntryDetail` computes
   `runStatesFor(run, displayFlow)` and passes it to `FlowView`, which provides it (`FLOW_RUN_STATES`) to
   every `FlowBlock`. Opening another entry resets it.
4. Block ids (`actions.2.then.0`) map to HA's trace paths (`action/2/then/0`) with `tracePathOf`.

## Rules

- "Die letzten 20 merken" (`MORE_RUNS`) only sets `trace.stored_traces` in the flow's config file
  (backend max `MAX_STORED_TRACES`). It is offered only for editable flows **without unsaved edits**
  (saving the config would otherwise mix with the draft). Flows outside `automations.yaml` /
  `scripts.yaml` → `FLOW_NOT_EDITABLE`.
- New automations and scripts keep as many runs as set under Einstellungen → Bearbeiten → "Durchläufe
  merken" (`settings.storedTraces`, choices in `constants/traces.ts`). Right after creating, the same
  call writes `trace.stored_traces` (`keepRunsAsSet` in `useCreateActions`). With HA's default (5)
  nothing is written, so the config stays as HA would create it.
- The demo has invented traces: `backend/src/demo/demo-traces.ts`.
- **Who started a run** (`start.by`, `startedBy` in `trace-mapper.ts`): a step `trigger/N` → `trigger`.
  A run by hand ("Ausführen", `automation.trigger`) has the step `trigger` **without a number** and a
  `parent_id` (the context of the service call), so that step is checked before the context →
  `user` ("Von Hand gestartet"). HA calls it "manually triggered" too, also when an action called
  `automation.trigger`; we cannot tell these apart. Otherwise `parent_id` → `flow` (a script started by
  an automation or script), `user_id` → `user`, else `unknown`. Seen on HA 2026.12.0b1; HA has worked
  like this for a long time.
