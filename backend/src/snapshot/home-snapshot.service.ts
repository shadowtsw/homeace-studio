import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";

import { EDITOR_REPOSITORY } from "../editor/editor.constants";
import { FLOW_KIND, type FlowKind } from "../editor/editor.model";
import type { EditorRepository } from "../editor/repositories/editor.repository";
import type { Entry } from "../entries/entry.model";
import { EntriesService } from "../entries/entries.service";
import { HaConnectionService } from "../ha/ha-connection.service";
import { HA_COMMAND } from "../ha/ha.constants";
import type { HaArea, HaDevice, HaEntityRegistryEntry, HaState } from "../ha/ha.types";
import { LiveService } from "../live/live.service";
import { toRun, type HaTrace } from "../traces/trace-mapper";
import type { RunResult } from "../traces/traces.model";
import { SNAPSHOT_CACHE_MS, SNAPSHOT_CLOCK } from "./snapshot.constants";

/** The newest run HA kept of an automation or script. */
export type LastRun = { startedAt: string; result: RunResult; error: string | null };

/**
 * Everything the check-up, the dependencies and the area view read at once, taken at one moment.
 */
export type HomeSnapshot = {
  /** When it was read (ms since epoch). */
  at: number;
  entries: Entry[];
  states: HaState[];
  registry: HaEntityRegistryEntry[];
  devices: HaDevice[];
  areas: HaArea[];
  /** Config of every automation and script that could be read, by entity ID. */
  configs: ReadonlyMap<string, unknown>;
  /** Newest run of every automation and script HA kept runs of, by entity ID. */
  lastRuns: ReadonlyMap<string, LastRun>;
};

const FLOW_KINDS: readonly FlowKind[] = [FLOW_KIND.automation, FLOW_KIND.script];

/** A read in progress, with the generation of the data it started on. */
type RunningRead = { generation: number; snapshot: Promise<HomeSnapshot> };

/** Reads entries, states, registry and every flow config from HA, shared for a short while. */
@Injectable()
export class HomeSnapshotService implements OnModuleInit {
  private cached: HomeSnapshot | null = null;
  private running: RunningRead | null = null;
  /** Counts the changes; a read that started before one is neither kept nor shared. */
  private generation = 0;

  constructor(
    private readonly entries: EntriesService,
    private readonly ha: HaConnectionService,
    @Inject(EDITOR_REPOSITORY) private readonly editor: EditorRepository,
    @Inject(SNAPSHOT_CLOCK) private readonly clock: () => number,
    private readonly live: LiveService,
  ) {}

  /**
   * Anything that changes in HA makes the next request read again, at once and not only after the
   * burst of events, so a request right after a change never gets the old data.
   */
  onModuleInit(): void {
    this.live.eachChange$.subscribe(() => this.invalidate());
  }

  invalidate(): void {
    this.cached = null;
    this.generation++;
  }

  /** The current snapshot; requests during a read share it, unless something changed meanwhile. */
  get(): Promise<HomeSnapshot> {
    const now = this.clock();

    if (this.cached && now - this.cached.at < SNAPSHOT_CACHE_MS)
      return Promise.resolve(this.cached);

    if (this.running?.generation !== this.generation) {
      const generation = this.generation;
      this.running = { generation, snapshot: this.readAndKeep({ now, generation }) };
    }

    return this.running.snapshot;
  }

  /** Reads and keeps the result, unless something changed while reading (it may be old then). */
  private async readAndKeep({
    now,
    generation,
  }: {
    now: number;
    generation: number;
  }): Promise<HomeSnapshot> {
    try {
      const snapshot = await this.read(now);
      if (generation === this.generation) this.cached = snapshot;
      return snapshot;
    } finally {
      if (this.running?.generation === generation) this.running = null;
    }
  }

  private async read(now: number): Promise<HomeSnapshot> {
    const [entries, states, registry, devices, areas, traces] = await Promise.all([
      this.entries.findAll(),
      this.editor.loadStates(),
      this.ha.call<HaEntityRegistryEntry[]>({ type: HA_COMMAND.entityRegistryList }),
      this.ha.call<HaDevice[]>({ type: HA_COMMAND.deviceRegistryList }),
      this.ha.call<HaArea[]>({ type: HA_COMMAND.areaRegistryList }),
      // Without the trace integration there is simply no run history.
      this.ha.call<HaTrace[]>({ type: HA_COMMAND.traceList }).catch((): HaTrace[] => []),
    ]);
    const flows = entries.filter((entry) => (FLOW_KINDS as readonly string[]).includes(entry.kind));
    const configs = new Map<string, unknown>();

    await Promise.all(
      flows.map(async (entry) => {
        try {
          configs.set(
            entry.entityId,
            await this.editor.loadConfig({
              kind: entry.kind as FlowKind,
              entityId: entry.entityId,
            }),
          );
        } catch {
          // A flow HA cannot hand out (e.g. broken YAML) is simply left out.
        }
      }),
    );

    return {
      at: now,
      entries,
      states,
      registry,
      devices,
      areas,
      configs,
      lastRuns: lastRunsOf({ traces, registry }),
    };
  }
}

/** HA files runs under the automation id / script key, which is the registry unique_id. */
function lastRunsOf({
  traces,
  registry,
}: {
  traces: (HaTrace & { domain?: string; item_id?: string })[];
  registry: HaEntityRegistryEntry[];
}): Map<string, LastRun> {
  const entityOf = new Map(
    registry.map((entry) => [`${entry.platform}:${entry.unique_id}`, entry.entity_id]),
  );
  const result = new Map<string, LastRun>();

  for (const trace of traces) {
    const entityId = entityOf.get(`${trace.domain}:${trace.item_id}`);
    if (!entityId || (result.get(entityId)?.startedAt ?? "") > trace.timestamp.start) continue;

    const run = toRun(trace);
    result.set(entityId, { startedAt: run.startedAt, result: run.result, error: run.error });
  }

  return result;
}
