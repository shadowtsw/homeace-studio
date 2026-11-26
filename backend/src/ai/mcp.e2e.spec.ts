import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { CategoriesService } from "../categories/categories.service";
import { HaCategoriesRepository } from "../categories/repositories/ha-categories.repository";
import { DEMO_ENDPOINT } from "../demo/demo.constants";
import { createDemoHome } from "../demo/demo-home";
import { DemoHaConnectionService } from "../demo/demo-ha.services";
import { FakeHa } from "../demo/fake-ha";
import { MemoryOverlayRepository } from "../demo/memory-overlay.repository";
import { EntriesService } from "../entries/entries.service";
import { HaEntriesRepository } from "../entries/repositories/ha-entries.repository";
import { LiveService } from "../live/live.service";
import { AI_PLAN_STATUS } from "./ai-plan.model";
import { AiPlansService } from "./ai-plans.service";
import { McpAccessService } from "./mcp-access.service";
import { McpHttpServer } from "./mcp-http.server";

type TextResult = { content: { type: string; text: string }[]; isError?: boolean };

/** The real MCP endpoint against the demo home, called by the SDK's own client. */
async function setup() {
  const ha = new DemoHaConnectionService(new FakeHa(createDemoHome()));
  const overlay = new MemoryOverlayRepository({});
  const categories = new CategoriesService(new HaCategoriesRepository(ha), overlay);
  const entries = new EntriesService(new HaEntriesRepository(ha), overlay, categories);
  const live = new LiveService(ha);
  const plans = new AiPlansService(overlay, entries, categories, live);
  const access = new McpAccessService(overlay, { ...DEMO_ENDPOINT }, 0);
  const server = new McpHttpServer(access, plans, entries, overlay);
  const port = await server.start(0);
  const url = new URL(`http://127.0.0.1:${port}/mcp`);

  const connect = async (token: string): Promise<Client> => {
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(url, {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    });
    await client.connect(transport);
    return client;
  };
  const call = async (client: Client, name: string, args: Record<string, unknown> = {}) =>
    (await client.callTool({ name, arguments: args })) as TextResult;

  return { server, access, plans, entries, url, connect, call };
}

describe("MCP endpoint", () => {
  let context: Awaited<ReturnType<typeof setup>>;

  beforeEach(async () => {
    context = await setup();
  });

  afterEach(() => context.server.onModuleDestroy());

  it("stays closed while switched off and refuses a wrong token", async () => {
    const off = await fetch(context.url, { method: "POST", body: "{}" });
    expect(off.status).toBe(503);

    await context.access.setEnabled(true);
    const wrong = await fetch(context.url, {
      method: "POST",
      headers: { Authorization: "Bearer hac_wrong" },
      body: "{}",
    });
    expect(wrong.status).toBe(401);
  });

  it("lists the tools and folders, takes a plan and reports its status", async () => {
    const { token } = await context.access.setEnabled(true);
    const client = await context.connect(token ?? "");

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      "get_plan_status",
      "list_entries",
      "list_folders",
      "propose_folder_plan",
    ]);

    const folders = JSON.parse((await context.call(client, "list_folders")).content[0].text) as {
      folders: { path: string }[];
    };
    expect(folders.folders.map((folder) => folder.path)).toContain("House/Terrace");

    const terrace = JSON.parse(
      (await context.call(client, "list_entries", { folder: "House/Terrace", kind: "automation" }))
        .content[0].text,
    ) as { entries: { entityId: string; name: string }[] };
    expect(terrace.entries.map((entry) => entry.entityId)).toContain(
      "automation.terrace_light_on_motion",
    );
    expect(Object.keys(terrace.entries[0])).not.toContain("note");

    const proposed = await context.call(client, "propose_folder_plan", {
      title: "Rooms first",
      reasoning: "Security belongs to the house.",
      operations: [
        { type: "renameFolder", from: "Security", to: "House/Security" },
        { type: "moveEntry", entityId: "automation.old_light_switch_test", to: "Archive" },
      ],
    });
    const { planId } = JSON.parse(proposed.content[0].text) as { planId: string };
    expect(context.access.lastClient).toBe("test-client");

    // The user applies only the move in the app.
    const result = await context.plans.apply({ planId, operationIds: ["op2"] });
    expect(result).toEqual({ appliedCount: 1, failed: [] });

    const status = JSON.parse(
      (await context.call(client, "get_plan_status", { planId })).content[0].text,
    ) as { status: string; operations: { id: string; applied: boolean }[] };
    expect(status.status).toBe(AI_PLAN_STATUS.partial);
    expect(status.operations).toEqual([
      expect.objectContaining({ id: "op1", applied: false }),
      expect.objectContaining({ id: "op2", applied: true }),
    ]);

    const moved = (await context.entries.findAll()).find(
      (entry) => entry.entityId === "automation.old_light_switch_test",
    );
    expect(moved?.categoryPath).toBe("Archive");

    await client.close();
  });

  it("explains every problem of a broken plan to the AI and saves nothing", async () => {
    const { token } = await context.access.setEnabled(true);
    const client = await context.connect(token ?? "");

    const answer = await context.call(client, "propose_folder_plan", {
      title: "Broken",
      reasoning: "Test",
      operations: [
        { type: "moveEntry", entityId: "automation.does_not_exist", to: "A" },
        { type: "renameFolder", from: "House", to: "House/Inner" },
        { type: "moveEntry", entityId: "script.all_off", to: "A//B" },
      ],
    });

    expect(answer.isError).toBe(true);
    expect(answer.content[0].text).toContain("automation.does_not_exist");
    expect(answer.content[0].text).toContain("into itself");
    expect(answer.content[0].text).toContain("not a valid folder path");
    expect(await context.plans.list()).toEqual([]);

    await client.close();
  });
});
