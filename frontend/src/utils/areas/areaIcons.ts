/** Icons to pick for an area (HA format), with the key of their label in `areas.icons`. */
export const AREA_ICONS = [
  { icon: "mdi:sofa", label: "living" },
  { icon: "mdi:bed", label: "sleeping" },
  { icon: "mdi:stove", label: "kitchen" },
  { icon: "mdi:shower", label: "bath" },
  { icon: "mdi:desk", label: "office" },
  { icon: "mdi:teddy-bear", label: "kids" },
  { icon: "mdi:door", label: "hallway" },
  { icon: "mdi:stairs", label: "stairs" },
  { icon: "mdi:garage", label: "garage" },
  { icon: "mdi:flower", label: "garden" },
  { icon: "mdi:balcony", label: "terrace" },
  { icon: "mdi:tools", label: "utility" },
  { icon: "mdi:home-outline", label: "other" },
] as const;

export const DEFAULT_AREA_ICON = "mdi:home-outline";

/** Words in a name (German and English) that point to an icon; first match wins. */
const ICON_HINTS: readonly [RegExp, string][] = [
  [/schlaf|bed/, "mdi:bed"],
  [/küche|kueche|kitchen/, "mdi:stove"],
  [/bad|dusche|wc|toilette|bath|shower/, "mdi:shower"],
  [/büro|buero|arbeit|office|study/, "mdi:desk"],
  [/kind|kids|nursery/, "mdi:teddy-bear"],
  [/flur|diele|eingang|hall|entrance/, "mdi:door"],
  [/treppe|stair/, "mdi:stairs"],
  [/garage|carport/, "mdi:garage"],
  [/garten|hof|garden|yard/, "mdi:flower"],
  [/terrasse|balkon|terrace|balcony|patio/, "mdi:balcony"],
  [/keller|technik|hwr|heiz|basement|utility/, "mdi:tools"],
  [/wohn|ess|living|dining|lounge/, "mdi:sofa"],
];

/**
 * A first guess for a new area's icon; the user can pick another.
 *
 * @example guessAreaIcon("Schlafzimmer") // "mdi:bed"
 */
export function guessAreaIcon(name: string): string {
  const lower = name.toLocaleLowerCase();

  return ICON_HINTS.find(([pattern]) => pattern.test(lower))?.[1] ?? DEFAULT_AREA_ICON;
}
