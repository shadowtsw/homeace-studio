import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { gunzip, gzip } from "node:zlib";

import { Inject, Injectable } from "@nestjs/common";

import { MAX_KEPT_RENAMES, VERSIONS_DIR } from "../versions.constants";
import {
  VERSION_KIND,
  type EntityRename,
  type VersionHistory,
  type VersionKind,
} from "../versions.model";
import {
  emptyHistory,
  type HistoryKey,
  type UpdateHistoryOptions,
  type VersionsRepository,
} from "./versions.repository";

const zip = promisify(gzip);
const unzip = promisify(gunzip);

const FILE_NOT_FOUND = "ENOENT";
const TEMP_FILE_SUFFIX = ".tmp";
const HISTORY_SUFFIX = ".json.gz";
const RENAMES_FILE = "entity-renames.json";
const STATE_FILE = "state.json";
/** "automation-<base64url key>.json.gz" */
const HISTORY_FILE = /^([a-z]+)-([A-Za-z0-9_-]+).json.gz$/;

/**
 * One gzipped JSON file per entry in the versions folder next to the overlay (part of HA backups).
 * Not in the overlay: it is rewritten as a whole on every change and would grow with every version.
 */
@Injectable()
export class FileVersionsRepository implements VersionsRepository {
  /** Every change of a file waits for the one before it. */
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(@Inject(VERSIONS_DIR) private readonly dir: string) {}

  async read(key: HistoryKey): Promise<VersionHistory | null> {
    const raw = await this.readFileOrNull(this.historyPath(key));
    if (raw === null) return null;

    return JSON.parse((await unzip(raw)).toString("utf8")) as VersionHistory;
  }

  update({ ref, change }: UpdateHistoryOptions): Promise<VersionHistory> {
    const path = this.historyPath(ref);

    return this.queued(path, async () => {
      const stored = await this.read(ref);
      const changed = change(stored ?? emptyHistory(ref));
      await this.writeAtomic({ path, data: await zip(JSON.stringify(changed)) });

      return changed;
    });
  }

  async listKeys(): Promise<HistoryKey[]> {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === FILE_NOT_FOUND) return [];
      throw error;
    }

    return names.flatMap((name) => {
      const match = HISTORY_FILE.exec(name);
      if (!match?.[1] || !match[2]) return [];
      if (!isVersionKind(match[1])) return [];
      return [{ kind: match[1], key: Buffer.from(match[2], "base64url").toString("utf8") }];
    });
  }

  remove(key: HistoryKey): Promise<void> {
    const path = this.historyPath(key);
    return this.queued(path, () => rm(path, { force: true }));
  }

  async readRenames(): Promise<EntityRename[]> {
    const raw = await this.readFileOrNull(join(this.dir, RENAMES_FILE));
    if (raw === null) return [];

    return JSON.parse(raw.toString("utf8")) as EntityRename[];
  }

  async addRename(entityRename: EntityRename): Promise<void> {
    const path = join(this.dir, RENAMES_FILE);

    await this.queued(path, async () => {
      const kept = [...(await this.readRenames()), entityRename].slice(-MAX_KEPT_RENAMES);
      await this.writeAtomic({ path, data: Buffer.from(JSON.stringify(kept), "utf8") });
    });
  }

  async readLastSeen(): Promise<string | null> {
    const raw = await this.readFileOrNull(join(this.dir, STATE_FILE));
    if (raw === null) return null;

    const state = JSON.parse(raw.toString("utf8")) as { lastSeenAt?: unknown };
    return typeof state.lastSeenAt === "string" ? state.lastSeenAt : null;
  }

  async writeLastSeen(at: string): Promise<void> {
    const path = join(this.dir, STATE_FILE);
    const data = Buffer.from(JSON.stringify({ lastSeenAt: at }), "utf8");

    await this.queued(path, () => this.writeAtomic({ path, data }));
  }

  /** The key in the file name, encoded so any storage key gives a valid name. */
  private historyPath({ kind, key }: HistoryKey): string {
    return join(
      this.dir,
      `${kind}-${Buffer.from(key, "utf8").toString("base64url")}${HISTORY_SUFFIX}`,
    );
  }

  private async readFileOrNull(path: string): Promise<Buffer | null> {
    try {
      return await readFile(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === FILE_NOT_FOUND) return null;

      throw error;
    }
  }

  /** Writes to a temp file first and renames it, so a crash never leaves half a file. */
  private async writeAtomic({ path, data }: { path: string; data: Buffer }): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(path + TEMP_FILE_SUFFIX, data);
    await rename(path + TEMP_FILE_SUFFIX, path);
  }

  private queued<T>(path: string, task: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(path) ?? Promise.resolve();
    const next = previous.then(task);
    // A failed change must not block the ones after it.
    this.queues.set(
      path,
      next.catch(() => undefined),
    );

    return next;
  }
}

function isVersionKind(value: string): value is VersionKind {
  return Object.values<string>(VERSION_KIND).includes(value);
}
