import { describe, expect, it } from "vitest";

import type { AiPlan, McpOverview } from "@/services/aiService";

import {
  MCP_CLIENT,
  initialSelection,
  isGroupOn,
  isNewFolder,
  maskToken,
  mcpSnippet,
  mcpUrl,
  moveGroups,
  operationStateKey,
} from "../aiPlan";

const PLAN: AiPlan = {
  id: "p1",
  title: "Rooms first",
  reasoning: "…",
  client: "claude-code",
  createdAt: "2026-11-20T10:00:00Z",
  status: "open",
  appliedOperationIds: [],
  decidedAt: null,
  operations: [
    { id: "op1", type: "renameFolder", from: "Security", to: "House/Security", state: "ok" },
    {
      id: "op2",
      type: "moveEntry",
      entityId: "a.1",
      entryName: "A",
      to: "House/Bath",
      state: "ok",
    },
    { id: "op3", type: "moveEntry", entityId: "a.2", entryName: "B", to: "Archive", state: "gone" },
    {
      id: "op4",
      type: "moveEntry",
      entityId: "a.3",
      entryName: "C",
      to: "House/Bath",
      state: "done",
    },
  ],
};

const OVERVIEW: McpOverview = {
  isEnabled: true,
  token: "hac_abcdefghijklmnopqrstuvwxyzABCDEF",
  path: "/mcp",
  containerPort: 8098,
  hostPort: 8098,
  isAddon: true,
  lastConnection: null,
};

describe("AI plan review", () => {
  it("ticks only operations that still fit and groups moves by target", () => {
    expect([...initialSelection(PLAN)]).toEqual(["op1", "op2"]);
    expect(moveGroups(PLAN).map((group) => [group.to, group.operations.length])).toEqual([
      ["House/Bath", 2],
      ["Archive", 1],
    ]);
  });

  it("marks a target as new unless it exists or a ticked rename creates it", () => {
    expect(
      isNewFolder({ path: "House/Bath", allPaths: ["House"], plan: PLAN, selected: new Set() }),
    ).toBe(true);
    expect(
      isNewFolder({ path: "House", allPaths: ["House"], plan: PLAN, selected: new Set() }),
    ).toBe(false);
    expect(
      isNewFolder({ path: "House/Security", allPaths: [], plan: PLAN, selected: new Set(["op1"]) }),
    ).toBe(false);
  });

  it("builds the address and the client setup, with the token masked for display", () => {
    const url = mcpUrl({ overview: OVERVIEW, hostname: "192.0.2.10" });

    expect(url).toBe("http://192.0.2.10:8098/mcp");
    expect(mcpUrl({ overview: { ...OVERVIEW, hostPort: null }, hostname: "x" })).toBeNull();
    expect(mcpSnippet({ client: MCP_CLIENT.claudeCode, url: url ?? "", token: "T" })).toContain(
      "claude mcp add --transport http homeace http://192.0.2.10:8098/mcp",
    );
    expect(JSON.parse(mcpSnippet({ client: MCP_CLIENT.json, url: "u", token: "T" }))).toEqual({
      mcpServers: { homeace: { type: "http", url: "u", headers: { Authorization: "Bearer T" } } },
    });
    expect(maskToken(OVERVIEW.token ?? "")).toMatch(/^hac_ab•+CDEF$/);
  });
});

describe("plan review", () => {
  it("says why an operation cannot run, by state and type", () => {
    const [rename, , gone, done] = PLAN.operations;

    expect(done && operationStateKey(done)).toBe("ai.doneAlready");
    expect(gone && operationStateKey(gone)).toBe("ai.goneEntry");
    expect(rename && operationStateKey({ ...rename, state: "gone" })).toBe("ai.goneFolder");
    expect(rename && operationStateKey({ ...rename, state: "conflict" })).toBe("ai.conflictRename");
    expect(gone && operationStateKey({ ...gone, state: "conflict" })).toBe("ai.conflictMove");
  });

  it("counts a group as ticked when every usable operation is", () => {
    const [bath] = moveGroups(PLAN).filter((group) => group.to === "House/Bath");

    expect(bath && isGroupOn({ group: bath, selected: new Set(["op2"]) })).toBe(true);
    expect(bath && isGroupOn({ group: bath, selected: new Set() })).toBe(false);
  });
});
