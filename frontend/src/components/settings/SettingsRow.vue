<template>
  <div class="settings-row">
    <div class="settings-row__text">
      <b>
        {{ title }}
        <span
          v-if="scope"
          class="mdi settings-row__scope"
          :class="SCOPE_ICON[scope]"
          :title="scopeText"
          :aria-label="scopeText"
          role="img"
        />
      </b>
      <small v-if="hint">{{ hint }}</small>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { PREFERENCE_SCOPE, type Preference, type PreferenceScope } from "@/constants/preferences";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";

/** Person: follows the user to every device. Screen: only on this device. */
const SCOPE_ICON: Record<PreferenceScope, string> = {
  [PREFERENCE_SCOPE.user]: "mdi-account-outline",
  [PREFERENCE_SCOPE.device]: "mdi-monitor",
};

/** One line of the settings window: title, where it applies, a short hint and its control. */
const props = defineProps<{
  title: string;
  hint?: string;
  /** The kept preference behind the control; without one (a tool, a link) no scope is shown. */
  preference?: Preference;
}>();

const { t } = useI18n();
const settingsWindow = useSettingsWindowStore();

const scope = computed(() =>
  props.preference ? settingsWindow.effectiveScope(props.preference.scope) : null,
);
const scopeText = computed(() =>
  scope.value === PREFERENCE_SCOPE.user ? t("settings.scope.user") : t("settings.scope.device"),
);
</script>

<style scoped>
.settings-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-top: 1px solid var(--line);
}

.settings-row:first-child {
  border-top: 0;
}

.settings-row__text {
  flex: 1;
  min-width: 0;
}

.settings-row__text b {
  display: block;
  font-size: 13.5px;
}

.settings-row__text small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}

.settings-row__scope {
  margin-left: 4px;
  color: var(--faint);
  font-size: 15px;
  font-weight: 400;
  cursor: help;
}

@media (max-width: 820px) {
  .settings-row {
    flex-wrap: wrap;
  }
}
</style>
