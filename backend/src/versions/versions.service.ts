import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";

import { apiError } from "src/common/api/api-response";
import { MESSAGE_ID } from "src/messages/message-ids";
import { HaConnectionService } from "../ha/ha-connection.service";
import type { HaEvent } from "../ha/ha.types";
import type { VersionTargetRepository } from "./repositories/version-target.repository";
import type { VersionsRepository } from "./repositories/versions.repository";
import {
  addVersion,
  applyRenames,
  closeOpenVersion,
  isOpen,
  nameVersion,
  sameConfig,
} from "./version-history";
import {
  CALL_SERVICE_EVENT,
  COMPARE_CONCURRENCY,
  MAX_NAMED_VERSIONS,
  RELOAD_DOMAINS,
  RELOAD_EVENTS,
  RELOAD_SERVICE,
  RELOAD_SETTLE_MS,
  VERSION_TARGET_REPOSITORY,
  DAY_MS,
  TRASH_DAYS,
  VERSIONS_CLOCK,
  VERSIONS_REPOSITORY,
} from "./versions.constants";
import {
  VERSION_KIND,
  VERSION_SOURCE,
  type DeletedWhere,
  type EntityRename,
  type VersionKind,
  type Version,
  type VersionHistory,
  type VersionRef,
  type VersionUser,
} from "./versions.model";

/** How long a save in HomeAce Studio keeps the compare after HA's reload from calling it "outside". */
const OWN_SAVE_GRACE_MS = 15_000;

/** What the UI gets: the versions, oldest first, and which one is still open. */
export type VersionsView = {
  ref: VersionRef;
  versions: Version[];
  /** The version later saves in HomeAce Studio still join, if any. */
  openVersionId: string | null;
};

/** An entry in the trash, for "Kürzlich gelöscht". */
export type TrashItem = {
  kind: VersionKind;
  key: string;
  /** The entity ID it had. */
  entityId: string;
  name: string;
  deletedAt: string;
  where: DeletedWhere;
  /** Days until it is removed for good. */
  daysLeft: number;
  versionCount: number;
};

export type RestoreResult = VersionsView & {
  /** Entity IDs that were renamed since that version and were replaced by their current ones. */
  renamed: EntityRename[];
};

/**
 * Keeps earlier versions of automations, scripts and scenes ("Git light"). A version is taken when
 * HomeAce Studio saves, when HA reports a reload and the stored config changed (HA's editor, a YAML
 * file, another tool), and on start for changes while HomeAce Studio was not running.
 *
 * Versions hold whole configs, so they are only reachable through the app's own API, never through
 * the AI access (MCP).
 */
