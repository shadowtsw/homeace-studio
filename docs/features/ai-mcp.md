# AI access (MCP) and folder plans

An external AI (Claude Desktop, …) can read the folders and entries over MCP and **propose** folder plans.
It never changes anything itself: the user reviews every plan in the UI and applies or rejects it.

## Where what lives

| What | File |
| --- | --- |
| Own node HTTP server on `MCP_PORT` (default 8098, not under `/api`), stateless Streamable HTTP per request, Bearer token check, 1 MB body limit | `backend/src/ai/mcp-http.server.ts` |
| The four tools: `list_folders`, `list_entries`, `propose_folder_plan`, `get_plan_status` | `backend/src/ai/mcp-tools.ts` (`MCP_TOOLS_VERSION`) |
| Switch, token (`hac_…`, constant-time compare), last client, Supervisor host-port lookup | `backend/src/ai/mcp-access.service.ts` |
| Plans: propose (validated, all problems at once), list with live state, apply, reject | `backend/src/ai/ai-plans.service.ts`, `ai-plan.model.ts` |
| `GET/PUT /api/mcp`, `POST /api/mcp/token`, `GET /api/ai-plans`, `POST /api/ai-plans/:id/apply · /reject` | `backend/src/ai/ai.controller.ts` |
| Limits (open plans, kept plans, operations, lengths) | `backend/src/ai/ai.constants.ts` |
| Settings, as the tab "KI-Zugang" of the settings window (switch, URL, token, client config; what an AI may do, open plans) | `frontend/src/components/ai/McpSettingsPanel.vue`; switching, new token and copying with toasts in `composables/actions/useMcpActions.ts`, `McpAccessRules.vue`, `components/settings/SettingsAiTab.vue` |
| Hint above the folders, review dialog (preview, tick operations) | `frontend/src/components/ai/AiPlanHint.vue`, `AiPlanDialog.vue` with the parts `AiPlanMoveGroups.vue` (moves by target folder) and `AiPlanPreview.vue`; the three share `aiPlanDialog.css`. Ticking in `composables/useAiPlanSelection.ts`, apply/reject with toasts in `composables/actions/useAiPlanActions.ts` |
| Store and pure helpers | `frontend/src/stores/aiStore.ts`, `services/aiService.ts`, `utils/aiPlan.ts` (groups, new folders, why an operation cannot run) |

## Plans

- Operations: `renameFolder { from, to }` and `moveEntry { entityId, entryName, to }`. Status: `open`,
  `applied`, `partial`, `rejected`. Plans are kept in `overlay.aiPlans` (at most 10 open, 30 kept).
- `propose` throws `PlanInputError` with **every** problem, so the AI can fix them in one go. A new plan
  calls `LiveService.notify()`, and the browser shows the hint at once.
- `apply(planId, operationIds)`: folder renames first, then moves, using the same services as the UI
  (`CategoriesService`, `EntriesService`). One failing operation does not stop the others. Operations that
  were already true count as done.

## Rules

- Access is **off** until the user switches it on. Switching on the first time creates a token, and a new
  token invalidates the old one at once. While off, the server answers "off", and a wrong token gets 401
  with `WWW-Authenticate`.
- In the add-on, HA maps the port only when the user sets a host port (`8098/tcp` in the app's network
  options). The dialog reads the mapped port from the Supervisor.
- Raise `MCP_TOOLS_VERSION` when tools or their schemas change.
- An AI must never get write tools that bypass the review.
