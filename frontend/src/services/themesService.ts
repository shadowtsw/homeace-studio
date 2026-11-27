import type { ThemeFileValue } from "@/core/themes/themeFormat";

import { apiFetch, apiPost, apiSend } from "./api";

/**
 * Own themes of the HA user (docs/api.md). Every answer is `unknown` on purpose: the theme store
 * checks it again with the same rules as an imported file (readOwnThemes).
 */
export function fetchOwnThemes(): Promise<unknown> {
  return apiFetch<unknown>({ path: "/themes" });
}

/** Stores a checked theme; the backend checks it again and answers with its id and the list. */
export function createOwnTheme(theme: ThemeFileValue): Promise<unknown> {
  return apiPost<unknown>({ path: "/themes", body: { theme } });
}

/** Answers with the list without it. */
export function deleteOwnTheme(id: string): Promise<unknown> {
  return apiFetch<unknown>({
    path: `/themes/${encodeURIComponent(id)}`,
    options: { method: "DELETE" },
  });
}

/** Replaces an own theme (the editor saved it); answers with the whole list. */
export function updateOwnTheme({
  id,
  theme,
}: {
  id: string;
  theme: ThemeFileValue;
}): Promise<unknown> {
  return apiSend<unknown>({
    method: "PUT",
    path: `/themes/${encodeURIComponent(id)}`,
    body: { theme },
  });
}
