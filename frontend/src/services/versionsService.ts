import { apiFetch, apiPost, apiSend } from "./api";

/** Where a version came from (backend: versions.model.ts). `ai` is reserved, nothing writes it yet. */
export type VersionSource = "base" | "homeace" | "outside" | "offline" | "restore" | "ai";

export type Version = {
  id: string;
  /** ISO 8601; for an open version when its first change was saved. */
  at: string;
  source: VersionSource;
  /** The whole config as HA stores it. */
  config: Record<string, unknown>;
  user?: { id: string; name: string };
  /** A name the user gave it; named versions are kept beyond the limit. */
  name?: string;
  /** Epoch ms until which saves in HomeAce Studio still join it. */
  openUntil?: number;
  saves?: number;
  /** `offline`: when HomeAce Studio last saw the config before. */
  since?: string;
  /** `restore`: the version that was brought back. */
  restoredFrom?: { id: string; at: string; name?: string };
  /** `restore`: the whole entry came back from the trash. */
  fromTrash?: boolean;
};

export type VersionKind = "automation" | "script" | "scene";

export type VersionsView = {
  ref: { kind: VersionKind; key: string; entityId: string };
  /** Oldest first. */
  versions: Version[];
  openVersionId: string | null;
};

export type RestoredVersions = VersionsView & {
  /** Entity IDs renamed since that version, replaced by their current ones. */
  renamed: { from: string; to: string }[];
};

const base = (entityId: string): string => `/versions/${encodeURIComponent(entityId)}`;

export function fetchVersions(entityId: string): Promise<VersionsView> {
  return apiFetch<VersionsView>({ path: base(entityId) });
}

export type NameVersionOptions = { entityId: string; versionId: string; name: string | null };

/** Names, renames or (null) unnames a version. */
export function nameVersion({
  entityId,
  versionId,
  name,
}: NameVersionOptions): Promise<VersionsView> {
  return apiSend<VersionsView>({
    method: "PUT",
    path: `${base(entityId)}/${encodeURIComponent(versionId)}/name`,
    body: { name },
  });
}

/** Closes the open version, so the next save starts a new one. */
export function closeOpenVersion(entityId: string): Promise<VersionsView> {
  return apiPost<VersionsView>({ path: `${base(entityId)}/close` });
}

export type RestoreVersionOptions = { entityId: string; versionId: string };

/** Writes an earlier version back to HA; the state before stays as a version. */
export function restoreVersion({
  entityId,
  versionId,
}: RestoreVersionOptions): Promise<RestoredVersions> {
  return apiPost<RestoredVersions>({
    path: `${base(entityId)}/${encodeURIComponent(versionId)}/restore`,
  });
}

/** An entry in the trash ("Kürzlich gelöscht"), kept for 30 days with its versions. */
export type TrashItem = {
  kind: VersionKind;
  key: string;
  entityId: string;
  name: string;
  deletedAt: string;
  where: "homeace" | "outside";
  daysLeft: number;
  versionCount: number;
};

export function fetchTrash(): Promise<TrashItem[]> {
  return apiFetch<TrashItem[]>({ path: "/versions/trash" });
}

export type RestoreFromTrashOptions = { kind: VersionKind; key: string };

/** Creates the entry in HA again, under its old ID; the answer has the entity ID HA gave it. */
export function restoreFromTrash({
  kind,
  key,
}: RestoreFromTrashOptions): Promise<{ entityId: string; name: string }> {
  return apiPost<{ entityId: string; name: string }>({
    path: `/versions/trash/${encodeURIComponent(kind)}/${encodeURIComponent(key)}/restore`,
  });
}
