import { MAX_KEPT_RENAMES } from "../versions.constants";
import type { EntityRename, VersionHistory } from "../versions.model";
import {
  emptyHistory,
  type HistoryKey,
  type UpdateHistoryOptions,
  type VersionsRepository,
} from "./versions.repository";

/** Versions in memory: the demo, and tests. Gone after a restart. */
export class MemoryVersionsRepository implements VersionsRepository {
  private readonly histories = new Map<string, VersionHistory>();
  private renames: EntityRename[] = [];
  private lastSeen: string | null = null;

  read(key: HistoryKey): Promise<VersionHistory | null> {
    const stored = this.histories.get(historyId(key));
    return Promise.resolve(stored ? structuredClone(stored) : null);
  }

  update({ ref, change }: UpdateHistoryOptions): Promise<VersionHistory> {
    const stored = this.histories.get(historyId(ref));
    const changed = change(stored ? structuredClone(stored) : emptyHistory(ref));
    this.histories.set(historyId(ref), structuredClone(changed));

    return Promise.resolve(changed);
  }

  readRenames(): Promise<EntityRename[]> {
    return Promise.resolve([...this.renames]);
  }

  addRename(entityRename: EntityRename): Promise<void> {
    this.renames = [...this.renames, entityRename].slice(-MAX_KEPT_RENAMES);
    return Promise.resolve();
  }

  readLastSeen(): Promise<string | null> {
    return Promise.resolve(this.lastSeen);
  }

  writeLastSeen(at: string): Promise<void> {
    this.lastSeen = at;
    return Promise.resolve();
  }
}

function historyId({ kind, key }: HistoryKey): string {
  return `${kind}:${key}`;
}
