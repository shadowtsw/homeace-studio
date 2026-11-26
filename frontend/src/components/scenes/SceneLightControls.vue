<template>
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
          :class="{
            'is-on': !controls.hs && whitePresetOf({ kelvin: controls.kelvin, caps }) === preset,
          }"
          @click="change({ kelvin: presetKelvin({ preset, caps }) })"
        >
          <span
            class="scene-row__dot"
            :style="{ background: kelvinToCss(presetKelvin({ preset, caps })) }"
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

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import {
  COLOR_PRESETS,
  WHITE_PRESETS,
  colorPresetOf,
  kelvinToCss,
  presetKelvin,
  whitePresetOf,
  type ColorPreset,
  type LightCaps,
  type SceneControls,
  type WhitePreset,
} from "@/utils/sceneValues";

/** The light part of a scene device row: brightness, and white tones or colours as presets. */
defineProps<{
  controls: SceneControls;
  caps: LightCaps;
  /** The colour the brightness slider runs up to; null for the accent. */
  tone: string | null;
}>();

const emit = defineEmits<{
  change: [change: Partial<SceneControls>];
}>();

const WHITES = Object.keys(WHITE_PRESETS) as WhitePreset[];
const COLORS = Object.keys(COLOR_PRESETS) as ColorPreset[];

const { t } = useI18n();

function change(next: Partial<SceneControls>): void {
  emit("change", next);
}

function hsCss(hs: readonly [number, number]): string {
  return `hsl(${hs[0]} ${hs[1]}% 55%)`;
}
</script>

<style scoped src="./sceneRowLines.css"></style>

<style scoped>
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
</style>
