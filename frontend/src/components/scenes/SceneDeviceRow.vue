<template>
  <div
    class="scene-row"
    :class="{ 'scene-row--trying': isTrying }"
    :data-scene-device="device.entityId"
  >
    <div class="scene-row__head">
      <span class="scene-row__icon mdi" :class="icon" />
      <div class="scene-row__name">
        <b>{{ device.name }}</b>
        <small>
          {{
            t("scene.now", {
              state: describe({ domain, value: device.current ? currentValue : null, unit }),
            })
          }}
          <code v-if="isTechnicalDetailsVisible">{{ device.entityId }}</code>
        </small>
      </div>

      <div v-if="hasOnOff(domain)" class="scene-row__seg" role="group">
        <button
          v-for="choice in [true, false]"
          :key="String(choice)"
          type="button"
          :class="{ 'is-on': controls.on === choice }"
          @click="change({ on: choice })"
        >
          {{ choice ? t("scene.on") : t("scene.off") }}
        </button>
      </div>

      <button
        type="button"
        class="btn btn--small"
        :class="{ 'btn--primary': isTrying }"
        :title="isTrying ? t('scene.tryBackHint') : t('scene.tryHint')"
        @click="emit('try')"
      >
        <span class="mdi" :class="isTrying ? 'mdi-undo' : 'mdi-play'" />
        {{ isTrying ? t("scene.tryBack") : t("scene.try") }}
      </button>

      <SceneRowMenu
        :can-take-current="Boolean(device.current)"
        @take-current="emit('takeCurrent')"
        @remove="emit('remove')"
      />
    </div>

    <SceneLightControls
      v-if="domain === 'light' && controls.on"
      :controls="controls"
      :caps="caps"
      :tone="tone"
      @change="change"
    />

    <label v-if="domain === 'cover'" class="scene-row__line">
      <span class="scene-row__label">{{ t("scene.position") }}</span>
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        :value="controls.position ?? 0"
        @input="change({ position: Number(($event.target as HTMLInputElement).value) })"
      />
      <span class="scene-row__value">{{ percentText(controls.position ?? 0) }}</span>
    </label>

    <template v-if="domain === 'climate'">
      <div class="scene-row__line">
        <span class="scene-row__label">{{ t("scene.mode") }}</span>
        <div class="scene-row__seg" role="group">
          <button
            v-for="mode in hvacModes"
            :key="mode"
            type="button"
            :class="{ 'is-on': controls.hvacMode === mode }"
            @click="change({ hvacMode: mode })"
          >
            {{ hvacLabel(mode) }}
          </button>
        </div>
      </div>
      <label v-if="controls.hvacMode !== 'off' && hasSingleTarget" class="scene-row__line">
        <span class="scene-row__label">{{ t("scene.temperature") }}</span>
        <input
          type="range"
          :min="climate.min"
          :max="climate.max"
          :step="climate.step"
          :value="controls.temperature ?? climate.min"
          @input="change({ temperature: Number(($event.target as HTMLInputElement).value) })"
        />
        <span class="scene-row__value">{{ temperatureText }} {{ unit }}</span>
      </label>
    </template>

    <p v-if="extras.length" class="scene-row__extras">
      <span class="mdi mdi-archive-outline" />
      <span>
        {{ t("scene.extras") }}
        <b>{{ extras.map(([key, val]) => extraText({ key, value: val })).join(" · ") }}</b>.
        {{ t("scene.extrasKept") }}
        <span class="scene-row__hint" :title="t('scene.extrasChangeHint')">
          {{ t("scene.extrasChange") }}
        </span>
      </span>
    </p>
    <p v-if="isTechnicalDetailsVisible && extras.length" class="scene-row__tech">
      <code>{{ extras.map(([key]) => key).join(", ") }}</code>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { useSceneTexts } from "@/composables/texts/useSceneTexts";
import { DOMAIN_ICON } from "@/constants/domainIcons";
import type { SceneDevice } from "@/services/scenesService";
import { formatNumber } from "@/utils/formatNumber";
import { DEFAULT_TEMPERATURE_UNIT } from "@/utils/sceneTexts";
import {
  extrasOf,
  hasOnOff,
  hasSingleTargetTemperature,
  lightCaps,
  readControls,
  toneOf,
  writeControls,
  type SceneControls,
  type SceneValue,
} from "@/utils/sceneValues";

