<template>
  <!-- Fixed height in every mode, so the dialog never jumps (owner rule). -->
  <div class="version-picker">
    <span v-if="mode === 'prev'">{{ t("versions.compare.prevExplain") }}</span>
    <template v-else>
      <!-- "Links:" … "Rechts: jetzt" says what stands where, like the columns below (owner 28.11.:
           "Links vergleichen mit 07:30" read as if 07:30 came on top of the left side). -->
      <span class="version-picker__label">{{ t("versions.compare.pickLabel") }}</span>
      <button
        class="icon-btn"
        type="button"
        :disabled="index <= 0"
        :aria-label="t('versions.compare.older')"
        @click="step(-1)"
      >
        <span class="mdi mdi-chevron-left" />
      </button>
      <div class="version-picker__chips">
        <button
          v-for="item in chips"
          :key="item.id"
          type="button"
          :class="{ 'is-on': item.id === versionId }"
          @click="emit('pick', item.id)"
        >
          <span v-if="item.name" class="mdi mdi-pin-outline" />{{ labelOf(item) }}
        </button>
      </div>
      <button
        class="icon-btn"
        type="button"
        :disabled="index >= versions.length - 2"
        :aria-label="t('versions.compare.newer')"
        @click="step(1)"
      >
        <span class="mdi mdi-chevron-right" />
      </button>
      <span class="version-picker__spacer" />
      <span class="version-picker__now">{{ t("versions.compare.rightIsNow") }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { Version } from "@/services/versionsService";
import { quickVersions } from "@/utils/versions/naming";

/** Versions offered to click through on the older side (owner's idea); phones show two. */
const QUICK_COUNT = 3;

const props = defineProps<{
  mode: "view" | "prev" | "restore";
  /** Oldest first. */
  versions: Version[];
  versionId: string;
  labelOf: (version: Pick<Version, "at" | "name">) => string;
}>();
const emit = defineEmits<{ pick: [versionId: string] }>();

const { t } = useI18n();

const index = computed(() => props.versions.findIndex((item) => item.id === props.versionId));
/** In time order like the columns (old left, new right), so ‹ › move the mark the way they point. */
const chips = computed(() =>
  quickVersions({ versions: props.versions, index: index.value, count: QUICK_COUNT }),
);

function step(direction: -1 | 1): void {
  const target = props.versions[index.value + direction];
  if (target && index.value + direction <= props.versions.length - 2) emit("pick", target.id);
}
</script>

<style scoped>
.version-picker {
  display: flex;
  flex: none;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  margin-bottom: 10px;
  padding: 4px 8px;
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 12.5px;
}

.version-picker__chips {
  display: flex;
  gap: 4px;
  min-width: 0;
  overflow-x: auto;
  white-space: nowrap;
}

.version-picker__chips button {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 10px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--surface);
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.version-picker__chips button.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.version-picker__spacer {
  flex: 1;
}

@media (max-width: 640px) {
  .version-picker__label,
  .version-picker__now {
    display: none;
  }

  /* Two chips, the chosen one always among them (in time order it is often on the right) */
  .version-picker__chips button:first-child:not(.is-on) {
    display: none;
  }

  .version-picker__chips button.is-on:first-child ~ button:last-child {
    display: none;
  }
}
</style>
