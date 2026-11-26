import { useI18n } from "vue-i18n";

/** "nicht erreichbar", "an", "21.3 °C": a state as people read it. */
/** Turns a state into text; `unit` is added to values that are no known word. */
type StateText = (options: { state: string; unit: string | null }) => string;

export function useStateText(): StateText {
  const { t, te } = useI18n();

  return ({ state, unit }) => {
    if (te(`picker.states.${state}`)) return t(`picker.states.${state}`);
    if (te(`flow.choices.${state}`)) return t(`flow.choices.${state}`);

    return unit ? `${state} ${unit}` : state;
  };
}
