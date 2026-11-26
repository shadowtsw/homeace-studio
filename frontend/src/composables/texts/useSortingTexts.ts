import { useI18n } from "vue-i18n";

import type { SortingCondition, SortingConditionType } from "@/types/entitySorting";
import type { SortingHome } from "@/utils/entitySorting/home";
import type {
  Confidence,
  GroupOrigin,
  HintKind,
  SortingReason,
  SuggestionChange,
} from "@/utils/entitySorting/model";
import { toDisplayTarget, type PlaceholderWords } from "@/utils/entitySorting/placeholders";
import type { RulePreview } from "@/utils/entitySorting/rules";

type SortingTexts = {
  reason: (reason: SortingReason) => string;
  confidence: (confidence: Confidence | "own") => string;
  change: (change: SuggestionChange) => string;
  origin: (origin: GroupOrigin | null) => string;
  hint: (kind: HintKind) => string;
  conditionType: (type: SortingConditionType) => string;
  condition: (options: { item: SortingCondition; home: SortingHome | null }) => string;
  placeholderWords: () => PlaceholderWords;
  /** A rule target as the user reads it: "Licht/{Bereich}". */
  target: (target: string) => string;
  /** What a rule being written would do, as one sentence (`rulePreview`). */
  rulePreview: (preview: RulePreview) => string;
};

/** The engine returns reasons as data; this writes them in the UI language. */
export function useSortingTexts(): SortingTexts {
  const { t } = useI18n();

  function reason(item: SortingReason): string {
    switch (item.kind) {
      case "rule":
        return t(
          item.isConflict ? "entitySorting.reasons.ruleConflict" : "entitySorting.reasons.rule",
          {
            number: item.ruleNumber,
          },
        );
      case "area":
        return item.pattern
          ? t("entitySorting.reasons.areaPattern", { area: item.areaName, pattern: item.pattern })
          : t("entitySorting.reasons.area", { area: item.areaName });
      case "flow":
        return t(`entitySorting.reasons.${item.role}`, { flow: item.flowName });
      case "similar":
        return t(
          "entitySorting.reasons.similar",
          { count: item.count, word: item.word },
          item.count,
        );
      case "system":
        return t("entitySorting.reasons.system");
      case "everywhere":
        return t("entitySorting.reasons.everywhere");
      case "more":
        return t("entitySorting.reasons.more", { count: item.count });
    }
  }

  const CONFIDENCE_KEY: Record<Confidence | "own", string> = {
    rule: "entitySorting.suggestions.confidenceRule",
    sure: "entitySorting.suggestions.confidenceSure",
    likely: "entitySorting.suggestions.confidenceLikely",
    unclear: "entitySorting.suggestions.confidenceUnclear",
    own: "entitySorting.suggestions.confidenceOwn",
  };
  const CHANGE_KEY: Record<SuggestionChange, string> = {
    surer: "entitySorting.suggestions.changeSurer",
    lessSure: "entitySorting.suggestions.changeLessSure",
    newTarget: "entitySorting.suggestions.changeNewTarget",
  };
  const HINT_KEY: Record<HintKind, string> = {
    rule: "entitySorting.suggestions.hintRule",
    flow: "entitySorting.suggestions.hintFlow",
    area: "entitySorting.suggestions.hintArea",
    similar: "entitySorting.suggestions.hintSimilar",
    system: "entitySorting.suggestions.hintSystem",
  };

  function origin(item: GroupOrigin | null): string {
    if (!item) return "";
    if (item.kind === "rule")
      return t("entitySorting.suggestions.originRule", { number: item.ruleNumber });

    const keys = {
      area: "entitySorting.suggestions.originArea",
      name: "entitySorting.suggestions.originName",
      integration: "entitySorting.suggestions.originIntegration",
      deviceClass: "entitySorting.suggestions.originDeviceClass",
    } as const;
    return t(keys[item.kind]);
  }

  function placeholderWords(): PlaceholderWords {
    return { area: t("entitySorting.rules.area"), floor: t("entitySorting.rules.floor") };
  }

  /** "Bereich = Küche", "Name enthält „test“". */
  function condition({ item, home }: { item: SortingCondition; home: SortingHome | null }): string {
    const type = t(`entitySorting.rules.types.${item.type}`);
    const value =
      item.type === "area"
        ? (home?.areas.get(item.value)?.name ?? item.value)
        : item.type === "floor"
          ? (home?.floorNames.get(item.value) ?? item.value)
          : item.type === "integration"
            ? (home?.context.integrations[item.value] ?? item.value)
            : item.value;

    return item.type === "nameContains" ? `${type} „${value}“` : `${type} = ${value}`;
  }

  function rulePreview(preview: RulePreview): string {
    // How many it catches, how many lack an area, a few examples
    const examples = preview.examples.map((example) => `„${example.name}“ → ${example.target}`);
    const matchesText = t(
      "entitySorting.rules.preview",
      { count: preview.matches },
      preview.matches,
    );
    const withoutAreaText = preview.withoutArea
      ? t("entitySorting.rules.previewWithoutArea", { count: preview.withoutArea })
      : "";
    const examplesText = examples.length
      ? t("entitySorting.rules.previewExamples", { examples: examples.join(", ") })
      : "";

    // Why it may catch fewer than expected: entries match too, or entities that have a folder
    const sideParts = [
      ...(preview.entries
        ? [t("entitySorting.rules.entriesMatch", { count: preview.entries })]
        : []),
      ...(preview.sorted ? [t("entitySorting.rules.sortedMatch", { count: preview.sorted })] : []),
    ];
    const sideText = sideParts.length ? ` ${sideParts.join(". ")}.` : "";

    return matchesText + withoutAreaText + examplesText + "." + sideText;
  }

  return {
    reason,
    confidence: (value) => t(CONFIDENCE_KEY[value]),
    change: (value) => t(CHANGE_KEY[value]),
    origin,
    hint: (kind) => t(HINT_KEY[kind]),
    conditionType: (type) => t(`entitySorting.rules.types.${type}`),
    condition,
    placeholderWords,
    target: (target) => toDisplayTarget({ target, words: placeholderWords() }),
    rulePreview,
  };
}