import SceneLightControls from "./SceneLightControls.vue";
import SceneRowMenu from "./SceneRowMenu.vue";

const props = defineProps<{
  device: SceneDevice;
  value: SceneValue;
  isTrying: boolean;
  isTechnicalDetailsVisible: boolean;
  /** The unit HA shows temperatures in ("°C" or "°F"). */
  temperatureUnit?: string;
}>();

const unit = computed(() => props.temperatureUnit ?? DEFAULT_TEMPERATURE_UNIT);

const emit = defineEmits<{
  change: [value: SceneValue];
  try: [];
  takeCurrent: [];
  remove: [];
}>();

const DEFAULT_HVAC_MODES = ["off", "heat", "auto"];
const CLIMATE_DEFAULTS = { min: 7, max: 30, step: 0.5 };

const { t, locale } = useI18n();
const { describe, extraText, hvacLabel, percentText } = useSceneTexts();

const domain = computed(() => props.device.domain);
const icon = computed(() => DOMAIN_ICON[domain.value] ?? "mdi-devices");
const attributes = computed(() => props.device.current?.attributes ?? {});
const controls = computed(() => readControls({ domain: domain.value, value: props.value }));
// A device working with a low and a high limit gets no single temperature (it would refuse it)
const hasSingleTarget = computed(() =>
  hasSingleTargetTemperature({ attributes: attributes.value, hvacMode: controls.value.hvacMode }),
);
const caps = computed(() => lightCaps(attributes.value));
const tone = computed(() => toneOf({ controls: controls.value, caps: caps.value }));
const extras = computed(() => extrasOf({ domain: domain.value, value: props.value }));
const currentValue = computed(() => ({
  state: props.device.current?.state,
  ...attributes.value,
}));
const hvacModes = computed(() => {
  const modes = attributes.value.hvac_modes;
  return Array.isArray(modes) && modes.length ? modes.map(String) : DEFAULT_HVAC_MODES;
});
const climate = computed(() => ({
  min: Number(attributes.value.min_temp ?? CLIMATE_DEFAULTS.min),
  max: Number(attributes.value.max_temp ?? CLIMATE_DEFAULTS.max),
  step: Number(attributes.value.target_temp_step ?? CLIMATE_DEFAULTS.step),
}));
const temperatureText = computed(() =>
  controls.value.temperature === null
    ? "–"
    : formatNumber({ value: controls.value.temperature, locale: locale.value }),
);

function change(next: Partial<SceneControls>): void {
  emit("change", writeControls({ domain: domain.value, value: props.value, change: next }));
}
</script>

<style scoped src="./sceneRowLines.css"></style>

<style scoped>
.scene-row {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
}

.scene-row--trying {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.scene-row__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.scene-row__icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--sunken);
  color: var(--muted);
  font-size: 18px;
}

.scene-row__name {
  flex: 1;
  min-width: 140px;
}

.scene-row__name b {
  display: block;
  font-size: 14px;
}

.scene-row__name small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 12px;
}

.scene-row__name code {
  margin-left: 6px;
  color: var(--faint);
}

.scene-row__seg {
  display: inline-flex;
  padding: 2px;
  border-radius: 9px;
  background: var(--sunken);
}

.scene-row__seg button {
  min-width: 44px;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--muted);
  font: 600 12.5px var(--font-body);
  cursor: pointer;
}

.scene-row__seg button.is-on {
  background: var(--surface);
  color: var(--fg);
  box-shadow: var(--shadow);
}

.scene-row__tech {
  margin: 0 0 0 42px;
  color: var(--faint);
  font-size: 12px;
}

.scene-row__extras {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 0 0 0 42px;
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--sunken);
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.45;
}

.scene-row__extras b {
  color: var(--fg);
  font-weight: 600;
}

.scene-row__hint {
  color: var(--accent);
  text-decoration: underline dotted;
  white-space: nowrap;
  cursor: help;
}

@media (max-width: 820px) {
  .scene-row__extras,
  .scene-row__tech {
    padding-left: 0;
    margin-left: 0;
  }
}
</style>
