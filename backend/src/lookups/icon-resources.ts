import type { HaLovelaceResource } from "../ha/ha.types";

/** Only scripts can register icons; stylesheets and old HTML imports cannot. */
const SCRIPT_TYPES = new Set(["module", "js"]);

/**
 * The dashboard resources that look like icon packs: scripts whose file name says "icon"
 * (custom-brand-icons.js, hass-hue-icons.js). HomeAce Studio loads these itself when HA has not
 * loaded them yet (HA loads resources only once a dashboard was open). Cards and other resources
 * are never loaded, so nothing but icons runs in HomeAce Studio.
 */
export function iconResourceUrls(resources: readonly HaLovelaceResource[]): string[] {
  const urls = resources
    .filter((resource) => SCRIPT_TYPES.has(resource.type))
    .map((resource) => resource.url)
    .filter((url) => fileNameOf(url).toLowerCase().includes("icon"));

  return [...new Set(urls)];
}

/** "/local/community/custom-brand-icons/custom-brand-icons.js?v=1" → "custom-brand-icons.js". */
function fileNameOf(url: string): string {
  const path = url.split(/[?#]/)[0] ?? "";

  return path.slice(path.lastIndexOf("/") + 1);
}
