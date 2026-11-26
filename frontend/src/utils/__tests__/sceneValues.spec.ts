import { describe, expect, it } from "vitest";

import {
  colorPresetOf,
  extrasOf,
  hasSingleTargetTemperature,
  kelvinToCss,
  lightCaps,
  presetKelvin,
  readControls,
  toneOf,
  whitePresetOf,
  writeControls,
} from "@/utils/sceneValues";

const COLOR = lightCaps({
  supported_color_modes: ["color_temp", "hs"],
  min_color_temp_kelvin: 2000,
  max_color_temp_kelvin: 6500,
});
const DIM_ONLY = lightCaps({ supported_color_modes: ["brightness"] });

describe("lightCaps", () => {
  it("reads white tones, colours and dimming from the colour modes", () => {
    expect(COLOR).toMatchObject({ brightness: true, white: true, color: true });
    expect(DIM_ONLY).toMatchObject({ brightness: true, white: false, color: false });
    expect(lightCaps({ supported_color_modes: ["onoff"] }).brightness).toBe(false);
  });
});

describe("readControls", () => {
  it("reads a light: brightness in percent, white tone or colour", () => {
    expect(
      readControls({
        domain: "light",
        value: {
          state: "on",
          brightness: 64,
          color_mode: "color_temp",
          color_temp_kelvin: 2700,
        },
      }),
    ).toMatchObject({ on: true, brightness: 25, kelvin: 2700, hs: null });
    expect(
      readControls({
        domain: "light",
        value: { state: "on", color_mode: "hs", hs_color: [215, 85] },
      }),
    ).toMatchObject({
      brightness: 100,
      hs: [215, 85],
      kelvin: null,
    });
  });

  it("reads covers, thermostats and plain on/off devices", () => {
    expect(
      readControls({ domain: "cover", value: { state: "open", current_position: 40 } }).position,
    ).toBe(40);
    expect(readControls({ domain: "cover", value: { state: "closed" } }).position).toBe(0);
    expect(
      readControls({ domain: "climate", value: { state: "heat", temperature: 21.5 } }),
    ).toMatchObject({
      hvacMode: "heat",
      temperature: 21.5,
    });
    expect(readControls({ domain: "switch", value: { state: "off" } }).on).toBe(false);
    expect(readControls({ domain: "sensor", value: { state: "12" } }).on).toBeNull();
  });
});

describe("writeControls", () => {
  const photographed = {
    state: "on",
    brightness: 255,
    color_mode: "color_temp",
    color_temp_kelvin: 4000,
    color_temp: 250,
    hs_color: [27, 44],
    rgb_color: [255, 200, 150],
    xy_color: [0.4, 0.38],
    effect: "candle",
    friendly_name: "Floor lamp",
  };

  it("sets brightness from percent and keeps everything else", () => {
    expect(
      writeControls({ domain: "light", value: photographed, change: { brightness: 25 } }),
    ).toEqual({
      ...photographed,
      brightness: 64,
    });
  });

  it("replaces all old colour values with the new colour, so the light cannot take a wrong one", () => {
    expect(
      writeControls({ domain: "light", value: photographed, change: { hs: [0, 85] } }),
    ).toEqual({
      state: "on",
      brightness: 255,
      effect: "candle",
      friendly_name: "Floor lamp",
      color_mode: "hs",
      hs_color: [0, 85],
    });
  });

  it("replaces the colour with a white tone the same way", () => {
    const next = writeControls({
      domain: "light",
      value: { state: "on", color_mode: "hs", hs_color: [0, 85] },
      change: { kelvin: 2700 },
    });

    expect(next).toEqual({ state: "on", color_mode: "color_temp", color_temp_kelvin: 2700 });
  });

  it("switches devices, moves covers and sets thermostats", () => {
    expect(
      writeControls({ domain: "light", value: photographed, change: { on: false } }).state,
    ).toBe("off");
    expect(
      writeControls({
        domain: "cover",
        value: { state: "open", current_position: 100 },
        change: { position: 0 },
      }),
    ).toEqual({
      state: "closed",
      current_position: 0,
    });
    expect(
      writeControls({
        domain: "climate",
        value: { state: "heat", temperature: 22 },
        change: { temperature: 19.5 },
      }),
    ).toEqual({
      state: "heat",
      temperature: 19.5,
    });
  });

  it("round-trips: reading and writing the same controls changes nothing", () => {
    const value = {
      state: "on",
      brightness: 128,
      color_mode: "color_temp",
      color_temp_kelvin: 2700,
    };
    const controls = readControls({ domain: "light", value });

    expect(
      writeControls({
        domain: "light",
        value,
        change: { on: controls.on, kelvin: controls.kelvin },
      }),
    ).toEqual(value);
  });
});

