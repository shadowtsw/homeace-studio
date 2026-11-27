<template>
  <div
    v-if="show === 'sideBySide'"
    class="compare-rows"
    :class="{ 'compare-rows--restore': isRestore }"
  >
    <!-- The head with both sides' names sits above, in VersionCompareHead -->
    <template v-for="(row, index) in rows" :key="index">
      <div v-for="side in SIDES" :key="side" :class="cellClass(row, side)">
        <template v-if="lineOf(row, side)">
          <span class="compare-rows__side">{{ side === "older" ? olderSide : newerSide }}</span>
          <span class="compare-rows__kw">{{ t(`versions.section.${row.section}`) }}</span>
          <span
            class="compare-rows__chip"
            :style="{ marginLeft: `${(lineOf(row, side)?.depth ?? 0) * 12}px` }"
          >
            <span class="mdi" :class="lineOf(row, side)?.icon" />{{ lineOf(row, side)?.title }}
          </span>
          <span class="compare-rows__txt">{{ lineOf(row, side)?.text }}</span>
          <span class="compare-rows__mark">{{ markOf(row) }}</span>
        </template>
        <template v-else>· · ·</template>
      </div>
    </template>
  </div>

  <div v-else class="compare-list">
    <div v-for="(row, index) in changed" :key="index">
      <b :class="`compare-rows--${row.section}`">{{ t(`versions.section.${row.section}`) }}:</b>
      <template v-if="row.change === 'changed'">
        {{ row.older?.title }} <s>{{ (isRestore ? row.newer : row.older)?.text }}</s> →
        {{ (isRestore ? row.older : row.newer)?.text }}
      </template>
      <template v-else>
        <span :class="signClass(row)">{{ signOf(row) }}</span>
        {{ (row.older ?? row.newer)?.title }} {{ (row.older ?? row.newer)?.text }}
        <small>{{ row.change === "onlyOld" ? onlyOldText : onlyNewText }}</small>
      </template>
    </div>
    <p v-if="!changed.length" class="compare-list__none">{{ t("versions.compare.noDiffs") }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { LineRow, VersionLine } from "@/utils/versions/compareLines";

type Side = "older" | "newer";
const SIDES: Side[] = ["older", "newer"];

const props = defineProps<{
  rows: LineRow[];
  show: "sideBySide" | "changesOnly";
  /** Restoring: the older side comes back, so "only older" means "kommt dazu". */
  isRestore: boolean;
  /** Short side names for one column on phones. */
  olderSide: string;
  newerSide: string;
  onlyOldText: string;
  onlyNewText: string;
}>();

const { t } = useI18n();

const changed = computed(() => props.rows.filter((row) => row.change !== "same"));
const lineOf = (row: LineRow, side: Side): VersionLine | null => row[side];

function cellClass(row: LineRow, side: Side): string[] {
  const position = side === "older" ? "compare-rows__left" : "compare-rows__right";
  if (!row[side]) return ["compare-rows__cell", "compare-rows__gap", position];
  return [
    "compare-rows__cell",
    `compare-rows__${row.change}`,
    position,
    `compare-rows--${row.section}`,
  ];
}

function markOf(row: LineRow): string {
  if (row.change === "changed") return "◆";
  return row.change === "same" ? "" : "+";
}

/** "+" is what the newer side has; restoring turns it round. */
function signOf(row: LineRow): string {
  const isAdded = (row.change === "onlyNew") !== props.isRestore;
  return isAdded ? "+" : "−";
}

const signClass = (row: LineRow): string =>
  signOf(row) === "+" ? "compare-list__add" : "compare-list__del";
</script>

<style scoped>
.compare-rows {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  font-size: 13px;
}

.compare-rows__right {
  border-left: 1px solid var(--line);
}

.compare-rows__cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 38px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--line);
}

.compare-rows__same {
  opacity: 0.55;
}

.compare-rows__changed {
  background: var(--warn-soft);
}

.compare-rows__onlyOld,
.compare-rows__onlyNew {
  background: var(--ok-soft);
}

.compare-rows__gap {
  justify-content: center;
  color: var(--faint);
  letter-spacing: 0.3em;
}

/* Each section in its flow colour, as in the editor; the colours follow the theme. */
.compare-rows--trigger {
  --section-color: var(--flow-when);
}

.compare-rows--condition {
  --section-color: var(--flow-if);
}

.compare-rows--action {
  --section-color: var(--flow-then);
}

.compare-rows__kw {
  min-width: 46px;
  color: var(--section-color, var(--muted));
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
}

.compare-rows__chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  color: var(--section-color, inherit);
}

.compare-rows__txt {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compare-rows__mark {
  margin-left: auto;
  font-weight: 700;
}

.compare-rows__side {
  display: none;
  min-width: 46px;
  color: var(--faint);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.compare-list {
  display: grid;
  gap: 6px;
  font-size: 13px;
}

.compare-list b {
  color: var(--section-color, inherit);
}

.compare-list > div {
  padding: 7px 10px;
  border-radius: 9px;
  background: var(--surface-2);
}

.compare-list s,
.compare-list small,
.compare-list__none {
  color: var(--muted);
}

.compare-list__add {
  color: var(--ok);
  font-weight: 700;
}

.compare-list__del {
  color: var(--err);
  font-weight: 700;
}

/* Phones: one column, the older line above the newer one (owner rule: older first). */
@media (max-width: 640px) {
  .compare-rows {
    grid-template-columns: minmax(0, 1fr);
  }

  .compare-rows__gap,
  .compare-rows__same.compare-rows__right {
    display: none;
  }

  .compare-rows__right {
    border-left: 0;
  }

  .compare-rows__cell {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto;
    row-gap: 2px;
  }

  .compare-rows__txt {
    grid-column: 1 / -1;
    overflow: visible;
  }

  .compare-rows__mark {
    grid-row: 1;
    grid-column: 4;
  }

  .compare-rows__side {
    display: inline;
  }

  .compare-rows__txt {
    white-space: normal;
  }
}
</style>
