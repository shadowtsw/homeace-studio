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
          {{ t("scene.now", { state: describe(device.current ? currentValue : null) }) }}
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

      <div ref="menuRoot" class="scene-row__menu">
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('scene.more')"
          :aria-expanded="isMenuOpen"
          @click="isMenuOpen = !isMenuOpen"
        >
          <span class="mdi mdi-dots-vertical" />
        </button>
        <div v-if="isMenuOpen" class="scene-row__popup" role="menu">
          <button type="button" role="menuitem" :disabled="!device.current" @click="pick('take')">
            <span class="mdi mdi-download-outline" />
            <span>
              {{ t("scene.takeCurrent") }}<small>{{ t("scene.takeCurrentHint") }}</small>
            </span>
          </button>
          <button type="button" role="menuitem" class="is-danger" @click="pick('remove')">
            <span class="mdi mdi-delete-outline" />
            <span>{{ t("scene.remove") }}</span>
          </button>
        </div>
      </div>
    </div>

    <template v-if="domain === 'light' && controls.on">
      <label v-if="caps.brightness" class="scene-row__line">
        <span class="scene-row__label">{{ t("scene.brightness") }}</span>
        <input
          class="scene-row__brightness"
          type="range"
          min="1"
          max="100"
          :value="controls.brightness ?? 100"
          :style="tone ? { '--tone': tone } : undefined"
          @input="change({ brightness: Number(($event.target as HTMLInputElement).value) })"
        />
        <span class="scene-row__value">{{ controls.brightness ?? 100 }} %</span>
      </label>

      <div v-if="caps.white || caps.color" class="scene-row__line">
        <span class="scene-row__label">{{ t("scene.light") }}</span>
        <div class="scene-row__chips">
          <template v-if="caps.white">
            <button
              v-for="preset in WHITES"
              :key="preset"
              type="button"
              class="scene-row__chip"
              :class="{ 'is-on': !controls.hs && whitePresetOf(controls.kelvin, caps) === preset }"
              @click="change({ kelvin: presetKelvin(preset, caps) })"
            >
              <span
                class="scene-row__dot"
                :style="{ background: kelvinToCss(presetKelvin(preset, caps)) }"
              />
              {{ t(`scene.white.${preset}`) }}
            </button>
          </template>
          <span v-if="caps.white && caps.color" class="scene-row__sep" />
          <template v-if="caps.color">
            <button
              v-for="preset in COLORS"
              :key="preset"
              type="button"
              class="scene-row__swatch"
              :class="{ 'is-on': colorPresetOf(controls.hs) === preset }"
              :title="t(`scene.color.${preset}`)"
              :aria-label="t(`scene.color.${preset}`)"
              :style="{ background: hsCss(COLOR_PRESETS[preset]) }"
              @click="change({ hs: [COLOR_PRESETS[preset][0], COLOR_PRESETS[preset][1]] })"
            />
          </template>
        </div>
      </div>
      <p v-else-if="caps.brightness" class="scene-row__note">{{ t("scene.dimOnly") }}</p>
    </template>

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
      <span class="scene-row__value">{{ controls.position ?? 0 }} %</span>
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
        <span class="scene-row__value">{{ controls.temperature ?? "–" }} {{ unit }}</span>
      </label>
    </template>

    <p v-if="extras.length" class="scene-row__extras">
      <span class="mdi mdi-archive-outline" />
      <span>
        {{ t("scene.extras") }}
        <b>{{ extras.map(([key, val]) => extraText(key, val)).join(" · ") }}</b
        >.
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
import { onClickOutside } from "@vueuse/core";
import { computed, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import { DOMAIN_ICON } from "@/constants/domainIcons";
import type { SceneDevice } from "@/services/scenesService";
import {
  COLOR_PRESETS,
  WHITE_PRESETS,
  colorPresetOf,
  extrasOf,
  hasOnOff,
  hasSingleTargetTemperature,
  kelvinToCss,
  lightCaps,
  presetKelvin,
  readControls,
  toneOf,
  whitePresetOf,
  writeControls,
  type ColorPreset,
  type SceneControls,
  type SceneValue,
  type WhitePreset,
} from "@/utils/sceneValues";

const props = defineProps<{
  device: SceneDevice;
  value: SceneValue;
  isTrying: boolean;
  isTechnicalDetailsVisible: boolean;
  /** The unit HA shows temperatures in ("°C" or "°F"). */
  temperatureUnit?: string;
}>();

/** Shown until HA's unit is known; HA's own default. */
const FALLBACK_TEMPERATURE_UNIT = "°C";
const unit = computed(() => props.temperatureUnit ?? FALLBACK_TEMPERATURE_UNIT);

const emit = defineEmits<{
  change: [value: SceneValue];
  try: [];
  takeCurrent: [];
  remove: [];
}>();

const WHITES = Object.keys(WHITE_PRESETS) as WhitePreset[];
const COLORS = Object.keys(COLOR_PRESETS) as ColorPreset[];
const DEFAULT_HVAC_MODES = ["off", "heat", "auto"];
const CLIMATE_DEFAULTS = { min: 7, max: 30, step: 0.5 };

const { t, te } = useI18n();
const isMenuOpen = ref(false);
const menuRoot = useTemplateRef("menuRoot");
onClickOutside(menuRoot, () => (isMenuOpen.value = false));

const domain = computed(() => props.device.domain);
const icon = computed(() => DOMAIN_ICON[domain.value] ?? "mdi-devices");
const attributes = computed(() => props.device.current?.attributes ?? {});
const controls = computed(() => readControls(domain.value, props.value));
// A device working with a low and a high limit gets no single temperature (it would refuse it)
const hasSingleTarget = computed(() =>
  hasSingleTargetTemperature(attributes.value, controls.value.hvacMode),
);
const caps = computed(() => lightCaps(attributes.value));
const tone = computed(() => toneOf(controls.value, caps.value));
const extras = computed(() => extrasOf(domain.value, props.value));
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

function change(next: Partial<SceneControls>): void {
  emit("change", writeControls(domain.value, props.value, next));
}

function pick(action: "take" | "remove"): void {
  isMenuOpen.value = false;
  if (action === "take") emit("takeCurrent");
  else emit("remove");
}

function hsCss(hs: readonly [number, number]): string {
  return `hsl(${hs[0]} ${hs[1]}% 55%)`;
}

function hvacLabel(mode: string): string {
  return te(`scene.hvac.${mode}`) ? t(`scene.hvac.${mode}`) : mode;
}

/** "an · 25 %", "40 % offen", "heizen · 22 °C" … for the "gerade:" line. */
function describe(value: SceneValue | null): string {
  if (!value || value.state === undefined) return "–";
  const read = readControls(domain.value, value);

  if (domain.value === "cover") {
    if (read.position === 0) return t("scene.closed");
    return read.position === 100
      ? t("scene.open")
      : t("scene.openPercent", { percent: read.position });
  }
  if (domain.value === "climate") {
    const mode = hvacLabel(String(value.state));
    return read.temperature === null || value.state === "off"
      ? mode
      : `${mode} · ${read.temperature} °C`;
  }
  if (read.on === null) return String(value.state);
  if (!read.on) return t("scene.off");

  return domain.value === "light" && read.brightness !== null
    ? `${t("scene.on")} · ${read.brightness} %`
    : t("scene.on");
}

function extraText(key: string, value: unknown): string {
  const label = te(`scene.extra.${key}`) ? t(`scene.extra.${key}`) : key;
  let shown: string;

  if (typeof value === "boolean") shown = value ? t("scene.on") : t("scene.off");
  else if (key === "percentage") shown = `${String(value)} %`;
  else if (key === "volume_level" && typeof value === "number")
    shown = `${Math.round(value * 100)} %`;
  else if (typeof value === "string") shown = t("common.quoted", { text: value });
  else shown = JSON.stringify(value);

  return `${label} ${shown}`;
}
</script>

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

.scene-row__menu {
  position: relative;
}

.scene-row__popup {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 20;
  display: grid;
  min-width: 250px;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.scene-row__popup button {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--fg);
  font: 500 13px var(--font-body);
  text-align: left;
  cursor: pointer;
}

.scene-row__popup button:hover:not(:disabled) {
  background: var(--sunken);
}

.scene-row__popup button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.scene-row__popup small {
  display: block;
  color: var(--muted);
  font-size: 11.5px;
}

.scene-row__popup .is-danger {
  color: var(--err);
}

.scene-row__line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding-left: 42px;
}

