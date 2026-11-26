import type {
  SortingContext,
  SortingDevice,
  SortingEntity,
  SortingFlow,
  SortingRole,
} from "@/types/entitySorting";

import { buildSortingHome, type SortingHome } from "../entitySorting/home";
import type { SortingNames, SortingState } from "../entitySorting/model";

/** A small home like the dummy's: sorted flows, unsorted entities. */
export const NAMES: SortingNames = {
  system: "System",
  systemKinds: { sun: "Sonne", zone: "Zonen", update: "Updates", backup: "Backup" },
  deviceClasses: { smoke: "Rauchmelder" },
};

type EntitySpec = Partial<SortingEntity> & { entityId: string };

function entity(spec: EntitySpec): SortingEntity {
  return {
    name: spec.entityId,
    domain: spec.entityId.split(".")[0] ?? "",
    deviceId: null,
    areaId: null,
    deviceClass: null,
    entityCategory: null,
    integration: null,
    labels: [],
    categoryPath: null,
    isDisabled: false,
    isHidden: false,
    isInRegistry: true,
    ...spec,
  };
}

function device(
  deviceId: string,
  name: string,
  areaId: string | null,
  extra: Partial<SortingDevice> = {},
): SortingDevice {
  return { deviceId, name, areaId, manufacturer: null, model: null, isService: false, ...extra };
}

function flow(
  name: string,
  categoryPath: string | null,
  uses: [string, SortingRole][],
): SortingFlow {
  return {
    entityId: `automation.${name.toLowerCase().replace(/\W+/g, "_")}`,
    name,
    kind: "automation",
    categoryPath,
    uses: uses.map(([entityId, role]) => ({ entityId, roles: [role] })),
  };
}

