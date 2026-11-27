import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { formatNumber } from "@/utils/formatNumber";
import { describeSceneValue, sceneLineTexts } from "@/utils/sceneTexts";
import type { SceneValue } from "@/utils/sceneValues";

type SceneTexts = {
  /**
   * "an · 25 %", "40 % offen", "heizen · 21,5 °C" … for the "gerade:" line; "–" without a state.
   * `unit` is the unit HA shows temperatures in ("°C" or "°F"); °C until it is known.
   */
  describe: (options: { domain: string; value: SceneValue | null; unit?: string }) => string;
  /** A value the editor keeps but has no control for, e.g. `Effekt „Regenbogen“`. */
  extraText: (options: { key: string; value: unknown }) => string;
  /** A climate mode as people read it ("heizen"); unknown ones as HA names them. */
  hvacLabel: (mode: string) => string;
  /** "25 %" in German, "25%" in English, as Home Assistant writes it. */
  percentText: (value: number | string) => string;
};

/** Texts of the scene editor's device rows. */
export function useSceneTexts(): SceneTexts {
  const { t, te, locale } = useI18n();
  const lineTexts = computed(() => sceneLineTexts({ t, te }));

  function hvacLabel(mode: string): string {
    return lineTexts.value.hvacMode(mode);
  }

  function percentText(value: number | string): string {
    return lineTexts.value.percent(formatNumber({ value, locale: locale.value }));
  }

  function describe({
    domain,
    value,
    unit,
  }: {
    domain: string;
    value: SceneValue | null;
    unit?: string;
  }): string {
    return describeSceneValue({
      domain,
      value,
      unit,
      locale: locale.value,
      texts: lineTexts.value,
    });
  }

  function extraText({ key, value }: { key: string; value: unknown }): string {
    const label = te(`scene.extra.${key}`) ? t(`scene.extra.${key}`) : key;
    let shown: string;

    if (typeof value === "boolean") shown = value ? t("scene.on") : t("scene.off");
    else if (key === "percentage") shown = percentText(String(value));
    else if (key === "volume_level" && typeof value === "number") {
      shown = percentText(Math.round(value * 100));
    } else if (typeof value === "string") shown = t("common.quoted", { text: value });
    else shown = JSON.stringify(value);

    return `${label} ${shown}`;
  }

  return { describe, extraText, hvacLabel, percentText };
}
