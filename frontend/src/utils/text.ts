const PLACEHOLDER = /\{(\w+)\}/g;

export type FillPlaceholdersOptions = {
  /** e.g. "Die Kategorie „{path}“ gibt es schon." */
  template: string;
  /** Values by placeholder name; missing ones stay as written. */
  params: Record<string, string | number>;
};

/**
 * Fills `{name}` placeholders in a catalog text.
 *
 * @example fillPlaceholders({ template: "Hallo {name}", params: { name: "Tim" } }) // "Hallo Tim"
 */
export function fillPlaceholders({ template, params }: FillPlaceholdersOptions): string {
  return template.replace(PLACEHOLDER, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
}

const MDI_PREFIX = "mdi:";

/**
 * Turns an HA icon name into the CSS class of the MDI font.
 *
 * @param icon - e.g. "mdi:lightbulb-outline"; other icon sets (e.g. "hass:") are not bundled.
 * @returns "mdi-lightbulb-outline", or null when the icon cannot be shown with the MDI font.
 */
export function mdiIconClass(icon: string | null): string | null {
  if (!icon?.startsWith(MDI_PREFIX)) return null;

  return `mdi-${icon.slice(MDI_PREFIX.length)}`;
}
