import { useI18n } from "vue-i18n";

/** "nicht erreichbar", "an", "21.3 °C": a state as people read it. */
export function useStateText(): (state: string, unit: string | null) => string {
  const { t, te } = useI18n();

  return (state, unit) => {
    if (te(`picker.states.${state}`)) return t(`picker.states.${state}`);
    if (te(`flow.choices.${state}`)) return t(`flow.choices.${state}`);

    return unit ? `${state} ${unit}` : state;
  };
}
