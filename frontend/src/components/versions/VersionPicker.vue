<template>
  <!-- Fixed height in every mode, so the dialog never jumps (owner rule). -->
  <div class="version-picker">
    <span v-if="mode === 'prev'">{{ t("versions.compare.prevExplain") }}</span>
    <template v-else>
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

import { useSettingsStore } from "@/stores/settingsStore";
import type { Version } from "@/services/versionsService";
import { clockTime, dayLabel } from "@/utils/runs/runTime";

/** The last versions offered on the older side to click through (owner's idea). */
const QUICK_COUNT = 3;

const props = defineProps<{
  mode: "view" | "prev" | "restore";
  /** Oldest first. */
  versions: Version[];
  versionId: string;
}>();

const emit = defineEmits<{ pick: [versionId: string] }>();

const { t } = useI18n();
const settings = useSettingsStore();

const index = computed(() => props.versions.findIndex((item) => item.id === props.versionId));

/** The newest versions before "Jetzt", plus the shown one if it is older. */
const chips = computed(() => {
  const before = props.versions.slice(0, -1).reverse();
  const quick = before.slice(0, QUICK_COUNT);
  const shown = props.versions[index.value];
  const isListed = quick.some((item) => item.id === shown?.id);
  return shown && !isListed && shown !== props.versions.at(-1) ? [...quick, shown] : quick;
});

function step(direction: -1 | 1): void {
  const target = props.versions[index.value + direction];
  if (target && index.value + direction <= props.versions.length - 2) emit("pick", target.id);
}

function labelOf(version: Version): string {
  if (version.name) return `„${version.name}“`;
  const day = dayLabel({
    iso: version.at,
    now: new Date(),
    locale: settings.locale,
    texts: { today: t("versions.today"), yesterday: t("versions.yesterday") },
  });
  return `${day} ${clockTime({ iso: version.at, locale: settings.locale })}`;
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

.version-picker__now {
  padding: 1px 6px;
  border-radius: 5px;
  background: var(--sunken);
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
}

@media (max-width: 640px) {
  .version-picker__label,
  .version-picker__now {
    display: none;
  }
}
</style>
