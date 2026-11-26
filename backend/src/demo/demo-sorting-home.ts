import type { HaArea, HaFloor, HaManifest } from "../ha/ha.types";
import type { DemoEntity } from "./demo-home";

/**
 * A bigger part of the demo home, all of it without folders, so the tool "Entitäten einsortieren"
 * has real work: rooms with and without matching folders, devices without an area, technical
 * entities, system entities, a few YAML ones and flows that are mostly sorted already.
 */

type Part = Omit<DemoEntity, "platform" | "state" | "entityId" | "name"> & {
  /** Name within the device; empty for the device's main entity. */
  name?: string;
  domain: string;
  state?: string;
  unit?: string;
  deviceClass?: string;
};

type DeviceSpec = {
  name: string;
  areaId?: string;
  platform: string;
  manufacturer: string;
  model: string;
  parts: Part[];
};

export const SORTING_FLOORS: HaFloor[] = [
  { floor_id: "basement_floor", name: "Basement", icon: null, level: -1 },
  { floor_id: "outdoors", name: "Outdoors", icon: null, level: null },
];

/** Floors of the areas the demo already has, so rules with {floor} have something to show. */
export const SORTING_AREA_FLOORS: Record<string, string> = {
  living_room: "ground_floor",
  hallway: "ground_floor",
  garage: "ground_floor",
  bathroom: "upstairs",
  terrace: "outdoors",
  garden: "outdoors",
};

const ROOMS = [
  { id: "kitchen", name: "Kitchen", floor: "ground_floor", window: true, heating: true },
  { id: "dining_room", name: "Dining room", floor: "ground_floor", window: true, heating: true },
  { id: "office", name: "Office", floor: "upstairs", window: true, heating: true },
  { id: "guest_room", name: "Guest room", floor: "upstairs", window: true, heating: true },
  { id: "kids_room", name: "Kids room", floor: "upstairs", window: true, heating: true },
  { id: "attic", name: "Attic", floor: "upstairs", window: false, heating: false },
  { id: "basement", name: "Basement", floor: "basement_floor", window: false, heating: false },
];

export const SORTING_AREAS: HaArea[] = ROOMS.map((room) => ({
  area_id: room.id,
  name: room.name,
  icon: null,
  floor_id: room.floor,
}));

export const SORTING_INTEGRATIONS: HaManifest[] = [
  { domain: "demo", name: "Demo" },
  { domain: "hue", name: "Philips Hue" },
  { domain: "mqtt", name: "MQTT" },
  { domain: "shelly", name: "Shelly" },
  { domain: "modbus", name: "Modbus" },
  { domain: "fritz", name: "AVM FRITZ!Box Tools" },
  { domain: "cast", name: "Google Cast" },
  { domain: "template", name: "Template" },
  { domain: "sun", name: "Sun" },
  { domain: "zone", name: "Zone" },
  { domain: "person", name: "Person" },
  { domain: "met", name: "Meteorologisk institutt (Met.no)" },
  { domain: "hassio", name: "Home Assistant Supervisor" },
  { domain: "hacs", name: "HACS" },
  { domain: "backup", name: "Backup" },
];

const slug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/** Turns a device spec into entities the fake HA registers (device, area, manufacturer, model). */
function device(spec: DeviceSpec): DemoEntity[] {
  return spec.parts.map((part) => {
    const name = part.name ? `${spec.name} ${part.name}` : spec.name;

    return {
      entityId: `${part.domain}.${slug(name)}`,
      name,
      state: part.state ?? "on",
      platform: spec.platform,
      device: spec.name,
      areaId: spec.areaId,
      manufacturer: spec.manufacturer,
      model: spec.model,
      labels: part.labels,
      isDisabled: part.isDisabled,
      isHidden: part.isHidden,
      entityCategory: part.entityCategory,
      attributes: {
        ...(part.unit ? { unit_of_measurement: part.unit } : {}),
        ...(part.deviceClass ? { device_class: part.deviceClass } : {}),
      },
    };
  });
}