@Injectable()
export class VersionsService implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(VersionsService.name);
  /** Storage keys HomeAce Studio just saved, until this time (epoch ms). */
  private readonly ownSaves = new Map<string, number>();
  private compareTimer: NodeJS.Timeout | null = null;
  private comparing: Promise<void> = Promise.resolve();

  constructor(
    @Inject(VERSIONS_REPOSITORY) private readonly versions: VersionsRepository,
    @Inject(VERSION_TARGET_REPOSITORY) private readonly target: VersionTargetRepository,
    @Inject(VERSIONS_CLOCK) private readonly now: () => number,
    private readonly ha: HaConnectionService,
  ) {}

  onModuleInit(): void {
    const handler = (event: HaEvent): void => {
      if (isReload(event)) this.scheduleCompare();
    };
    for (const eventType of [...RELOAD_EVENTS, CALL_SERVICE_EVENT]) {
      this.ha.subscribe({ eventType, handler });
    }
  }

  /** Catches what changed while HomeAce Studio was not running; never holds up the start. */
  onApplicationBootstrap(): void {
    void this.compareAll(VERSION_SOURCE.offline);
  }

  onModuleDestroy(): void {
    if (this.compareTimer) clearTimeout(this.compareTimer);
  }

  /**
   * Takes a version after HomeAce Studio saved an entry: the config as HA stored it, so it never
   * differs from what the next compare reads. Never throws; a failure only costs the version.
   */
  async recordSaved({ entityId, user }: { entityId: string; user?: VersionUser }): Promise<void> {
    try {
      const ref = await this.target.resolveRef(entityId);
      if (!ref) return;

      this.ownSaves.set(refId(ref), this.now() + OWN_SAVE_GRACE_MS);
      const stored = await this.target.loadStoredConfig(ref);
      if (!stored) return;

      await this.versions.update({
        ref,
        change: (history) =>
          addVersion({
            history: withRef({ history, ref }),
            config: stored,
            source: VERSION_SOURCE.homeace,
            now: this.now(),
            newId: randomUUID,
            user,
          }),
      });
    } catch (error) {
      this.logger.warn(`No version for ${entityId}: ${String(error)}`);
    }
  }

  /** Remembers a renamed entity ID, so older versions can be brought back with the new one. */
  async recordRename({ from, to }: { from: string; to: string }): Promise<void> {
    try {
      await this.versions.addRename({ from, to, at: new Date(this.now()).toISOString() });
    } catch (error) {
      this.logger.warn(`Rename ${from} → ${to} not kept for versions: ${String(error)}`);
    }
  }

  /**
   * The versions of an entry. An entry HomeAce Studio has not seen yet gets its first version now.
   *
   * @throws NotFoundException `VERSIONS_UNSUPPORTED` for entries that keep no versions.
   */
  async list(entityId: string): Promise<VersionsView> {
    const ref = await this.requireRef(entityId);
    const stored = await this.versions.read(ref);
    if (stored && stored.versions.length > 0) return this.view(withRef({ history: stored, ref }));

    const config = await this.target.loadStoredConfig(ref);
    if (!config) throw unsupported(entityId);

    const history = await this.versions.update({
      ref,
      change: (current) =>
        addVersion({
          history: withRef({ history: current, ref }),
          config,
          source: VERSION_SOURCE.base,
          now: this.now(),
          newId: randomUUID,
        }),
    });
    return this.view(history);
  }

  /**
   * Gives a version a name (kept beyond the limit), renames it, or takes the name away (null).
   *
   * @throws NotFoundException `VERSION_NOT_FOUND`; BadRequestException `VERSION_NAMES_FULL`.
   */
  async name({
    entityId,
    versionId,
    name,
  }: {
    entityId: string;
    versionId: string;
    name: string | null;
  }): Promise<VersionsView> {
    const ref = await this.requireRef(entityId);
    // Filled inside the queued change, read after it; an object, so TypeScript does not narrow it.
    const outcome: { failure: "notFound" | "tooManyNamed" | null } = { failure: null };

    const history = await this.versions.update({
      ref,
      change: (current) => {
        const result = nameVersion({ history: current, versionId, name });
        if (result.ok) return result.history;

        outcome.failure = result.reason;
        return current;
      },
    });

    if (outcome.failure === "notFound") throw versionNotFound(versionId);
    if (outcome.failure === "tooManyNamed") {
      throw new BadRequestException(
        apiError({
          message: MESSAGE_ID.versionNamesFull,
          details: { params: { max: MAX_NAMED_VERSIONS } },
        }),
      );
    }
    return this.view(history);
  }

  /** Closes the open version, so the next save in HomeAce Studio starts a new one. */
  async closeOpen(entityId: string): Promise<VersionsView> {
    const ref = await this.requireRef(entityId);
    const history = await this.versions.update({ ref, change: closeOpenVersion });

    return this.view(history);
  }

  /**
   * Brings an earlier version back: writes it to HA and keeps it as a new version, so the state
   * before stays in the list and bringing back can be undone. Entity IDs renamed since then are
   * replaced by their current ones.
   *
   * @throws NotFoundException `VERSION_NOT_FOUND`.
   */
  async restore({
    entityId,
    versionId,
    user,
  }: {
    entityId: string;
    versionId: string;
    user?: VersionUser;
  }): Promise<RestoreResult> {
    const ref = await this.requireRef(entityId);
    const stored = await this.versions.read(ref);
    const version = stored?.versions.find((item) => item.id === versionId);
    if (!version) throw versionNotFound(versionId);

    const renames = await this.versions.readRenames();
    const { config, applied } = applyRenames({
      config: version.config,
      renames,
      since: version.at,
    });
    // The id ties an automation or scene to its entity; it never changes, whatever the version says.
    const toSave = ref.kind === VERSION_KIND.script ? config : { ...config, id: ref.key };

    this.ownSaves.set(refId(ref), this.now() + OWN_SAVE_GRACE_MS);
    await this.target.saveStoredConfig({ ref, config: toSave });
    const savedConfig = (await this.target.loadStoredConfig(ref)) ?? toSave;

    const history = await this.versions.update({
      ref,
      change: (current) =>
        addVersion({
          history: closeOpenVersion(withRef({ history: current, ref })),
          config: savedConfig,
          source: VERSION_SOURCE.restore,
          now: this.now(),
          newId: randomUUID,
          user,
          restoredFrom: version,
        }),
    });
    this.logger.log(`Brought back version ${versionId} of ${entityId}`);

    return { ...this.view(history), renamed: applied };
  }

  /**
   * Compares every stored config with its newest version and keeps changes as versions. Runs on
   * start (`offline`) and after HA reloads (`outside`); one compare at a time.
   */
  compareAll(source: typeof VERSION_SOURCE.outside | typeof VERSION_SOURCE.offline): Promise<void> {
    const run = this.comparing.then(() => this.runCompare(source));
    this.comparing = run.catch(() => undefined);

    return run;
  }

  private scheduleCompare(): void {
    if (this.compareTimer) clearTimeout(this.compareTimer);
    this.compareTimer = setTimeout(() => {
      this.compareTimer = null;
      void this.compareAll(VERSION_SOURCE.outside);
    }, RELOAD_SETTLE_MS);
  }

  private async runCompare(
    source: typeof VERSION_SOURCE.outside | typeof VERSION_SOURCE.offline,
  ): Promise<void> {
    try {
      const since = await this.versions.readLastSeen();
      const refs = await this.target.listRefs();
      let changed = 0;

      await forEachLimited({
        items: refs,
        limit: COMPARE_CONCURRENCY,
        task: async (ref) => {
          if (await this.compareOne({ ref, source, since })) changed++;
        },
      });

      await this.sweepTrash(refs);
      await this.versions.writeLastSeen(new Date(this.now()).toISOString());
      if (changed > 0)
        this.logger.log(`Versions: ${changed} changed ${source} (${refs.length} checked)`);
    } catch (error) {
      this.logger.warn(`Versions compare failed: ${String(error)}`);
    }
  }

  /** @returns Whether a version was added. */
  private async compareOne({
    ref,
    source,
    since,
  }: {
    ref: VersionRef;
    source: typeof VERSION_SOURCE.outside | typeof VERSION_SOURCE.offline;
    since: string | null;
  }): Promise<boolean> {
    const ownUntil = this.ownSaves.get(refId(ref));
    if (ownUntil !== undefined && this.now() < ownUntil) return false;

    const config = await this.target.loadStoredConfig(ref);
    if (!config) return false;

    const stored = await this.versions.read(ref);
    const newest = stored?.versions.at(-1);
    if (newest && sameConfig(newest.config, config)) return false;

    const isFirst = !newest;
    const firstSource = isFirst ? VERSION_SOURCE.base : source;
    const offlineSince = !isFirst && source === VERSION_SOURCE.offline ? since : null;

    await this.versions.update({
      ref,
      change: (history) =>
        addVersion({
          history: withRef({ history, ref }),
          config,
          source: firstSource,
          now: this.now(),
          newId: randomUUID,
          since: offlineSince ?? undefined,
        }),
    });
    return !isFirst;
  }

  /**
   * Before HomeAce Studio deletes an entry: keeps its last config, so the trash can bring it back.
   * Never throws; returns the ref to mark as deleted afterwards (null: keeps no versions).
   */
  async prepareDelete(entityId: string): Promise<VersionRef | null> {
    try {
      const ref = await this.target.resolveRef(entityId);
      if (!ref) return null;

      const config = await this.target.loadStoredConfig(ref);
      if (config) await this.keepLatest({ ref, config });
      return ref;
    } catch (error) {
      this.logger.warn(`No trash entry prepared for ${entityId}: ${String(error)}`);
      return null;
    }
  }

  /** Puts a deleted entry into the trash, with its versions. Never throws. */
  async markDeleted({ ref, where }: { ref: VersionRef; where: DeletedWhere }): Promise<void> {
    try {
      await this.versions.update({
        ref,
        change: (history) => {
          const name = nameOf(history.versions.at(-1)?.config) ?? ref.entityId;
          const deleted = { at: new Date(this.now()).toISOString(), where, name };
          return { ...closeOpenVersion(history), deleted };
        },
      });
    } catch (error) {
      this.logger.warn(`${ref.entityId} not put into the trash: ${String(error)}`);
    }
  }

  /** Deleted entries with their versions, newest deletion first; older than TRASH_DAYS are gone. */
  async trash(): Promise<TrashItem[]> {
    const histories = await this.missingHistories(await this.target.listRefs());

    return histories
      .flatMap((history): TrashItem[] => {
        const mark = history.deleted;
        if (!mark) return [];
        const item: TrashItem = {
          kind: history.ref.kind,
          key: history.ref.key,
          entityId: history.ref.entityId,
          name: mark.name,
          deletedAt: mark.at,
          where: mark.where,
          daysLeft: this.daysLeft(mark.at),
          versionCount: history.versions.length,
        };
        return [item];
      })
      .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  }

  /**
   * Brings a deleted entry back: writes its last config to HA under the same storage key (HA then
   * gives it its entity ID again) and keeps a version "aus dem Papierkorb".
   *
   * @throws NotFoundException `TRASH_NOT_FOUND` when it is not in the trash.
   */
  async restoreFromTrash({
    kind,
    key,
    user,
  }: {
    kind: VersionKind;
    key: string;
    user?: VersionUser;
  }): Promise<{ entityId: string; name: string }> {
    const history = await this.versions.read({ kind, key });
    const last = history?.versions.at(-1);
    if (!history?.deleted || !last) {
      throw new NotFoundException(
        apiError({ message: MESSAGE_ID.trashNotFound, details: { params: { key } } }),
      );
    }

    const ref = history.ref;
    const config = ref.kind === VERSION_KIND.script ? last.config : { ...last.config, id: ref.key };
    this.ownSaves.set(refId(ref), this.now() + OWN_SAVE_GRACE_MS);
    await this.target.saveStoredConfig({ ref, config });
    const entityId = (await this.target.waitForEntityId(ref)) ?? ref.entityId;
    const restoredRef = { ...ref, entityId };

    await this.versions.update({
      ref: restoredRef,
      change: (current) => {
        const back = addVersion({
          history: withRef({ history: current, ref: restoredRef }),
          config,
          source: VERSION_SOURCE.restore,
          now: this.now(),
          newId: randomUUID,
          user,
          fromTrash: true,
        });
        const restored = { ...back };
        delete restored.deleted;
        return restored;
      },
    });
    this.logger.log(`Brought ${entityId} back from the trash`);

    return { entityId, name: history.deleted.name };
  }

  /** Entries deleted outside HomeAce Studio go into the trash; the trash forgets after TRASH_DAYS. */
  private async sweepTrash(refs: readonly VersionRef[]): Promise<void> {
    for (const history of await this.missingHistories(refs)) {
      if (history.deleted) {
        if (this.daysLeft(history.deleted.at) <= 0) await this.versions.remove(history.ref);
        continue;
      }
      // Gone from the registry; only a missing stored config makes it "deleted" (HA may be starting).
      const stored = await this.target.loadStoredConfig(history.ref);
      if (!stored) await this.markDeleted({ ref: history.ref, where: "outside" });
    }
  }

  /** Histories of entries HA no longer lists (deleted ones, or ones HA did not report). */
  private async missingHistories(refs: readonly VersionRef[]): Promise<VersionHistory[]> {
    const known = new Set(refs.map(refId));
    const missing = (await this.versions.listKeys()).filter((key) => !known.has(refId(key)));
    const histories = await Promise.all(missing.map((key) => this.versions.read(key)));

    return histories.flatMap((history) => (history ? [history] : []));
  }

  private daysLeft(deletedAt: string): number {
    const passed = (this.now() - Date.parse(deletedAt)) / DAY_MS;
    return Math.max(0, Math.ceil(TRASH_DAYS - passed));
  }

  /** Adds the stored config as a version when it is newer than the history knows. */
  private async keepLatest({
    ref,
    config,
  }: {
    ref: VersionRef;
    config: Record<string, unknown>;
  }): Promise<void> {
    await this.versions.update({
      ref,
      change: (history) =>
        addVersion({
          history: withRef({ history, ref }),
          config,
          source: history.versions.length === 0 ? VERSION_SOURCE.base : VERSION_SOURCE.outside,
          now: this.now(),
          newId: randomUUID,
        }),
    });
  }

  private async requireRef(entityId: string): Promise<VersionRef> {
    const ref = await this.target.resolveRef(entityId);
    if (!ref) throw unsupported(entityId);

    return ref;
  }

  private view(history: VersionHistory): VersionsView {
    const newest = history.versions.at(-1);
    const openVersionId = newest && isOpen({ version: newest, now: this.now() }) ? newest.id : null;

    return { ref: history.ref, versions: history.versions, openVersionId };
  }
}

