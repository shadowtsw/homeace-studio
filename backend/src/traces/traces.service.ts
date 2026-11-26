import { Inject, Injectable } from "@nestjs/common";

import { EDITOR_REPOSITORY } from "../editor/editor.constants";
import { FLOW_KIND, type FlowKind } from "../editor/editor.model";
import { EditorService } from "../editor/editor.service";
import type { EditorRepository } from "../editor/repositories/editor.repository";
import { HaConnectionService } from "../ha/ha-connection.service";
import { HA_COMMAND } from "../ha/ha.constants";
import { toRun, type HaTrace } from "./trace-mapper";
import { DEFAULT_STORED_TRACES } from "./traces.constants";
import type { Run, RunHistory } from "./traces.model";

const FLOW_KINDS: readonly string[] = [FLOW_KIND.automation, FLOW_KIND.script];

export type KeepRunsOptions = {
  entityId: string;
  count: number;
};

/** The runs HA kept of an automation or script (docs/api.md). */
@Injectable()
export class TracesService {
  constructor(
    private readonly ha: HaConnectionService,
    @Inject(EDITOR_REPOSITORY) private readonly editor: EditorRepository,
    private readonly flows: EditorService,
  ) {}

  /**
   * Lets HA keep more runs: sets `trace.stored_traces` in the flow's config file, nothing else.
   *
   * @throws BadRequestException `FLOW_NOT_EDITABLE` for flows outside automations.yaml / scripts.yaml.
   */
  async keepRuns({ entityId, count }: KeepRunsOptions): Promise<{ storedTraces: number }> {
    const { kind, key } = await this.flows.requireStoredFlow(entityId);
    const stored = (await this.editor.loadStoredConfig(kind, key)) ?? {};
    const trace =
      stored.trace && typeof stored.trace === "object"
        ? (stored.trace as Record<string, unknown>)
        : {};

    await this.editor.saveConfig(kind, key, {
      ...stored,
      trace: { ...trace, stored_traces: count },
    });

    return { storedTraces: count };
  }

  async forEntity(entityId: string): Promise<RunHistory> {
    const kind = entityId.split(".")[0] ?? "";
    if (!FLOW_KINDS.includes(kind)) return { entityId, storedTraces: 0, runs: [] };

    const config = await this.editor.loadConfig(kind as FlowKind, entityId);
    const storedTraces = storedTracesOf(config);
    // HA files runs under the automation id or the script key; without one it keeps none.
    const itemId = await this.editor.loadStorageKey(kind as FlowKind, entityId, config);
    if (!itemId) return { entityId, storedTraces, runs: [] };

    const summaries = await this.ha.call<HaTrace[]>(HA_COMMAND.traceList, {
      domain: kind,
      item_id: itemId,
    });
    const runs = await Promise.all(
      summaries.map((summary) => this.loadRun({ domain: kind, itemId, summary })),
    );

    return {
      entityId,
      storedTraces,
      runs: runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    };
  }

  /** The full run; when HA dropped it meanwhile, the summary has to do. */
  private async loadRun({
    domain,
    itemId,
    summary,
  }: {
    domain: string;
    itemId: string;
    summary: HaTrace;
  }): Promise<Run> {
    try {
      const trace = await this.ha.call<HaTrace>(HA_COMMAND.traceGet, {
        domain,
        item_id: itemId,
        run_id: summary.run_id,
      });
      return toRun(trace);
    } catch {
      return toRun(summary);
    }
  }
}

function storedTracesOf(config: Record<string, unknown>): number {
  const trace = config.trace;
  const value =
    trace && typeof trace === "object"
      ? (trace as Record<string, unknown>).stored_traces
      : undefined;

  return typeof value === "number" && value > 0 ? value : DEFAULT_STORED_TRACES;
}
