import { useI18n } from "vue-i18n";

import { CLEANUP_SCOPE_KEY, CLEANUP_SCOPE_ORDER } from "@/constants/cleanup";
import type { CategoryScope, CleanupStep, ScopeCounts } from "@/services/cleanupService";

/** Texts of the tidy-up assistant: entries per scope, what a step does, which HA calls it makes. */
export function useCleanupTexts() {
  const { t } = useI18n();

  function scopeText(scope: CategoryScope): string {
    return t(`scope.${CLEANUP_SCOPE_KEY[scope]}`);
  }

  function countsText(counts: ScopeCounts): string {
    const parts = CLEANUP_SCOPE_ORDER.filter((scope) => counts[scope]).map(
      (scope) => `${scopeText(scope)} ${counts[scope]}`,
    );

    return parts.join(" · ") || t("cleanup.empty");
  }

  function stepText(item: CleanupStep): string {
    const key = item.kind === "merge" ? "cleanup.stepMerge" : "cleanup.stepRename";

    return t(key, { count: item.entryCount, from: item.from, to: item.to }, item.entryCount);
  }

  /** The HA calls behind a step, shown with technical details on. */
  function apiText(item: CleanupStep): string {
    return item.kind === "merge"
      ? `config/entity_registry/update × ${item.entryCount} · config/category_registry/delete`
      : "config/category_registry/update";
  }

  return { scopeText, countsText, stepText, apiText };
}
