import { computed, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { useFlowTexts } from "@/composables/texts/useFlowTexts";
import type { Version } from "@/services/versionsService";
import { useEditorStore } from "@/stores/editorStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Entry } from "@/types/entry";
import { toDisplayFlow } from "@/utils/flow/toDisplayFlow";
import { isRecord } from "@/utils/record";
import { clockTime, dayLabel } from "@/utils/runs/runTime";
import { describeSceneValue, sceneLineTexts } from "@/utils/sceneTexts";
import type { SceneValue } from "@/utils/sceneValues";
import {
  alignLines,
  linesOfFlow,
  linesOfScene,
  summarizeRows,
  type LineSection,
  type VersionLine,
} from "@/utils/versions/compareLines";

/** Shown at most in a summary; the rest becomes "+ N weitere". */
const SUMMARY_PARTS = 3;
const DOMAIN_SEPARATOR = ".";
const DEVICE_ICONS: Record<string, string> = {
  light: "mdi-lightbulb",
  switch: "mdi-toggle-switch",
  cover: "mdi-blinds",
  climate: "mdi-thermostat",
  fan: "mdi-fan",
  media_player: "mdi-speaker",
  lock: "mdi-lock",
};
const DEFAULT_DEVICE_ICON = "mdi-circle-medium";

/**
 * Turns a version's config into the lines of the compare view, in the same words as the flow view
 * (automations, scripts) or the scene editor (scenes), and writes the one-line summaries.
 */
export function useVersionLines({ entry }: { entry: Ref<Entry | null> }) {
  const { t, te } = useI18n();
  const editorStore = useEditorStore();
  const lookups = useLookupsStore();
  const settings = useSettingsStore();
  const flowTexts = useFlowTexts();
  const catalog = computed(() => editorStore.catalogs[settings.locale] ?? null);

  function linesFor(config: Record<string, unknown>): VersionLine[] {
    const current = entry.value;
    if (!current) return [];
    if (current.kind === "scene") return [...aboutLines(config), ...sceneLines(config)];
    if (current.kind !== "automation" && current.kind !== "script") return [];

    const areaNames = Object.fromEntries(lookups.areas.map((area) => [area.areaId, area.name]));
    const entityNames = { ...areaNames, ...lookups.entityNames, ...editorStore.flow?.entityNames };
    const display = toDisplayFlow({
      flow: {
        entityId: current.entityId,
        kind: current.kind,
        config,
        entityNames,
        isEditable: false,
      },
      catalog: catalog.value,
      texts: flowTexts.value,
      targetNames: {
        floors: Object.fromEntries(lookups.floors.map((floor) => [floor.floorId, floor.name])),
        labels: Object.fromEntries(lookups.labels.map((label) => [label.labelId, label.name])),
      },
    });
    return [...aboutLines(config), ...linesOfFlow(display)];
  }

  /** Name, description and mode: not blocks, but part of what a version changes. */
  function aboutLines(config: Record<string, unknown>): VersionLine[] {
    const fields: [key: string, field: unknown, icon: string][] = [
      ["name", config.alias ?? config.name, "mdi-form-textbox"],
      ["description", config.description, "mdi-text"],
      ["mode", config.mode, "mdi-repeat"],
    ];
    return fields.flatMap(([key, field, icon]) => {
      if (typeof field !== "string" || field === "") return [];
      const title = t(`versions.about.${key}`);
      return [
        { key: `about|${key}`, section: "about" as const, depth: 0, icon, title, text: field },
      ];
    });
  }

  function sceneLines(config: Record<string, unknown>): VersionLine[] {
    const entities = isRecord(config.entities) ? config.entities : {};
    const texts = sceneLineTexts({ t, te });
    const devices = Object.entries(entities).map(([entityId, raw]) => {
      const domain = entityId.split(DOMAIN_SEPARATOR)[0] ?? "";
      const value: SceneValue = isRecord(raw) ? raw : { state: raw };
      return {
        entityId,
        name: lookups.entityNames[entityId] ?? entityId,
        icon: DEVICE_ICONS[domain] ?? DEFAULT_DEVICE_ICON,
        text: describeSceneValue({ domain, value, locale: settings.locale, texts }),
      };
    });
    return linesOfScene(devices);
  }

  /** "Heute 20:00", "Gestern 21:05", "Montag 08:02", "22. November 08:02". */
  function whenOf(iso: string): string {
    const day = dayLabel({
      iso,
      now: new Date(),
      locale: settings.locale,
      texts: { today: t("versions.today"), yesterday: t("versions.yesterday") },
    });
    return `${day} ${clockTime({ iso, locale: settings.locale })}`;
  }

  /** How a version is called in titles: its name, else its time. */
  function labelOf(version: Pick<Version, "at" | "name">): string {
    return version.name ? `„${version.name}“` : whenOf(version.at);
  }

  function countPart({
    kind,
    section,
    count,
  }: {
    kind: "added" | "removed";
    section: LineSection;
    count: number;
  }): string {
    return t(`versions.summary.${kind}.${section}`, { count }, count);
  }

  /** What a version changed against the one before it, in one line. */
  function summaryOf({ versions, index }: { versions: readonly Version[]; index: number }): string {
    const version = versions[index];
    if (!version) return "";
    // The source line already says "Ausgangsstand".
    if (version.source === "base") return "";
    const previous = versions[index - 1];
    if (!previous) return t("versions.summary.created");

    const rows = alignLines({ older: linesFor(previous.config), newer: linesFor(version.config) });
    const summary = summarizeRows(rows);
    const parts = [
      ...summary.changed.map((name) => t("versions.summary.changed", { name })),
      ...Object.entries(summary.added).map(([section, count]) =>
        countPart({ kind: "added", section: section as LineSection, count: count ?? 0 }),
      ),
      ...Object.entries(summary.removed).map(([section, count]) =>
        countPart({ kind: "removed", section: section as LineSection, count: count ?? 0 }),
      ),
    ];
    const shown = parts.slice(0, SUMMARY_PARTS).join(", ");
    const hidden = parts.length - SUMMARY_PARTS;
    const more = hidden > 0 ? ` ${t("versions.summary.more", { count: hidden })}` : "";
    const text = parts.length ? shown + more : t("versions.summary.none");

    if (version.source !== "restore" || !version.restoredFrom) return text;
    const from = t("versions.summary.restoredFrom", { from: labelOf(version.restoredFrom) });
    return `${from} · ${text}`;
  }

  return { linesFor, whenOf, labelOf, summaryOf };
}