const battery: Part = {
  domain: "sensor",
  name: "Battery",
  state: "87",
  unit: "%",
  deviceClass: "battery",
  entityCategory: "diagnostic",
};

function room(spec: (typeof ROOMS)[number]): DemoEntity[] {
  const zigbee = { platform: "mqtt", areaId: spec.id };
  const entities = [
    ...device({
      name: `${spec.name} ceiling light`,
      areaId: spec.id,
      platform: "hue",
      manufacturer: "Signify",
      model: "LCA001",
      parts: [{ domain: "light", labels: ["lights"] }],
    }),
    ...device({
      ...zigbee,
      name: `${spec.name} motion sensor`,
      manufacturer: "Aqara",
      model: "RTCGQ11LM",
      parts: [
        { domain: "binary_sensor", name: "Motion", state: "off", deviceClass: "motion" },
        {
          domain: "sensor",
          name: "Illuminance",
          state: "120",
          unit: "lx",
          deviceClass: "illuminance",
        },
        battery,
        { domain: "sensor", name: "Signal", state: "112", entityCategory: "diagnostic" },
        {
          domain: "sensor",
          name: "Voltage",
          state: "3010",
          unit: "mV",
          deviceClass: "voltage",
          entityCategory: "diagnostic",
          isDisabled: true,
        },
      ],
    }),
  ];

  if (spec.window) {
    entities.push(
      ...device({
        ...zigbee,
        name: `${spec.name} window`,
        manufacturer: "Aqara",
        model: "MCCGQ11LM",
        parts: [{ domain: "binary_sensor", state: "off", deviceClass: "window" }, battery],
      }),
    );
  }
  if (spec.heating) {
    entities.push(
      ...device({
        ...zigbee,
        name: `${spec.name} thermostat`,
        manufacturer: "Danfoss",
        model: "Ally",
        parts: [
          { domain: "climate", state: "heat", labels: ["comfort"] },
          {
            domain: "sensor",
            name: "Temperature",
            state: "20.5",
            unit: "°C",
            deviceClass: "temperature",
          },
          battery,
          { domain: "number", name: "Offset", state: "0", entityCategory: "config" },
        ],
      }),
    );
  }

  return entities;
}

function plug(name: string, areaId?: string): DemoEntity[] {
  return device({
    name,
    areaId,
    platform: "shelly",
    manufacturer: "Shelly",
    model: "Plug S",
    parts: [
      { domain: "switch" },
      { domain: "sensor", name: "Power", state: "12", unit: "W", deviceClass: "power" },
      { domain: "sensor", name: "Energy", state: "41.2", unit: "kWh", deviceClass: "energy" },
      {
        domain: "sensor",
        name: "Device temperature",
        state: "38",
        unit: "°C",
        deviceClass: "temperature",
        entityCategory: "diagnostic",
      },
      {
        domain: "sensor",
        name: "Signal strength",
        state: "-61",
        unit: "dBm",
        deviceClass: "signal_strength",
        entityCategory: "diagnostic",
      },
      {
        domain: "sensor",
        name: "Uptime",
        state: "2026-11-20T08:00:00Z",
        entityCategory: "diagnostic",
        isDisabled: true,
      },
      { domain: "update", name: "Firmware", state: "off", entityCategory: "config" },
      { domain: "button", name: "Restart", state: "unknown", entityCategory: "config" },
    ],
  });
}

function plain(
  entityId: string,
  name: string,
  platform: string,
  extra: Partial<DemoEntity> = {},
): DemoEntity {
  return { entityId, name, state: "on", platform, ...extra };
}

const heatPump = (name: string, parts: Part[]): DemoEntity[] =>
  device({ name, platform: "modbus", manufacturer: "Vaillant", model: "aroTHERM", parts });

const castDevice = (name: string): DemoEntity[] =>
  device({
    name,
    platform: "cast",
    manufacturer: "Google",
    model: name,
    parts: [{ domain: "media_player", state: "off" }],
  });

