import { apiFetch } from "./api";

/** One icon of a pack: an SVG path, as HA's frontend expects it from `getIcon`. */
export type PackIcon = { path: string; viewBox?: string };

/**
 * How icon packs (custom-brand-icons, hass-hue-icons …) register in HA's frontend:
 * `window.customIcons[prefix] = { getIcon, getIconList }`. Not an official HA API, see
 * docs/ha-compatibility.md.
 */
type IconSet = {
  getIcon: (name: string) => Promise<PackIcon | undefined>;
  getIconList?: () => Promise<{ name: string }[]>;
};

type IconWindow = Window & { customIcons?: Record<string, IconSet> };

/** Dashboard resources that look like icon packs (see backend icon-resources.ts). */
export function fetchIconPackResources(): Promise<string[]> {
  return apiFetch<string[]>({ path: "/icon-packs/resources" });
}

/** HA's page around HomeAce Studio when it was opened from the sidebar, else null. */
export function haWindow(): IconWindow | null {
  try {
    const parent = window.parent as IconWindow;
    if (parent === window) return null;

    return parent.document.querySelector("home-assistant") ? parent : null;
  } catch {
    // Another origin (opened through its own port): no access, and no packs there anyway
    return null;
  }
}

/** Every registered pack, from HA's page and from HomeAce's own window (packs it loaded itself). */
export function iconSets(): Record<string, IconSet> {
  const sets: Record<string, IconSet> = {};
  for (const source of [haWindow(), window as IconWindow]) Object.assign(sets, source?.customIcons);
  // "mdi" are HA's own icons; a pack may not replace them
  delete sets.mdi;

  return sets;
}

/** Loads the pack scripts into HomeAce's own window; one that fails is skipped. */
export async function loadIconScripts(urls: readonly string[]): Promise<void> {
  await Promise.allSettled(urls.map((url) => import(/* @vite-ignore */ url)));
}
