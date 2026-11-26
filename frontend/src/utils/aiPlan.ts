import type { AiOperation, AiPlan, McpOverview } from "@/services/aiService";

export type MoveOperation = Extract<AiOperation, { type: "moveEntry" }>;
export type RenameOperation = Extract<AiOperation, { type: "renameFolder" }>;
export type MoveGroup = { to: string; operations: MoveOperation[] };

/** Everything that still fits is ticked: the user asked the AI for this plan. */
export function initialSelection(plan: AiPlan): Set<string> {
  return new Set(plan.operations.filter((op) => op.state === "ok").map((op) => op.id));
}

export function renamesOf(plan: AiPlan): RenameOperation[] {
  return plan.operations.filter((op): op is RenameOperation => op.type === "renameFolder");
}

/** Moves grouped by target folder, in the order the AI listed them. */
export function moveGroups(plan: AiPlan): MoveGroup[] {
  const groups = new Map<string, MoveOperation[]>();

  for (const op of plan.operations) {
    if (op.type === "moveEntry") groups.set(op.to, [...(groups.get(op.to) ?? []), op]);
  }

  return [...groups].map(([to, operations]) => ({ to, operations }));
}

export type IsNewFolderOptions = {
  path: string;
  allPaths: readonly string[];
  plan: AiPlan;
  selected: ReadonlySet<string>;
};

/** A target folder HA does not have yet (and no ticked rename creates). */
export function isNewFolder({ path, allPaths, plan, selected }: IsNewFolderOptions): boolean {
  const renamedTo = renamesOf(plan)
    .filter((op) => selected.has(op.id))
    .map((op) => op.to);

  return !allPaths.includes(path) && !renamedTo.includes(path);
}

export type McpUrlOptions = {
  overview: McpOverview;
  hostname: string;
};

/**
 * Address an AI client uses. The browser reaches HA under `hostname`, and the MCP port is mapped
 * on the same host; null while no host port is set.
 */
export function mcpUrl({ overview, hostname }: McpUrlOptions): string | null {
  return overview.hostPort === null
    ? null
    : `http://${hostname}:${overview.hostPort}${overview.path}`;
}

export const MCP_CLIENT = { claudeCode: "claudeCode", json: "json" } as const;
export type McpClient = (typeof MCP_CLIENT)[keyof typeof MCP_CLIENT];

export type McpSnippetOptions = {
  client: McpClient;
  url: string;
  token: string;
};

/** Setup for an AI client; `token` may be masked for display. */
export function mcpSnippet({ client, url, token }: McpSnippetOptions): string {
  if (client === MCP_CLIENT.claudeCode) {
    return `claude mcp add --transport http homeace ${url} \\\n  --header "Authorization: Bearer ${token}"`;
  }

  const config = {
    mcpServers: {
      homeace: { type: "http", url, headers: { Authorization: `Bearer ${token}` } },
    },
  };

  return JSON.stringify(config, null, 2);
}

/** Keeps the start and end visible, so the user can tell tokens apart. */
export function maskToken(token: string): string {
  const visible = 4;

  return `${token.slice(0, visible + 2)}${"•".repeat(14)}${token.slice(-visible)}`;
}

/**
 * Copies text. HA is often opened over plain http, where the Clipboard API does not exist, so this
 * falls back to a hidden text field.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the fallback.
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();

  try {
    // execCommand is deprecated, but the only way without a secure context.
    return document.execCommand("copy");
  } finally {
    field.remove();
  }
}

/** The text key that says why an operation cannot run as planned: done already, gone, or a conflict. */
export function operationStateKey(op: AiOperation): string {
  if (op.state === "done") return "ai.doneAlready";
  if (op.state === "gone") return op.type === "renameFolder" ? "ai.goneFolder" : "ai.goneEntry";

  return op.type === "renameFolder" ? "ai.conflictRename" : "ai.conflictMove";
}

export type IsGroupOnOptions = {
  group: MoveGroup;
  selected: ReadonlySet<string>;
};

/** Whether every usable operation of a group is ticked; false when none is usable. */
export function isGroupOn({ group, selected }: IsGroupOnOptions): boolean {
  const usable = group.operations.filter((op) => op.state === "ok");

  return usable.length > 0 && usable.every((op) => selected.has(op.id));
}