.scene-row__line input[type="range"] {
  flex: 1;
  min-width: 140px;
  accent-color: var(--accent);
}

.scene-row__label {
  width: 84px;
  color: var(--muted);
  font-size: 12.5px;
}

.scene-row__value {
  min-width: 52px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* The brightness runs from dark up to the light's colour or white tone (the accent if it only dims). */
.scene-row__brightness {
  height: 8px;
  border-radius: 999px;
  appearance: none;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--tone, var(--accent)) 12%, #000),
    var(--tone, var(--accent))
  );
}

.scene-row__brightness::-webkit-slider-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 3px solid var(--surface);
  background: var(--tone, var(--accent));
  box-shadow:
    0 0 0 1px var(--line-strong),
    0 1px 4px rgb(0 0 0 / 35%);
  appearance: none;
  cursor: pointer;
}

.scene-row__brightness::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 3px solid var(--surface);
  background: var(--tone, var(--accent));
  box-shadow: 0 0 0 1px var(--line-strong);
  cursor: pointer;
}

.scene-row__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.scene-row__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: none;
  color: var(--fg);
  font: 500 12.5px var(--font-body);
  cursor: pointer;
}

.scene-row__chip.is-on {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.scene-row__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid var(--line-strong);
}

.scene-row__sep {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: var(--line);
}

.scene-row__swatch {
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid var(--surface);
  box-shadow: 0 0 0 1px var(--line-strong);
  cursor: pointer;
}

.scene-row__swatch.is-on {
  box-shadow: 0 0 0 2px var(--accent);
}

.scene-row__note,
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
  .scene-row__line,
  .scene-row__extras,
  .scene-row__note,
  .scene-row__tech {
    padding-left: 0;
    margin-left: 0;
  }

  .scene-row__label {
    flex-basis: 100%;
    width: auto;
  }
}
</style>
