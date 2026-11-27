import type { ThemeFileValue } from "@/core/themes/themeFormat";

import { apiFetch, apiPost } from "./api";

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