export function sampleContext(): SortingContext {
  const devices = [
    device("dKitchenLight", "Deckenlicht Küche", "kueche"),
    device("dKitchenMotion", "Bewegungsmelder Küche", "kueche"),
    device("dKidsLight", "Deckenlicht Kinderzimmer", "kinderzimmer"),
    device("dFridge", "Küche Kühlschrank", null, { manufacturer: "Shelly" }),
    device("dPumpOut", "Wärmepumpe Außeneinheit", null),
    device("dPumpCircuit", "Wärmepumpe Heizkreis", null),
    device("dPumpWater", "Wärmepumpe Warmwasser", null),
    device("dCast1", "Nest Mini", null),
    device("dCast2", "Google TV Streamer", null),
    device("dCast3", "Lenovo Smart Display", null),
    device("dSmoke1", "Rauchmelder EG", null),
    device("dSmoke2", "Rauchwarnmelder OG", null),
    device("dSmoke3", "Smoke Detector 3", null),
    device("dSun", "Sun", null, { isService: true }),
  ];
  const entities = [
    entity({
      entityId: "light.deckenlicht_kueche",
      deviceId: "dKitchenLight",
      areaId: "kueche",
      labels: ["Licht"],
      integration: "hue",
    }),
    entity({
      entityId: "binary_sensor.bewegung_kueche",
      deviceId: "dKitchenMotion",
      areaId: "kueche",
      deviceClass: "motion",
      integration: "mqtt",
    }),
    entity({
      entityId: "sensor.bewegung_kueche_akku",
      deviceId: "dKitchenMotion",
      areaId: "kueche",
      entityCategory: "diagnostic",
      integration: "mqtt",
    }),
    entity({
      entityId: "sensor.bewegung_kueche_spannung",
      deviceId: "dKitchenMotion",
      areaId: "kueche",
      entityCategory: "diagnostic",
      isDisabled: true,
      integration: "mqtt",
    }),
    entity({
      entityId: "light.deckenlicht_kinderzimmer",
      deviceId: "dKidsLight",
      areaId: "kinderzimmer",
      labels: ["Licht"],
      integration: "hue",
    }),
    entity({ entityId: "switch.kuehlschrank", deviceId: "dFridge", integration: "shelly" }),
    entity({
      entityId: "update.kuehlschrank_firmware",
      deviceId: "dFridge",
      entityCategory: "config",
      integration: "shelly",
    }),
    entity({
      entityId: "binary_sensor.waermepumpe_stoerung",
      deviceId: "dPumpOut",
      integration: "modbus",
    }),
    entity({
      entityId: "sensor.waermepumpe_vorlauf",
      deviceId: "dPumpCircuit",
      integration: "modbus",
    }),
    entity({
      entityId: "sensor.waermepumpe_ruecklauf",
      deviceId: "dPumpCircuit",
      integration: "modbus",
    }),
    entity({
      entityId: "sensor.waermepumpe_warmwasser",
      deviceId: "dPumpWater",
      integration: "modbus",
    }),
    entity({ entityId: "switch.waermepumpe_boost", deviceId: "dPumpWater", integration: "modbus" }),
    entity({ entityId: "media_player.nest_mini", deviceId: "dCast1", integration: "cast" }),
    entity({ entityId: "media_player.google_tv", deviceId: "dCast2", integration: "cast" }),
    entity({ entityId: "media_player.lenovo", deviceId: "dCast3", integration: "cast" }),
    entity({
      entityId: "binary_sensor.rauch_eg",
      deviceId: "dSmoke1",
      deviceClass: "smoke",
      integration: "mqtt",
    }),
    entity({
      entityId: "binary_sensor.rauch_og",
      deviceId: "dSmoke2",
      deviceClass: "smoke",
      integration: "mqtt",
    }),
    entity({
      entityId: "binary_sensor.rauch_3",
      deviceId: "dSmoke3",
      deviceClass: "smoke",
      integration: "mqtt",
    }),
    entity({
      entityId: "sensor.sun_next_dawn",
      deviceId: "dSun",
      entityCategory: "diagnostic",
      integration: "sun",
    }),
    entity({ entityId: "zone.home", name: "Zuhause", integration: "zone" }),
    entity({
      entityId: "binary_sensor.jemand_zuhause",
      name: "Jemand zuhause",
      integration: "template",
    }),
    entity({
      entityId: "sensor.test_temperatur",
      name: "Test Temperatur",
      integration: "template",
    }),
    entity({ entityId: "sensor.alter_zaehler", name: "Alter Zähler", isInRegistry: false }),
  ];
  // "Alles aus" switches many lights, like in a real home; the others are not part of this sample.
  const lights = [
    "light.deckenlicht_kueche",
    "light.deckenlicht_kinderzimmer",
    ...[1, 2, 3, 4, 5, 6].map((number) => `light.other_${number}`),
  ];

  return {
    entities,
    devices,
    areas: [
      { areaId: "kueche", name: "Küche", floorId: "eg" },
      { areaId: "bad", name: "Bad", floorId: "og" },
      { areaId: "kinderzimmer", name: "Kinderzimmer", floorId: "og" },
    ],
    floors: [
      { floorId: "eg", name: "Erdgeschoss" },
      { floorId: "og", name: "Obergeschoss" },
    ],
    integrations: { cast: "Google Cast", hue: "Philips Hue", sun: "Sun" },
    flows: [
      flow("Licht bei Bewegung Küche", "Haus/Küche/Licht", [
        ["binary_sensor.bewegung_kueche", "trigger"],
        ["light.deckenlicht_kueche", "action"],
        ["binary_sensor.jemand_zuhause", "condition"],
      ]),
      flow("Kochmodus", "Haus/Küche/Kochen", [["light.deckenlicht_kueche", "action"]]),
      flow(
        "Alles aus",
        "System/Zentral",
        lights.map((id): [string, SortingRole] => [id, "action"]),
      ),
      flow("Wärmepumpe Störung melden", "Klima", [
        ["binary_sensor.waermepumpe_stoerung", "trigger"],
      ]),
      flow("Abwesenheit", "Sicherheit", [["binary_sensor.jemand_zuhause", "trigger"]]),
      flow("Heizung nachts", "Klima", [["binary_sensor.jemand_zuhause", "condition"]]),
      flow("PV laden", "Energie", [["binary_sensor.jemand_zuhause", "condition"]]),
      flow("Rauchalarm", null, [["binary_sensor.rauch_eg", "trigger"]]),
    ],
    entries: [
      {
        entityId: "input_boolean.kinderzimmer_board_taster",
        name: "Kinderzimmer-Board-Taster",
        kind: "helper",
        categoryPath: null,
        labels: [],
        areaId: null,
      },
    ],
    folders: [
      "Haus/Küche/Licht",
      "Haus/Küche/Kochen",
      "Haus/Bad",
      "System/Zentral",
      "Klima",
      "Sicherheit",
      "Energie",
      // Scenes sorted by room, like many homes do it: no model for where devices go.
      "Z2MQTT/Szenen/Küche",
      "Z2MQTT/Szenen/Bad",
      "Z2MQTT/Szenen/Kinderzimmer",
    ],
    folderKinds: {
      "Haus/Küche/Licht": ["automation"],
      "Haus/Küche/Kochen": ["automation"],
      "Haus/Bad": ["automation"],
      "System/Zentral": ["script"],
      Klima: ["automation"],
      Sicherheit: ["automation"],
      Energie: ["automation"],
      "Z2MQTT/Szenen/Küche": ["scene"],
      "Z2MQTT/Szenen/Bad": ["scene"],
      "Z2MQTT/Szenen/Kinderzimmer": ["scene"],
    },
    memory: { rules: [], rejected: [], ignored: [], areaParent: null, lastRun: null },
  };
}

export function sampleState(overrides: Partial<SortingState> = {}): SortingState {
  return {
    rules: [],
    rejected: new Map(),
    ignored: new Set(),
    options: {
      includeHidden: false,
      isTechnicalSeparate: false,
      technicalFolder: "Technik/Diagnose",
      isResortingSorted: false,
    },
    choices: new Map(),
    excluded: new Set(),
    groupNames: new Map(),
    areaParent: null,
    ...overrides,
  };
}

export function sampleHome(): SortingHome {
  return buildSortingHome(sampleContext());
}