describe("presets", () => {
  it("finds the white tone and colour a value is at", () => {
    expect(whitePresetOf({ kelvin: 2700, caps: COLOR })).toBe("warm");
    expect(whitePresetOf({ kelvin: 3300, caps: COLOR })).toBeNull();
    expect(colorPresetOf([214, 80])).toBe("blue");
    expect(colorPresetOf([355, 85])).toBe("red");
    expect(colorPresetOf([90, 20])).toBeNull();
  });

  it("keeps white tones within a light's own range", () => {
    const narrow = lightCaps({
      supported_color_modes: ["color_temp"],
      min_color_temp_kelvin: 3000,
    });

    expect(presetKelvin({ preset: "warm", caps: narrow })).toBe(3000);
    expect(whitePresetOf({ kelvin: 3000, caps: narrow })).toBe("warm");
  });
});

describe("toneOf", () => {
  it("runs the slider up to the colour, the white tone, or the default", () => {
    expect(
      toneOf({
        controls: readControls({
          domain: "light",
          value: { state: "on", color_mode: "hs", hs_color: [0, 85] },
        }),
        caps: COLOR,
      }),
    ).toBe("hsl(0 85% 55%)");
    expect(
      toneOf({
        controls: readControls({
          domain: "light",
          value: { state: "on", color_temp_kelvin: 2700 },
        }),
        caps: COLOR,
      }),
    ).toBe(kelvinToCss(2700));
    expect(
      toneOf({
        controls: readControls({ domain: "light", value: { state: "on" } }),
        caps: DIM_ONLY,
      }),
    ).toBeNull();
  });

  it("makes warm white warmer than cold white", () => {
    const blueOf = (css: string): number => Number(/(\d+)\)$/.exec(css)?.[1]);

    expect(blueOf(kelvinToCss(2700))).toBeLessThan(blueOf(kelvinToCss(6000)));
  });
});

describe("extrasOf", () => {
  it("names what the editor cannot show, not what only describes the device", () => {
    expect(
      extrasOf({
        domain: "light",
        value: {
          state: "on",
          brightness: 100,
          effect: "candle",
          friendly_name: "Lamp",
          supported_color_modes: ["hs"],
          min_mireds: 153,
        },
      }),
    ).toEqual([["effect", "candle"]]);
    expect(
      extrasOf({
        domain: "fan",
        value: { state: "on", percentage: 60, oscillating: true, percentage_step: 1 },
      }),
    ).toEqual([
      ["percentage", 60],
      ["oscillating", true],
    ]);
    expect(
      extrasOf({
        domain: "media_player",
        value: { state: "on", media_title: "News", volume_level: 0.3 },
      }),
    ).toEqual([["volume_level", 0.3]]);
  });
});

describe("hasSingleTargetTemperature", () => {
  it("offers one temperature to a plain thermostat and to one without features", () => {
    expect(
      hasSingleTargetTemperature({ attributes: { supported_features: 1 }, hvacMode: "heat" }),
    ).toBe(true);
    expect(hasSingleTargetTemperature({ attributes: {}, hvacMode: "heat" })).toBe(true);
  });

  it("leaves it out where the thermostat works with a low and a high limit", () => {
    expect(
      hasSingleTargetTemperature({ attributes: { supported_features: 3 }, hvacMode: "heat_cool" }),
    ).toBe(false);
    expect(
      hasSingleTargetTemperature({ attributes: { supported_features: 3 }, hvacMode: "heat" }),
    ).toBe(true);
    expect(
      hasSingleTargetTemperature({ attributes: { supported_features: 2 }, hvacMode: "heat" }),
    ).toBe(false);
  });
});
