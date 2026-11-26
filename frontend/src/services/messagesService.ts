import { apiFetch } from "./api";

/** The backend's text catalog of one language: message ID → text. */
export function fetchMessageCatalog(language: string): Promise<Record<string, string>> {
  return apiFetch<Record<string, string>>({
    path: `/messages?lang=${encodeURIComponent(language)}`,
  });
}
