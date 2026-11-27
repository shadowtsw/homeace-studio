import { describe, expect, it } from "vitest";
import { createI18n } from "vue-i18n";

import de from "@/locales/de";
import en from "@/locales/en";
import type { SceneValue } from "@/utils/sceneValues";

import { describeSceneValue, sceneLineTexts } from "../sceneTexts";

/** The "gerade:" line with the app's real texts in one language. */
function line(options: {
  locale: "de" | "en";
  domain: string;
  value: SceneValue | null;
  unit?: string;
}): string {
  const { t, te } = createI18n({
    legacy: false,
    locale: options.locale,
    messages: { de, en },
  }).global;

  return describeSceneValue({ ...options, texts: sceneLineTexts({ t, te }) });
}

const heating = { state: "heat", temperature: 21.5 };

describe("describeSceneValue", () => {
  it("shows a thermostat in HA's unit", () => {
    expect(
      line({
        locale: "de",
        domain: "climate",
        value: { state: "heat", temperature: 70 },
        unit: "°F",
      }),
    ).toBe("heizen · 70 °F");
  });

  it("shows °C, HA's default, while HA's unit is not known", () => {
    expect(line({ locale: "de", domain: "climate", value: heating })).toBe("heizen · 21,5 °C");
  });

  it("writes numbers the way the UI language does", () => {
    expect(line({ locale: "de", domain: "climate", value: heating, unit: "°C" })).toBe(
      "heizen · 21,5 °C",
    );
    expect(line({ locale: "en", domain: "climate", value: heating, unit: "°C" })).toBe(
      "heat · 21.5 °C",
    );
  });

  it("writes percent the way the UI language does", () => {
    const light = { state: "on", brightness: 64 };
    const cover = { state: "open", current_position: 40 };

    expect(line({ locale: "de", domain: "light", value: light })).toBe("an · 25 %");
    expect(line({ locale: "en", domain: "light", value: light })).toBe("on · 25%");
    expect(line({ locale: "de", domain: "cover", value: cover })).toBe("40 % offen");
    expect(line({ locale: "en", domain: "cover", value: cover })).toBe("40% open");
  });

  it("shows only the mode for a thermostat that is off, and a dash without a state", () => {
    expect(
      line({ locale: "de", domain: "climate", value: { state: "off", temperature: 20 } }),
    ).toBe("aus");
    expect(line({ locale: "de", domain: "climate", value: null })).toBe("–");
  });
});
