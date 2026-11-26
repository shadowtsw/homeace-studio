// Names, ports, timings and the test home of the HA check (run.mjs).

export const HA_IMAGE = "ghcr.io/home-assistant/home-assistant";
export const DEFAULT_HA_TAG = "beta";
export const APP_IMAGE = "homeace-ha-check";

/** Host ports. Not 8123 / 8099, which a real HA or the demo container often use already. */
export const PORT = { ha: 8124, app: 8199 };
export const HA_URL = `http://localhost:${PORT.ha}`;
export const APP_URL = `http://localhost:${PORT.app}`;

export const DOCKER_NAME = {
  network: "homeace-ha-check",
  ha: "homeace-ha-check-ha",
  app: "homeace-ha-check-app",
  haVolume: "homeace-ha-check-ha-config",
  appVolume: "homeace-ha-check-app-data",
};

/** Ports inside the containers: HA's default and the app's (homeace-studio/Dockerfile). */
export const CONTAINER_PORT = { ha: 8123, app: 8099 };

/** How the app container reaches HA inside the Docker network. */
export const HA_URL_IN_NETWORK = `http://${DOCKER_NAME.ha}:${CONTAINER_PORT.ha}`;

/** HA's configuration.yaml: HA's usual default plus the demo integration (lights, sensors, devices). */
export const HA_CONFIGURATION = [
  "default_config:",
  "",
  "automation: !include automations.yaml",
  "script: !include scripts.yaml",
  "scene: !include scenes.yaml",
  "",
  "demo:",
  "",
].join("\n");

export const TIMING = {
  /** First start of a fresh HA, demo integration included. */
  haStartMs: 300_000,
  appStartMs: 60_000,
  pollMs: 1000,
  /** HA reloads a saved flow, scene or registry entry in the background. */
  settleMs: 500,
  /** Demo lights switch with a short delay. */
  switchMs: 1500,
  /** Runs and live events need a moment to show up. */
  runMs: 2000,
  liveEventMs: 4000,
};

/** Owner of the throwaway HA; the onboarding API takes these fields as they are. */
export const OWNER = {
  name: "HA Check",
  username: "ha-check",
  password: "ha-check-throwaway",
  language: "en",
};

/** The test home: what the setup creates and the checks look for, by name. */
export const TEST_DATA = {
  floor: "Ground floor",
  livingRoom: "Living Room",
  kitchen: "Kitchen",
  label: "Lights",
  helpers: {
    guest: "Guest mode",
    brightness: "Evening brightness",
    doorbell: "Doorbell count",
    mode: "Mode",
  },
  brightness: { initial: 40, max: 100, step: 5, changedMax: 90 },
  automations: {
    motion: { id: "1001", name: "Light on motion" },
    oldSyntax: { id: "1002", name: "Old syntax" },
    floorOff: { id: "1003", name: "Floor off except kitchen" },
    ifThen: { id: "1004", name: "If then" },
  },
  /** Brightness of the motion automation, and the value the edit check sets. */
  motionBrightness: { initial: 80, changed: 65 },
  script: { key: "evening_mood", name: "Evening mood" },
  scene: { id: "2001", name: "Living room dimmed" },
};
