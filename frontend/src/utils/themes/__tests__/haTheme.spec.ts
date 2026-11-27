import { describe, expect, it } from "vitest";

import { mixColors } from "@/core/themes/color";
import { STANDARD_COLORS } from "@/core/themes/themeFormat";
import {
  HA_THEME_ID,
  readHaTheme,
  rgbaFromCanvasColor,
  type CssColorParser,
  type HaPage,
} from "@/utils/themes/haTheme";

/** HA's light default colours. */
const HA_LIGHT = {
  "--primary-background-color": "#fafafa",
  "--card-background-color": "#ffffff",
  "--primary-text-color": "#212121",
  "--primary-color": "#03a9f4",
};
/** HA's dark default colours. */
const HA_DARK = {
  "--primary-background-color": "#111111",
  "--card-background-color": "#1c1c1c",
  "--primary-text-color": "#e1e1e1",
  "--primary-color": "#03a9f4",
};

/** Stands in for the canvas: plain hex and rgba() only, like the canvas gives them back. */
const parse: CssColorParser = (value) => rgbaFromCanvasColor(value.trim().toLowerCase());

/** HA's page with these CSS variables and, if given, `hass.themes.theme`. */
function haPage({
  variables,
  themeName,
}: {
  variables: Record<string, string>;
  themeName?: unknown;
}): HaPage {
  const homeAssistant = { hass: { themes: { theme: themeName } } } as unknown as Element;
  return {
    getComputedStyle: () => ({ getPropertyValue: (name: string) => variables[name] ?? "" }),
    document: {
      documentElement: {} as Element,
      querySelector: (selectors: string) => (selectors === "home-assistant" ? homeAssistant : null),
    },
  };
}

describe("rgbaFromCanvasColor", () => {
  it("reads what a canvas gives back", () => {
    expect(rgbaFromCanvasColor("#0a0b0c")).toEqual({ red: 10, green: 11, blue: 12, alpha: 1 });
    expect(rgbaFromCanvasColor("rgba(1, 2, 3, 0.25)")).toEqual({
      red: 1,
      green: 2,
      blue: 3,
      alpha: 0.25,
    });
  });

  it("anything else is no colour", () => {
    expect(rgbaFromCanvasColor("red")).toBeNull();
    expect(rgbaFromCanvasColor("url(javascript:alert(1))")).toBeNull();
    expect(rgbaFromCanvasColor("")).toBeNull();
  });
});

describe("readHaTheme", () => {
  it("outside the panel there is no HA theme", () => {
    expect(readHaTheme({ page: null, parse })).toBeNull();
  });

  it("takes HA's four colours; the flow colours keep their families", () => {
    const theme = readHaTheme({ page: haPage({ variables: HA_LIGHT }), parse });

    expect(theme?.id).toBe(HA_THEME_ID);
    expect(theme?.followsHa).toBe(true);
    expect(theme?.dark).toBeNull();
    expect(theme?.light).toEqual({
      background: "#fafafa",
      surface: "#ffffff",
      text: "#212121",
      accent: "#03a9f4",
      flowWhen: STANDARD_COLORS.light.flowWhen,
      flowIf: STANDARD_COLORS.light.flowIf,
      flowThen: STANDARD_COLORS.light.flowThen,
    });
  });

  it("a dark HA page gives the dark version only", () => {
    const theme = readHaTheme({ page: haPage({ variables: HA_DARK }), parse });

    expect(theme?.light).toBeNull();
    expect(theme?.dark?.background).toBe("#111111");
    expect(theme?.dark?.flowThen).toBe(STANDARD_COLORS.dark.flowThen);
  });

  it("surfaces fall back to HA's other surface colours, then to the background", () => {
    const { "--card-background-color": _card, ...withoutCard } = HA_LIGHT;
    const secondary = { ...withoutCard, "--secondary-background-color": "#eeeeee" };

    expect(readHaTheme({ page: haPage({ variables: secondary }), parse })?.light?.surface).toBe(
      "#eeeeee",
    );
    expect(readHaTheme({ page: haPage({ variables: withoutCard }), parse })?.light?.surface).toBe(
      "#fafafa",
    );
  });

  it("a see-through colour is mixed onto HA's background", () => {
    const variables = {
      ...HA_DARK,
      "--primary-background-color": "#000000",
      "--card-background-color": "rgba(255, 255, 255, 0.5)",
    };
    const theme = readHaTheme({ page: haPage({ variables }), parse });

    expect(theme?.dark?.surface).toBe(
      mixColors({ color: "#ffffff", other: "#000000", weight: 0.5 }),
    );
  });

  it("without a readable background, text or accent there is no HA theme", () => {
    for (const name of ["--primary-background-color", "--primary-text-color", "--primary-color"]) {
      const variables = { ...HA_LIGHT, [name]: "url(javascript:alert(1))" };

      expect(readHaTheme({ page: haPage({ variables }), parse })).toBeNull();
    }
  });

  it("names HA's theme, cleaned; HA's own default has no name", () => {
    const named = haPage({ variables: HA_LIGHT, themeName: "Nord\u0000 Dark" });
    const standard = haPage({ variables: HA_LIGHT, themeName: "default" });
    const odd = haPage({ variables: HA_LIGHT, themeName: { toString: () => "x" } });

    expect(readHaTheme({ page: named, parse })?.haThemeName).toBe("Nord Dark");
    expect(readHaTheme({ page: standard, parse })?.haThemeName).toBeNull();
    expect(readHaTheme({ page: odd, parse })?.haThemeName).toBeNull();
  });
});
