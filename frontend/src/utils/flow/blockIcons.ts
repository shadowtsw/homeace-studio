import type { BlockSection } from "@/types/editor";

const DOMAIN_SEPARATOR = ".";

/** Icon per domain of a block key ("zone.entered" → zone); covers the common ones. */
const ICON_BY_DOMAIN: Partial<Record<string, string>> = {
  zone: "mdi-map-marker-outline",
  person: "mdi-account-outline",
  button: "mdi-gesture-tap-button",
  input_button: "mdi-gesture-tap-button",
  switch: "mdi-toggle-switch-outline",
  input_boolean: "mdi-toggle-switch-outline",
  light: "mdi-lightbulb-outline",
  climate: "mdi-thermostat",
  scene: "mdi-palette-outline",
  script: "mdi-script-text-outline",
  automation: "mdi-robot-outline",
  notify: "mdi-bell-outline",
  input_text: "mdi-form-textbox",
  input_number: "mdi-ray-vertex",
  input_select: "mdi-format-list-bulleted",
  media_player: "mdi-play-network-outline",
  cover: "mdi-window-shutter",
  power: "mdi-flash-outline",
  sun: "mdi-weather-sunset",
  time: "mdi-clock-outline",
  timer: "mdi-timer-outline",
};

/** Icons of the hand-made blocks, by their kind. */
export const CLASSIC_ICON: Record<string, string> = {
  state: "mdi-swap-horizontal",
  numeric_state: "mdi-chart-line",
  time: "mdi-clock-outline",
  time_pattern: "mdi-update",
  sun: "mdi-weather-sunset",
  template: "mdi-code-braces",
  event: "mdi-broadcast",
  homeassistant: "mdi-home-assistant",
  delay: "mdi-timer-sand",
  if: "mdi-call-split",
  choose: "mdi-source-branch",
  repeat: "mdi-repeat",
  parallel: "mdi-format-align-justify",
  sequence: "mdi-format-list-numbered",
  wait: "mdi-pause-circle-outline",
  variables: "mdi-variable",
  stop: "mdi-stop-circle-outline",
  group: "mdi-set-center",
};

const ICON_BY_SECTION: Record<BlockSection, string> = {
  trigger: "mdi-flash-outline",
  condition: "mdi-filter-outline",
  action: "mdi-play-circle-outline",
};

export type IconForKeyOptions = {
  key: string;
  section: BlockSection;
};

/** Icon for a generic block: by the domain of its key, else by its section. */
export function iconForKey({ key, section }: IconForKeyOptions): string {
  const domain = key.split(DOMAIN_SEPARATOR)[0] ?? key;

  return ICON_BY_DOMAIN[domain] ?? ICON_BY_SECTION[section];
}

export function iconForSection(section: BlockSection): string {
  return ICON_BY_SECTION[section];
}
