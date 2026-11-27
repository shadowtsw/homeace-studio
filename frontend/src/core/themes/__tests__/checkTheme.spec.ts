// Copied from core/themes/__tests__/checkTheme.spec.ts by scripts/sync-core.mjs. Edit it there and run the script.
import { describe, expect, it } from "vitest";

import { checkThemeText, checkThemeValue, cleanText, type CheckResult } from "../checkTheme";
import { MAX_THEME_TEXT_LENGTH, STANDARD_COLORS, themeFileText } from "../themeFormat";

const GOOD_FILE = {
  "homeace-theme": 1,
  name: "Abendrot",
  author: "Sabine",
  light: {
    background: "#fbf6f1",
    surface: "#ffffff",
    text: "#2b211c",
    accent: "#c2552d",
    flowWhen: "#b0620a",
    flowIf: "#0d7569",
    flowThen: "#3451d1",
  },
};

/** The dummy's "verdächtige Datei": every trick the gate must stop. */
const SUSPICIOUS_TEXT = `{
  "homeace-theme": 1,
  "name": "<img src=x onerror=alert('hallo')>Abendrot‮gnuhcslaf",
  "author": "Unbekannt",
  "light": {
    "accent": "url(https://fremd.example/spion.png)",
    "background": "#ffffff", "surface": "#ffffff", "text": "#f4f4f4",
    "flowWhen": "#b0620a", "flowIf": "#0d7569", "flowThen": "#3451d1",
    "script": "alert(1)"
  },
  "fineTokens": { "light": { "--bg": "#ffffff", "position": "fixed" } },
  "__proto__": { "admin": true },
  "update": "https://fremd.example/mehr.js"
}`;

function codes(result: CheckResult): string[] {
  return result.report.map((entry) => entry.code);
}

function validTheme(result: CheckResult) {
  if (!result.isValid) throw new Error(`expected a valid theme, got ${result.error}`);
  return result.theme;
}

describe("checkThemeText", () => {
  it("takes a good file and derives the missing dark version", () => {
    const result = checkThemeText(JSON.stringify(GOOD_FILE));
    const theme = validTheme(result);

    expect(theme.name).toBe("Abendrot");
    expect(theme.author).toBe("Sabine");
    expect(theme.light?.accent).toBe("#c2552d");
    expect(theme.dark.background).not.toBe(GOOD_FILE.light.background);
    expect(codes(result)).toEqual(["valid", "darkDerived"]);
  });

  it("stops every trick of the suspicious file and says what it did", () => {
    const result = checkThemeText(SUSPICIOUS_TEXT);
    const theme = validTheme(result);

    // Name: no HTML, no direction marks that turn text around
    expect(theme.name).toBe("Abendrotgnuhcslaf");
    // url(…) is no colour: Standard's accent instead
    expect(theme.light?.accent).toBe(STANDARD_COLORS.light.accent);
    // Only known tokens with colours; nothing from __proto__ or unknown fields
    expect(theme.fineTokens.light).toEqual({ "--bg": "#ffffff" });
    expect(Object.keys(theme)).toEqual([
      "name",
      "author",
      "light",
      "dark",
      "isStrong",
      "fineTokens",
    ]);
    expect(({} as Record<string, unknown>).admin).toBeUndefined();
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        "nameCleaned",
        "colorInvalid",
        "unknownColor",
        "fineTokenDropped",
        "unknownField",
      ]),
    );
    const unknownFields = result.report
      .filter((entry) => entry.code === "unknownField")
      .map((entry) => entry.params.field);
    expect(unknownFields).toEqual(expect.arrayContaining(["__proto__", "update"]));
  });

  it("refuses what is no theme, with the reason", () => {
    expect(checkThemeText("not json").isValid).toBe(false);
    expect(checkThemeText("[]")).toMatchObject({
      isValid: false,
      error: "notTheme",
    });
    expect(checkThemeText('{"name":"x"}')).toMatchObject({
      error: "markerMissing",
    });
    expect(checkThemeText('{"homeace-theme":"1"}')).toMatchObject({
      error: "versionUnknown",
    });
    expect(checkThemeText('{"homeace-theme":2}')).toMatchObject({
      error: "versionNewer",
    });
    expect(checkThemeText('{"homeace-theme":1,"name":"x"}')).toMatchObject({
      error: "noColors",
    });
    expect(checkThemeText(42)).toMatchObject({ error: "notTheme" });
  });

  it("refuses an oversized text before reading it", () => {
    const tooLarge = " ".repeat(MAX_THEME_TEXT_LENGTH + 1);

    expect(checkThemeText(tooLarge)).toMatchObject({
      isValid: false,
      error: "tooLarge",
    });
  });

  it("fills a missing colour from Standard and says so", () => {
    const lightEntries = Object.entries(GOOD_FILE.light);
    const withoutThen = Object.fromEntries(lightEntries.filter(([key]) => key !== "flowThen"));
    const result = checkThemeValue({ ...GOOD_FILE, light: withoutThen });

    expect(validTheme(result).light?.flowThen).toBe(STANDARD_COLORS.light.flowThen);
    expect(codes(result)).toContain("colorMissing");
  });

  it("knows dark-only themes", () => {
    const result = checkThemeValue({
      "homeace-theme": 1,
      name: "Nacht",
      dark: GOOD_FILE.light,
    });

    expect(validTheme(result).light).toBeNull();
    expect(codes(result)).toContain("darkOnly");
  });

  it("reads its own export back unchanged", () => {
    const theme = validTheme(checkThemeValue({ ...GOOD_FILE, strong: true }));
    const again = validTheme(checkThemeText(themeFileText(theme)));

    expect(again).toEqual(theme);
  });
});

describe("cleanText", () => {
  it("keeps letters of every language and drops tags and invisible characters", () => {
    expect(cleanText({ text: " Закат <b>über</b> 海​ ", maxLength: 40 })).toBe("Закат über 海");
    expect(cleanText({ text: "a\u0000b\u007fc", maxLength: 40 })).toBe("abc");
    expect(cleanText({ text: "x".repeat(50), maxLength: 40 })).toHaveLength(40);
  });
});
