import type { IncomingHttpHeaders } from "node:http";

/** The Home Assistant user who opened HomeAce Studio. */
export type HaUser = {
  /** HA's user ID; stable, also after renaming the user. */
  id: string;
  /** The display name, for "gilt für <Name> auf allen Geräten". */
  name: string;
};

/**
 * Headers HA's Supervisor adds to every request that comes through ingress, i.e. when HomeAce Studio
 * is opened from HA's sidebar. Port 8099 is not published, so requests only arrive that way. Opened
 * locally or in the demo, they are missing.
 */
export const INGRESS_USER_HEADER = {
  id: "x-remote-user-id",
  name: "x-remote-user-name",
  displayName: "x-remote-user-display-name",
} as const;

/** One header value; Node gives repeated headers as a list. */
function headerValue(headers: IncomingHttpHeaders, name: string): string {
  const value = headers[name];
  const firstValue = Array.isArray(value) ? value[0] : value;

  return firstValue?.trim() ?? "";
}

/**
 * The HA user behind a request, from the ingress headers.
 *
 * @param headers - The request headers (lower-case names, as Node gives them).
 * @returns The user, or null without a user ID (not opened through HA). Without a display name, the
 *   login name is used, else the ID.
 */
export function haUserFrom(headers: IncomingHttpHeaders): HaUser | null {
  const id = headerValue(headers, INGRESS_USER_HEADER.id);
  if (!id) return null;

  const displayName = headerValue(headers, INGRESS_USER_HEADER.displayName);
  const loginName = headerValue(headers, INGRESS_USER_HEADER.name);

  return { id, name: displayName || loginName || id };
}
