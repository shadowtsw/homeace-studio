import { useI18n } from "vue-i18n";

import { readControls, type SceneValue } from "@/utils/sceneValues";

type SceneTexts = {
  /** "an · 25 %", "40 % offen", "heizen · 22 °C" … for the "gerade:" line; "–" without a state. */
  describe: (options: { domain: string; value: SceneValue | null }) => string;
  /** A value the editor keeps but has no control for, e.g. `Effekt „Regenbogen“`. */
  extraText: (options: { key: string; value: unknown }) => string;
  /** A climate mode as people read it ("heizen"); unknown ones as HA names them. */
  hvacLabel: (mode: string) => string;
};

/** Texts of the scene editor's device rows. */
export function useSceneTexts(): SceneTexts {
  const { t, te } = useI18n();

  function hvacLabel(mode: string): string {
    return te(`scene.hvac.${mode}`) ? t(`scene.hvac.${mode}`) : mode;
  }

  function describe({ domain, value }: { domain: string; value: SceneValue | null }): string {
    if (!value || value.state === undefined) return "–";
    const read = readControls({ domain, value });

    if (domain === "cover") {
      if (read.position === 0) return t("scene.closed");
      return read.position === 100
        ? t("scene.open")
        : t("scene.openPercent", { percent: read.position });
    }
    if (domain === "climate") {
      const mode = hvacLabel(String(value.state));
      return read.temperature === null || value.state === "off"
        ? mode
        : `${mode} · ${read.temperature} °C`;
    }
    if (read.on === null) return String(value.state);
    if (!read.on) return t("scene.off");

    return domain === "light" && read.brightness !== null
      ? `${t("scene.on")} · ${read.brightness} %`
      : t("scene.on");
  }

  function extraText({ key, value }: { key: string; value: unknown }): string {
    const label = te(`scene.extra.${key}`) ? t(`scene.extra.${key}`) : key;
    let shown: string;

    if (typeof value === "boolean") shown = value ? t("scene.on") : t("scene.off");
    else if (key === "percentage") shown = `${String(value)} %`;
    else if (key === "volume_level" && typeof value === "number") {
      shown = `${Math.round(value * 100)} %`;
    } else if (typeof value === "string") shown = t("common.quoted", { text: value });
    else shown = JSON.stringify(value);

    return `${label} ${shown}`;
  }

  return { describe, extraText, hvacLabel };
}