const smoke = (name: string): DemoEntity[] =>
  device({
    name,
    platform: "mqtt",
    manufacturer: "Heiman",
    model: "HS1SA",
    parts: [{ domain: "binary_sensor", state: "off", deviceClass: "smoke" }, battery],
  });

const ENTITIES: DemoEntity[] = [
  ...ROOMS.flatMap(room),
  ...device({
    name: "Dining room floor lamp",
    areaId: "dining_room",
    platform: "hue",
    manufacturer: "Signify",
    model: "LTW012",
    parts: [{ domain: "light", labels: ["lights"] }],
  }),
  ...plug("Coffee machine", "kitchen"),
  ...plug("Office desk", "office"),
  ...plug("Washing machine plug", "basement"),
  ...plug("Kitchen fridge"),
  ...plug("Kitchen dishwasher"),
  ...heatPump("Heat pump outdoor unit", [
    { domain: "sensor", name: "Power", state: "1800", unit: "W", deviceClass: "power" },
    {
      domain: "sensor",
      name: "Outside temperature",
      state: "4.5",
      unit: "°C",
      deviceClass: "temperature",
    },
    { domain: "binary_sensor", name: "Fault", state: "off", deviceClass: "problem" },
  ]),
  ...heatPump("Heat pump heating circuit", [
    { domain: "sensor", name: "Flow", state: "35", unit: "°C", deviceClass: "temperature" },
    { domain: "sensor", name: "Return", state: "29", unit: "°C", deviceClass: "temperature" },
    { domain: "binary_sensor", name: "Pump", state: "on", deviceClass: "running" },
  ]),
  ...heatPump("Heat pump hot water", [
    { domain: "sensor", name: "Temperature", state: "48", unit: "°C", deviceClass: "temperature" },
    { domain: "switch", name: "Boost", state: "off" },
  ]),
  ...device({
    name: "FRITZ!Box 7590",
    platform: "fritz",
    manufacturer: "AVM",
    model: "FRITZ!Box 7590",
    parts: [
      {
        domain: "sensor",
        name: "Download",
        state: "48.2",
        unit: "Mbit/s",
        deviceClass: "data_rate",
      },
      { domain: "sensor", name: "Upload", state: "9.8", unit: "Mbit/s", deviceClass: "data_rate" },
      { domain: "sensor", name: "External IP", state: "203.0.113.7" },
      { domain: "binary_sensor", name: "Connection", deviceClass: "connectivity" },
      { domain: "switch", name: "Guest Wi-Fi", state: "off" },
      { domain: "button", name: "Restart", state: "unknown", entityCategory: "config" },
      { domain: "update", name: "Firmware", state: "off", entityCategory: "config" },
    ],
  }),
  ...device({
    name: "FRITZ!Repeater 3000",
    platform: "fritz",
    manufacturer: "AVM",
    model: "FRITZ!Repeater 3000",
    parts: [
      { domain: "binary_sensor", name: "Connection", deviceClass: "connectivity" },
      { domain: "update", name: "Firmware", state: "off", entityCategory: "config" },
    ],
  }),
  ...["Chromecast Ultra", "Nest Mini", "Google TV Streamer", "Lenovo Smart Display"].flatMap(
    castDevice,
  ),
  ...[
    "Smoke detector ground floor",
    "Smoke alarm upstairs",
    "Fire detector 3",
    "Detector attic stairs",
  ].flatMap(smoke),
  plain("sun.sun", "Sun", "sun", { state: "above_horizon" }),
  plain("zone.home", "Home", "zone", { state: "2" }),
  plain("zone.work", "Work", "zone", { state: "0" }),
  plain("person.alex", "Alex", "person", { state: "home" }),
  plain("person.sam", "Sam", "person", { state: "not_home" }),
  plain("weather.forecast_home", "Forecast Home", "met", { state: "cloudy" }),
  plain("update.home_assistant_core_update", "Home Assistant Core", "hassio", { state: "off" }),
  plain("update.hacs_update", "HACS", "hacs", { state: "off" }),
  plain("sensor.backup_last_successful_backup", "Last successful backup", "backup", {
    state: "2026-11-25T03:00:00Z",
    attributes: { device_class: "timestamp" },
  }),
  plain("sensor.open_windows", "Open windows", "template", { state: "1" }),
  plain("sensor.test_temperature", "Test temperature", "template", { state: "21" }),
  plain("switch.test_switch", "Test switch", "template", { state: "off" }),
  plain("sensor.old_meter", "Old meter", "template", { state: "1834", isStateOnly: true }),
  plain("sensor.legacy_outside_temperature", "Legacy outside temperature", "template", {
    state: "4",
    isStateOnly: true,
  }),
];

