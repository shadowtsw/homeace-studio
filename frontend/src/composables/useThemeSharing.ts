import { useI18n } from "vue-i18n";

import { themeFileName, themeFileText } from "@/core/themes/themeFormat";
import { useThemeImportStore } from "@/stores/themeImportStore";
import { useToastStore } from "@/stores/toastStore";
import { checkedThemeOf, type ThemeDefinition } from "@/utils/themes/builtInThemes";

import { useThemeTexts } from "./texts/useThemeTexts";

/** The download needs the address for a moment after the click; then it is given back. */
const DOWNLOAD_URL_LIFETIME_MS = 10_000;
const THEME_FILE_TYPE = "application/json";

export type ThemeSharing = {
  /** "Exportieren": the theme as a file. */
  exportFile: (theme: ThemeDefinition) => void;
  /** "Kopieren": the file's text to the clipboard, or shown to copy by hand where it is closed. */
  copyText: (theme: ThemeDefinition) => Promise<void>;
};

/**
 * Sharing a theme: as a file (`<name>.homeace-theme.json`) or as text for a forum post. Both are the
 * same file content, which an import reads back.
 */
export function useThemeSharing(): ThemeSharing {
  const { t } = useI18n();
  const toasts = useToastStore();
  const themeImport = useThemeImportStore();
  const { themeName } = useThemeTexts();

  function fileOf(theme: ThemeDefinition): { text: string; fileName: string } {
    const name = themeName(theme);
    const text = themeFileText(checkedThemeOf({ theme, name }));

    return { text, fileName: themeFileName(name) };
  }

  function exportFile(theme: ThemeDefinition): void {
    const { text, fileName } = fileOf(theme);
    const url = URL.createObjectURL(new Blob([text], { type: THEME_FILE_TYPE }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME_MS);

    toasts.show({ text: t("settings.appearance.exported", { file: fileName }) });
  }

  async function copyText(theme: ThemeDefinition): Promise<void> {
    const { text } = fileOf(theme);
    try {
      await navigator.clipboard.writeText(text);
      toasts.show({ text: t("settings.appearance.copied") });
    } catch {
      // No error: the clipboard is missing over plain http and may be closed in some apps. The
      // text is then shown to copy by hand; that page is the handling.
      await themeImport.showCopyText(text);
    }
  }

  return { exportFile, copyText };
}
