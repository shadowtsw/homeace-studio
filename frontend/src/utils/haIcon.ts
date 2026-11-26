/** HA's standard icons (Material Design Icons) are the pack "mdi". */
export const MDI_PACK = "mdi";

/** At most this many icons in the search grid; more would only slow it down. */
export const ICON_SEARCH_LIMIT = 240;

/** An HA icon split into its pack and name: "phu:wallbox" → { pack: "phu", name: "wallbox" }. */
export type HaIconName = { pack: string; name: string };

/** Splits "pack:name"; null for an empty or malformed value (no pack, no name). */
export function parseHaIcon(icon: string | null | undefined): HaIconName | null {
  const value = icon?.trim() ?? "";
  const colon = value.indexOf(":");
  if (colon < 1 || colon === value.length - 1) return null;

  return { pack: value.slice(0, colon), name: value.slice(colon + 1) };
}

/** The selector the MDI font stylesheet uses per icon: ".mdi-lamp-outline::before". */
const MDI_RULE = /^\.mdi-([a-z0-9-]+)::?before$/;

/** A stylesheet as far as needed here; CSSStyleSheet fits, and so does a test double. */
type RuleSource = { readonly cssRules: ArrayLike<object> };

/**
 * The names of all standard icons, read from the MDI font stylesheet the app already loads, so the
 * search needs no list of its own and always matches the font. Sheets that cannot be read (other
 * origins) are skipped.
 */
export function mdiNamesFromStyleSheets(sheets: Iterable<RuleSource>): string[] {
  const names = new Set<string>();

  for (const sheet of sheets) {
    let rules: ArrayLike<object>;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      const selector = (rule as { selectorText?: string }).selectorText ?? "";
      const match = MDI_RULE.exec(selector);
      if (match?.[1]) names.add(match[1]);
    }
  }

  return [...names].sort();
}

export type IconSearchOptions = {
  /** Every icon as "pack:name", pack icons first. */
  icons: readonly string[];
  query: string;
  /** A pack to show only its icons, or null for all. */
  pack: string | null;
};

/** The icons whose full name holds every word of the query, in the given order. */
export function searchIcons({ icons, query, pack }: IconSearchOptions): string[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const prefix = pack ? `${pack}:` : "";

  return icons.filter(
    (icon) => icon.startsWith(prefix) && words.every((word) => icon.includes(word)),
  );
}