type FlowSpec = {
  id: string;
  name: string;
  category?: string;
  uses: { trigger?: string[]; condition?: string[]; action?: string[] };
};

const idOf = (name: string, domain: string): string => `${domain}.${slug(name)}`;

function automation(spec: FlowSpec): DemoEntity {
  const { trigger = [], condition = [], action = [] } = spec.uses;

  return {
    entityId: `automation.${slug(spec.name)}`,
    name: spec.name,
    state: "on",
    platform: "automation",
    uniqueId: spec.id,
    category: spec.category,
    config: {
      id: spec.id,
      alias: spec.name,
      description: "",
      mode: "single",
      triggers: trigger.map((entityId) => ({ trigger: "state", entity_id: entityId, to: "on" })),
      conditions: condition.map((entityId) => ({
        condition: "state",
        entity_id: entityId,
        state: "on",
      })),
      actions: action.map((entityId) => ({
        action: "homeassistant.turn_on",
        target: { entity_id: entityId },
      })),
    },
  };
}

function lightOnMotion(roomName: string, id: string, category?: string): DemoEntity {
  return automation({
    id,
    name: `${roomName} light on motion`,
    category,
    uses: {
      trigger: [idOf(`${roomName} motion sensor Motion`, "binary_sensor")],
      condition: [
        idOf(`${roomName} motion sensor Illuminance`, "sensor"),
        "binary_sensor.anyone_home",
      ],
      action: [idOf(`${roomName} ceiling light`, "light")],
    },
  });
}

const HEATED = ROOMS.filter((item) => item.heating);

const FLOWS: DemoEntity[] = [
  lightOnMotion("Kitchen", "1764100000001", "House/Kitchen/Lights"),
  lightOnMotion("Office", "1764100000002", "House/Office"),
  lightOnMotion("Guest room", "1764100000003", "House/Guest room"),
  lightOnMotion("Kids room", "1764100000004"),
  lightOnMotion("Basement", "1764100000005"),
  automation({
    id: "1764100000006",
    name: "Cooking mode",
    category: "House/Kitchen/Cooking",
    uses: { action: ["light.kitchen_ceiling_light", "switch.coffee_machine"] },
  }),
  automation({
    id: "1764100000007",
    name: "Window open: heating off",
    category: "Climate",
    uses: {
      trigger: HEATED.map((item) => idOf(`${item.name} window`, "binary_sensor")),
      action: HEATED.map((item) => idOf(`${item.name} thermostat`, "climate")),
    },
  }),
  automation({
    id: "1764100000008",
    name: "Heat pump fault",
    category: "Climate",
    uses: { trigger: ["binary_sensor.heat_pump_outdoor_unit_fault"] },
  }),
  automation({
    id: "1764100000009",
    name: "Window warning",
    category: "Security",
    uses: { trigger: ["sensor.open_windows"], condition: ["person.alex", "person.sam"] },
  }),
  automation({
    id: "1764100000010",
    name: "Smoke alarm",
    uses: {
      trigger: [
        "binary_sensor.smoke_detector_ground_floor",
        "binary_sensor.smoke_alarm_upstairs",
        "binary_sensor.fire_detector_3",
        "binary_sensor.detector_attic_stairs",
      ],
    },
  }),
  automation({
    id: "1764100000011",
    name: "Laundry finished",
    uses: { trigger: ["sensor.washing_machine_plug_power"] },
  }),
];

export const SORTING_ENTITIES: DemoEntity[] = [...ENTITIES, ...FLOWS];