/** The history under the current entity ID (it may have been renamed since). */
function withRef({ history, ref }: { history: VersionHistory; ref: VersionRef }): VersionHistory {
  return { ...history, ref };
}

function refId(ref: Pick<VersionRef, "kind" | "key">): string {
  return `${ref.kind}:${ref.key}`;
}

function isReload(event: HaEvent): boolean {
  if (RELOAD_EVENTS.includes(event.event_type)) return true;
  if (event.event_type !== CALL_SERVICE_EVENT) return false;

  return (
    event.data.service === RELOAD_SERVICE &&
    typeof event.data.domain === "string" &&
    RELOAD_DOMAINS.includes(event.data.domain)
  );
}

async function forEachLimited<T>({
  items,
  limit,
  task,
}: {
  items: readonly T[];
  limit: number;
  task: (item: T) => Promise<void>;
}): Promise<void> {
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const item = items[next];
      next++;
      await task(item);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

function unsupported(entityId: string): NotFoundException {
  return new NotFoundException(
    apiError({ message: MESSAGE_ID.versionsUnsupported, details: { params: { entityId } } }),
  );
}

function versionNotFound(versionId: string): NotFoundException {
  return new NotFoundException(
    apiError({ message: MESSAGE_ID.versionNotFound, details: { params: { versionId } } }),
  );
}

/** The name a config gives its entry: `alias` (automations, scripts) or `name` (scenes). */
function nameOf(config: Record<string, unknown> | undefined): string | null {
  const name = config?.alias ?? config?.name;
  return typeof name === "string" && name !== "" ? name : null;
}
