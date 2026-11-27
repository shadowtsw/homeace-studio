import { computed, type ComputedRef } from "vue";
import { useI18n } from "vue-i18n";

import type { FlowTexts } from "@/utils/flow/toDisplayFlow";

/** Kinds of hand-made blocks with a title in `flow.titles`. */
const TITLE_KEYS = [
  "state",
  "numeric_state",
  "time",
  "time_pattern",
  "sun",
  "template",
  "event",
  "homeassistant",
  "delay",
  "if",
  "choose",
  "repeat",
  "parallel",
  "sequence",
  "wait",
  "variables",
  "stop",
  "scene",
  "and",
  "or",
  "not",
  "zone",
  "trigger",
  "unknown",
  "state_condition",
  "numeric_state_condition",
  "time_condition",
];

/** Field and branch names with a label in `flow.labels`. */
const LABEL_KEYS = [
  "attribute",
  "from",
  "to",
  "not_from",
  "not_to",
  "for",
  "above",
  "below",
  "at",
  "hours",
  "minutes",
  "seconds",
  "event",
  "offset",
  "value_template",
  "event_type",
  "state",
  "after",
  "before",
  "weekday",
  "zone",
  "id",
  "if",
  "thenBranch",
  "else",
  "option",
  "default",
  "count",
  "while",
  "until",
  "for_each",
  "sequence",
  "parallel",
  "wait_template",
  "timeout",
  "area",
  "device",
  "floor",
  "label",
  "exclude",
  "delay",
  "stop",
];

/** Fixed choices with a label in `flow.choices` (sun events, weekdays, …). */
const CHOICE_KEYS = [
  "sunrise",
  "sunset",
  "start",
  "shutdown",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
  "on",
  "off",
];

/** The texts `toDisplayFlow` needs, in the current UI language. */
export function useFlowTexts(): ComputedRef<FlowTexts> {
  const { t, locale } = useI18n();

  return computed(() => ({
    yes: t("detail.yes"),
    no: t("detail.no"),
    hours: t("flow.units.hours"),
    minutes: t("flow.units.minutes"),
    seconds: t("flow.units.seconds"),
    locale: locale.value,
    percent: (value: string) => t("common.percent", { value }),
    titles: Object.fromEntries(TITLE_KEYS.map((key) => [key, t(`flow.titles.${key}`)])),
    labels: Object.fromEntries(LABEL_KEYS.map((key) => [key, t(`flow.labels.${key}`)])),
    choices: Object.fromEntries(CHOICE_KEYS.map((key) => [key, t(`flow.choices.${key}`)])),
    entity: t("flow.entity"),
  }));
}
