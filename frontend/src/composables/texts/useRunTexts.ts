import { useI18n } from "vue-i18n";

import { useStateText } from "@/composables/texts/useStateText";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { BlockRunState, BlockRunStatus } from "@/utils/runs/runStates";
import { runDuration } from "@/utils/runs/runTime";

export const RUN_STATUS_ICON: Record<BlockRunStatus, string> = {
  fired: "mdi-check",
  notFired: "mdi-minus",
  passed: "mdi-check",
  failed: "mdi-cancel",
  done: "mdi-check",
  error: "mdi-close",
  running: "mdi-timer-sand",
  interrupted: "mdi-restart",
  notReached: "mdi-minus",
  notTaken: "mdi-minus",
  disabled: "mdi-minus",
};

/** Color of a status: ok, warn, err, run or none (CSS modifiers). */
export function runStatusTone(status: BlockRunStatus): string {
  if (status === "fired" || status === "passed" || status === "done") return "ok";
  if (status === "failed") return "warn";
  if (status === "error") return "err";
  if (status === "running") return "run";
  return "none";
}

const UNAVAILABLE_ERROR = /^Entity (\S+) is unavailable/;

type RunTexts = {
  /** "Erfüllt: war „aus“", "15 min 00 s gewartet", "„Sonst“ genommen", … */
  noteOf: (state: BlockRunState) => string;
  /** HA's English error in plain words where we know it; the rest as HA wrote it. */
  errorText: (error: string) => string;
};

/** Texts for what a block did in a run, shared by the run history and the flow. */
export function useRunTexts(): RunTexts {
  const { t } = useI18n();
  const settings = useSettingsStore();
  const lookups = useLookupsStore();
  const stateText = useStateText();

  function noteOf(state: BlockRunState): string {
    if (state.status === "done" && state.delaySeconds !== null) {
      return t("history.status.waited", {
        duration: runDuration(state.delaySeconds, settings.locale),
      });
    }
    if (state.status === "done" && state.choice !== null) {
      if (typeof state.choice === "number") {
        return t("history.status.option", { number: state.choice + 1 });
      }
      return t(state.choice === "then" ? "history.status.branchThen" : "history.status.branchElse");
    }
    if ((state.status === "passed" || state.status === "failed") && state.value !== null) {
      const value = stateText(state.value, null);
      const wanted = state.wanted === null ? null : stateText(state.wanted, null);

      if (state.status === "passed" && (wanted === null || wanted === value)) {
        return t("history.status.passedWas", { value });
      }
      return t(`history.status.${state.status}With`, { value, wanted: wanted ?? "" });
    }

    return t(`history.status.${state.status}`);
  }

  function errorText(error: string): string {
    const entityId = UNAVAILABLE_ERROR.exec(error)?.[1];
    if (entityId) {
      return t("history.errors.unavailable", { name: lookups.entityNames[entityId] ?? entityId });
    }
    return t("history.errors.other", { error });
  }

  return { noteOf, errorText };
}
