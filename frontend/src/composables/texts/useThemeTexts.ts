import { useI18n } from "vue-i18n";

import type { CheckError } from "@/core/themes/checkTheme";
import type { ThemeDefinition } from "@/utils/themes/builtInThemes";
import type { ThemeReportLine } from "@/utils/themes/floorReport";
import type { GateError } from "@/utils/themes/themeGate";

export type ThemeTexts = {
  /** Ready-made themes from the locales, own ones by the name they brought. */
  themeName: (theme: ThemeDefinition) => string;
  /** The small line under a theme card. */
  themeNote: (theme: ThemeDefinition) => string;
  /** A line of the check report in the user's language. */
  reportText: (line: ThemeReportLine) => string;
  /** Why a file or text is no usable theme. */
  importErrorText: (error: CheckError | GateError) => string;
};

/** Texts of the themes: names, notes and the check report of an import. */
export function useThemeTexts(): ThemeTexts {
  const { t, te } = useI18n();

  function themeName(theme: ThemeDefinition): string {
    if (theme.ownName) return theme.ownName;

    const key = `settings.appearance.themes.${theme.id}.name`;
    return te(key) ? t(key) : theme.id;
  }

  function themeNote(theme: ThemeDefinition): string {
    const darkOnly = theme.light ? "" : ` · ${t("settings.appearance.darkOnly")}`;
    if (theme.ownName && theme.author) {
      return t("settings.appearance.byAuthor", { author: theme.author }) + darkOnly;
    }
    if (theme.ownName) return t("settings.appearance.ownTheme") + darkOnly;

    const key = `settings.appearance.themes.${theme.id}.note`;
    return (te(key) ? t(key) : "") + darkOnly;
  }

  /** Mode and colour names in the params are words of the app, the rest is shown as it is. */
  function shownParam(key: string, value: string | number): string | number {
    const wordKey = `settings.appearance.words.${key}.${value}`;
    return te(wordKey) ? t(wordKey) : value;
  }

  function reportText(line: ThemeReportLine): string {
    const entries = Object.entries(line.params).map(([key, value]) => [
      key,
      shownParam(key, value),
    ]);
    const params = Object.fromEntries(entries);
    if (line.code === "fineTokensKept") {
      return t(`settings.appearance.report.${line.code}`, params, Number(line.params.count));
    }
    return t(`settings.appearance.report.${line.code}`, params);
  }

  function importErrorText(error: CheckError | GateError): string {
    return t(`settings.appearance.importErrors.${error}`);
  }

  return { themeName, themeNote, reportText, importErrorText };
}
