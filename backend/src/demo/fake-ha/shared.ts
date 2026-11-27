import { CATEGORY_SCOPE, type CategoryScope } from "../../categories/categories.constants";
import { HELPER_DOMAINS } from "../../entries/entries.constants";
import type { HaEvent } from "../../ha/ha.types";

/** A WebSocket payload or stored config; HA's payloads are untyped. */
export type Payload = Record<string, unknown>;
export type EventHandler = (event: HaEvent) => void;
export type FlowKind = "automation" | "script";

export const HTTP_BAD_REQUEST = 400;
export const HTTP_NOT_FOUND = 404;
export const DOMAIN_SEPARATOR = ".";

/** HA's error codes for the cases the demo reproduces. */
export const ERROR_CODE = {
  notFound: "not_found",
  invalid: "invalid_format",
  unknownCommand: "unknown_command",
} as const;

/** A payload value as text; HA's payloads are untyped. */
export function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function domainOf(entityId: string): string {
  return entityId.split(DOMAIN_SEPARATOR)[0] ?? "";
}

/** "Gute Nacht" → "gute_nacht", like HA builds object ids from names. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "unnamed"
  );
}

export function scopeOf({
  entityId,
  configEntryId,
}: {
  entityId: string;
  configEntryId: string | null;
}): CategoryScope | null {
  const domain = domainOf(entityId);

  if (domain === "automation" || domain === "script" || domain === "scene") return domain;
  if (HELPER_DOMAINS.has(domain) || configEntryId) return CATEGORY_SCOPE.helpers;

  return null;
}

export function now(): string {
  return new Date().toISOString();
}

export function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}
