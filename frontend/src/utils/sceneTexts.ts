import { formatNumber, formatWithUnit } from "@/utils/formatNumber";
import { readControls, type SceneValue } from "@/utils/sceneValues";

/** Shown until HA's unit is known; HA's own default. */
export const DEFAULT_TEMPERATURE_UNIT = "°C";

/** vue-i18n's `t` and `te`, as far as the scene texts need them. */
type Translate = {
  t: (key: string, params?: Record<string, unknown>) => string;
  te: (key: string) => boolean;
};

/** The words of the "gerade:" line, already in the UI language. */
export type SceneLineTexts = {
  on: string;
  off: string;
  open: string;
  closed: string;
  /** "40 % offen" for an already formatted "40". */
  openPercent: (percent: string) => string;
  /** "25 %" in German, "25%" in English, for an already formatted "25". */
  percent: (value: string) => string;
  /** "heizen" for "heat"; unknown modes as HA names them. */
  hvacMode: (mode: string) => string;
};

/** The texts of the "gerade:" line in the current UI language. */
export function sceneLineTexts({ t, te }: Translate): SceneLineTexts {
  return {
    on: t("scene.on"),
    off: t("scene.off"),
    open: t("scene.open"),
    closed: t("scene.closed"),
    openPercent: (percent) => t("scene.openPercent", { percent }),
    percent: (value) => t("common.percent", { value }),
    hvacMode: (mode) => (te(`scene.hvac.${mode}`) ? t(`scene.hvac.${mode}`) : mode),
  };
}

/**
 * The "gerade:" line of a device in the scene editor: "an · 25 %", "40 % offen",
 * "heizen · 21,5 °C"; "–" without a state. Numbers follow the UI language, a temperature HA's unit.
 *
 * @param options.unit - The unit HA shows temperatures in ("°C" or "°F"); °C until it is known.
 */
export function describeSceneValue({
  domain,
  value,
  unit = DEFAULT_TEMPERATURE_UNIT,
  locale,
  texts,
}: {
  domain: string;
  value: SceneValue | null;
  unit?: string;
  locale: string;
  texts: SceneLineTexts;
}): string {
  if (!value || value.state === undefined) return "–";
  const read = readControls({ domain, value });

  if (domain === "cover") {
    if (read.position === 0) return texts.closed;
    return read.position === 100
      ? texts.open
      : texts.openPercent(formatNumber({ value: read.position ?? 0, locale }));
  }
  if (domain === "climate") {
    const mode = texts.hvacMode(String(value.state));
    return read.temperature === null || value.state === "off"
      ? mode
      : `${mode} · ${formatWithUnit({ value: read.temperature, unit, locale, percent: texts.percent })}`;
  }
  if (read.on === null) return String(value.state);
  if (!read.on) return texts.off;

  return domain === "light" && read.brightness !== null
    ? `${texts.on} · ${texts.percent(formatNumber({ value: read.brightness, locale }))}`
    : texts.on;
}
