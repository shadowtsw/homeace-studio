import { useI18n } from "vue-i18n";

import { useStateText } from "@/composables/texts/useStateText";
import type { Run } from "@/services/tracesService";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { DisplayFlow } from "@/types/editor";
import { runSeconds, type BlockRunState, type BlockRunStatus } from "@/utils/runs/runStates";
import { clockTime, dayLabel, runDuration } from "@/utils/runs/runTime";

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

/** A run, and the flow it belongs to (for the names of its triggers); null while it loads. */
type RunOfFlow = { run: Run; flow: DisplayFlow | null };

type RunTexts = {
  /** "Erfüllt: war „aus“", "15 min 00 s gewartet", "„Sonst“ genommen", … */
  noteOf: (state: BlockRunState) => string;
  /** HA's English error in plain words where we know it; the rest as HA wrote it. */
  errorText: (error: string) => string;
  /** "Bewegungsmelder Terrasse: „Erkannt“", "Von Hand gestartet", or the trigger block. */
  startText: (options: RunOfFlow) => string;
  /** How long the run took, or that it still runs. */
  durationText: (run: Run) => string;
  /** The second line of a run in the list: its duration and how it started. */
  lineText: (options: RunOfFlow) => string;
  /** The day of a run ("Heute", "Gestern" or the date), as of `now`. */
  dayText: (options: { iso: string; now: Date }) => string;
  /** "Heute, 14:32": when the run started. */
  whenText: (run: Run) => string;
};

/** Texts for runs and for what a block did in one, shared by the run history and the flow. */
export function useRunTexts(): RunTexts {
  const { t } = useI18n();
  const settings = useSettingsStore();
  const lookups = useLookupsStore();
  const stateText = useStateText();

  function noteOf(state: BlockRunState): string {
    if (state.status === "done" && state.delaySeconds !== null) {
      return t("history.status.waited", {
        duration: runDuration({ seconds: state.delaySeconds, locale: settings.locale }),
      });
    }
    if (state.status === "done" && state.choice !== null) {
      if (typeof state.choice === "number") {
        return t("history.status.option", { number: state.choice + 1 });
      }
      return t(state.choice === "then" ? "history.status.branchThen" : "history.status.branchElse");
    }
    if ((state.status === "passed" || state.status === "failed") && state.value !== null) {
      const value = stateText({ state: state.value, unit: null });
      const wanted = state.wanted === null ? null : stateText({ state: state.wanted, unit: null });

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

  function startText({ run, flow }: RunOfFlow): string {
    const start = run.start;

    if (start.by === "user") return t("history.start.user");
    if (start.by === "flow") return t("history.start.flow");
    if (start.entityId && start.to !== null) {
      return t("history.start.entity", {
        name: lookups.entityNames[start.entityId] ?? start.entityId,
        state: stateText({ state: start.to, unit: null }),
      });
    }

    const trigger = start.triggerIndex !== null ? flow?.triggers[start.triggerIndex] : undefined;
    if (trigger) {
      return t("history.start.trigger", {
        text: [trigger.title, ...trigger.chips.map((chip) => chip.text)].join(" "),
      });
    }

    return t("history.start.unknown");
  }

  function durationText(run: Run): string {
    const seconds = runSeconds(run);
    return seconds === null
      ? t("history.runningSince")
      : t("history.took", { duration: runDuration({ seconds, locale: settings.locale }) });
  }

  function lineText({ run, flow }: RunOfFlow): string {
    const seconds = runSeconds(run);
    const duration =
      seconds === null
        ? t("history.runningShort")
        : runDuration({ seconds, locale: settings.locale });
    return `${duration} · ${startText({ run, flow })}`;
  }

  function dayText({ iso, now }: { iso: string; now: Date }): string {
    const texts = { today: t("history.today"), yesterday: t("history.yesterday") };

    return dayLabel({ iso, now, locale: settings.locale, texts });
  }

  function whenText(run: Run): string {
    const day = dayText({ iso: run.startedAt, now: new Date() });
    return `${day}, ${clockTime({ iso: run.startedAt, locale: settings.locale })}`;
  }

  return { noteOf, errorText, startText, durationText, lineText, dayText, whenText };
}
