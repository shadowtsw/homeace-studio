import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { CATEGORY_SEPARATOR } from "../categories/categories.constants";
import { isSameOrBelow } from "../categories/category-path";
import type { EntriesService } from "../entries/entries.service";
import { ENTRY_KIND, type Entry } from "../entries/entry.model";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import { AI_OPERATION_TYPE } from "./ai-plan.model";
import { collectFolders, PlanInputError } from "./ai-plan-rules";
import type { AiPlansService } from "./ai-plans.service";
import {
  MAX_LISTED_ENTRIES,
  MAX_PLAN_OPERATIONS,
  PLAN_REASONING_MAX_LENGTH,
  PLAN_TITLE_MAX_LENGTH,
} from "./ai.constants";

export type McpToolDeps = {
  entries: EntriesService;
  plans: AiPlansService;
  overlay: OverlayRepository;
  /** Client name from the MCP handshake of this connection, if known. */
  client: string | null;
  version: string;
};

const INSTRUCTIONS = `HomeAce Studio organizes the automations, scripts, scenes and helpers of a Home Assistant home in folders.
Folder paths use "/" between levels, e.g. "House/Terrace". In Home Assistant every folder is a category named after its full path.
Read the current structure with list_folders and list_entries, then send one plan with propose_folder_plan.
You cannot change anything directly: the user reviews the plan in HomeAce Studio and applies all, some or none of it.
Ask get_plan_status later for the outcome. Keep plans focused and explain your reasoning briefly in the user's language.`;

const KINDS = [
  ENTRY_KIND.automation,
  ENTRY_KIND.script,
  ENTRY_KIND.scene,
  ENTRY_KIND.helper,
] as const;

function json(value: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function failure(text: string): CallToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

/** What the AI sees of an entry: no flows, states or notes. */
function publicEntry(entry: Entry) {
  return {
    entityId: entry.entityId,
    name: entry.name,
    kind: entry.kind,
    folder: entry.categoryPath,
    area: entry.area?.name ?? null,
    labels: entry.labels.map((label) => label.name),
    canMove: entry.isInRegistry,
  };
}

/**
 * One MCP server with the four tools. The HTTP endpoint builds a fresh one per request
 * (stateless), so nothing is kept between calls apart from the plans in the overlay.
 */
export function createMcpServer(deps: McpToolDeps): McpServer {
  const server = new McpServer(
    { name: "homeace-studio", version: deps.version },
    { instructions: INSTRUCTIONS },
  );

  server.registerTool(
    "list_folders",
    {
      title: "List folders",
      description:
        "All folders with how many automations, scripts, scenes and helpers each holds directly. Folders without entries exist only in HomeAce Studio.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      const [entries, overlay] = await Promise.all([deps.entries.findAll(), deps.overlay.read()]);
      const folders = [...collectFolders({ entries, savedFolders: overlay.folders })].sort((a, b) =>
        a.localeCompare(b),
      );

      return json({
        separator: CATEGORY_SEPARATOR,
        folders: folders.map((path) => {
          const direct = entries.filter((entry) => entry.categoryPath === path);
          const counts = Object.fromEntries(
            KINDS.map((kind) => [kind, direct.filter((entry) => entry.kind === kind).length]),
          );
          return { path, ...counts, total: direct.length };
        }),
        uncategorized: entries.filter((entry) => !entry.categoryPath).length,
      });
    },
  );

  server.registerTool(
    "list_entries",
    {
      title: "List entries",
      description:
        "Automations, scripts, scenes and helpers with name, kind, folder, area and labels. Filter by folder (with its subfolders unless includeSubfolders is false), by kind, or ask for uncategorized ones with folder set to an empty string.",
      inputSchema: {
        folder: z
          .string()
          .optional()
          .describe('Folder path like "House/Terrace"; "" for uncategorized'),
        includeSubfolders: z.boolean().optional(),
        kind: z.enum(KINDS).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ folder, includeSubfolders, kind }) => {
      const entries = await deps.entries.findAll();
      const inFolder = (entry: Entry): boolean => {
        if (folder === undefined) return true;
        if (folder === "") return entry.categoryPath === null;
        if (!entry.categoryPath) return false;
        return includeSubfolders === false
          ? entry.categoryPath === folder
          : isSameOrBelow({ path: entry.categoryPath, ancestor: folder });
      };
      const matching = entries.filter((entry) => inFolder(entry) && (!kind || entry.kind === kind));

      return json({
        total: matching.length,
        entries: matching.slice(0, MAX_LISTED_ENTRIES).map(publicEntry),
      });
    },
  );

  server.registerTool(
    "propose_folder_plan",
    {
      title: "Propose a folder plan",
      description: `Sends a plan to the user for review. Operations: renameFolder (moves a folder with all its subfolders, e.g. "Security" → "House/Security"; the target must not exist yet) and moveEntry (puts one entry into a folder, which is created if needed). At most ${MAX_PLAN_OPERATIONS} operations. Nothing changes until the user applies it in HomeAce Studio.`,
      inputSchema: {
        title: z.string().trim().min(1).max(PLAN_TITLE_MAX_LENGTH),
        reasoning: z.string().trim().min(1).max(PLAN_REASONING_MAX_LENGTH),
        operations: z
          .array(
            z.discriminatedUnion("type", [
              z.object({
                type: z.literal(AI_OPERATION_TYPE.renameFolder),
                from: z.string().min(1),
                to: z.string().min(1),
              }),
              z.object({
                type: z.literal(AI_OPERATION_TYPE.moveEntry),
                entityId: z.string().min(1),
                to: z.string().min(1),
              }),
            ]),
          )
          .min(1)
          .max(MAX_PLAN_OPERATIONS),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (input) => {
      try {
        const plan = await deps.plans.propose({ input, client: deps.client });

        return json({
          planId: plan.id,
          status: plan.status,
          operations: plan.operations.length,
          note: "The user reviews this plan in HomeAce Studio. Nothing has changed yet. Ask get_plan_status for the outcome.",
        });
      } catch (error) {
        if (error instanceof PlanInputError) {
          return failure(`The plan was not saved:\n${error.problems.join("\n")}`);
        }
        throw error;
      }
    },
  );

  server.registerTool(
    "get_plan_status",
    {
      title: "Get plan status",
      description:
        "Whether the user applied, partly applied or rejected a plan, and which operations ran.",
      inputSchema: { planId: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    async ({ planId }) => {
      const plan = await deps.plans.find(planId);

      if (!plan) return failure(`There is no plan with the id "${planId}".`);

      return json({
        planId: plan.id,
        title: plan.title,
        status: plan.status,
        decidedAt: plan.decidedAt,
        operations: plan.operations.map((operation) => ({
          id: operation.id,
          type: operation.type,
          ...(operation.type === AI_OPERATION_TYPE.moveEntry
            ? { entityId: operation.entityId, to: operation.to }
            : { from: operation.from, to: operation.to }),
          applied: plan.appliedOperationIds.includes(operation.id),
        })),
      });
    },
  );

  return server;
}
