/**
 * HA's label colours: it stores a colour name ("indigo", "light-blue") or a hex value. These are
 * HA's default theme values, so a label looks the same here as in HA.
 */
export const LABEL_COLORS: readonly { name: string; css: string }[] = [
  { name: "red", css: "#f44336" },
  { name: "pink", css: "#e91e63" },
  { name: "purple", css: "#926bc7" },
  { name: "deep-purple", css: "#6e41ab" },
  { name: "indigo", css: "#3f51b5" },
  { name: "blue", css: "#2196f3" },
  { name: "light-blue", css: "#03a9f4" },
  { name: "cyan", css: "#00bcd4" },
  { name: "teal", css: "#009688" },
  { name: "green", css: "#4caf50" },
  { name: "light-green", css: "#8bc34a" },
  { name: "lime", css: "#cddc39" },
  { name: "yellow", css: "#ffeb3b" },
  { name: "amber", css: "#ffc107" },
  { name: "orange", css: "#ff9800" },
  { name: "deep-orange", css: "#ff6f22" },
  { name: "brown", css: "#795548" },
  { name: "light-grey", css: "#bdbdbd" },
  { name: "grey", css: "#9e9e9e" },
  { name: "dark-grey", css: "#606060" },
  { name: "blue-grey", css: "#607d8b" },
];

/** Names HA also accepts but that follow the user's theme; shown in HA's default values. */
const THEME_COLORS: Record<string, string> = {
  primary: "#03a9f4",
  accent: "#ff9800",
  disabled: "#bdbdbd",
  black: "#000000",
  white: "#ffffff",
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** The CSS colour of a label; null for none or a name HA does not know. */
export function labelColorCss(color: string | null): string | null {
  if (!color) return null;
  if (HEX_COLOR.test(color)) return color;

  return LABEL_COLORS.find((item) => item.name === color)?.css ?? THEME_COLORS[color] ?? null;
}

/** A colour no label has yet, so a new label is told apart at a glance; else the first. */
export function freeLabelColor(usedColors: readonly (string | null)[]): string {
  const used = new Set(usedColors);
  const free = LABEL_COLORS.find((item) => !used.has(item.name)) ?? LABEL_COLORS[0];

  return free?.name ?? "blue";
}
