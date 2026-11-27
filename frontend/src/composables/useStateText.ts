import { useI18n } from "vue-i18n";

import { formatWithUnit } from "@/utils/formatNumber";

/** "nicht erreichbar", "an", "21,3 °C": a state as people read it, numbers in the UI language. */
export function useStateText(): (state: string, unit: string | null) => string {
  const { t, te, locale } = useI18n();

  return (state, unit) => {
    if (te(`picker.states.${state}`)) return t(`picker.states.${state}`);
    if (te(`flow.choices.${state}`)) return t(`flow.choices.${state}`);
    if (!unit) return state;

    return formatWithUnit({
      value: state,
      unit,
      locale: locale.value,
      percent: (value) => t("common.percent", { value }),
    });
  };
}
