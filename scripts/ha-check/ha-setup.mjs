// Onboards a fresh Home Assistant and fills it with the test home of the HA check.

import { sleep } from "../devtools.mjs";
import { connectHaSocket, createHaRest } from "./clients.mjs";
import { OWNER, TEST_DATA, TIMING } from "./constants.mjs";

const TOKEN_CLIENT_NAME = "homeace-ha-check";
const TOKEN_LIFESPAN_DAYS = 30;

/**
 * Creates the owner, a long-lived token and the test home in a fresh HA that loads the demo
 * integration: a floor, two areas, a label, helpers, automations in old and new syntax, a script and
 * a scene.
 *
 * @returns `{ token, version, notes }`. `notes` lists what HA refused: worth a look in a new release.
 */
export async function setUpHa({ haUrl }) {
  // Owner and a long-lived token
  const token = await onboard(haUrl);
  const haRest = createHaRest({ haUrl, token });
  const socket = await connectHaSocket({ haUrl, token });

  // The demo devices, then the home around them
  const states = await waitForDemo(haRest);
  const notes = [];
  const home = await createHome({ socket, states, notes });
  const helpers = await createHelpers(socket);
  await createFlows({ haRest, home, helpers, notes });

  const { version } = await haRest("GET", "/api/config");
  socket.close();

  return { token, version, notes };
}

async function onboard(haUrl) {
  // Owner account, then its auth code for an access token
  const clientId = `${haUrl}/`;
  const anonymous = createHaRest({ haUrl });
  const owner = await anonymous("POST", "/api/onboarding/users", { client_id: clientId, ...OWNER });
  const accessToken = await exchangeAuthCode({ haUrl, clientId, authCode: owner.auth_code });

  // The remaining onboarding steps
  const haRest = createHaRest({ haUrl, token: accessToken });
  const redirectUri = `${clientId}?auth_callback=1`;
  await haRest("POST", "/api/onboarding/core_config", {});
  await haRest("POST", "/api/onboarding/analytics", {});
  await haRest("POST", "/api/onboarding/integration", {
    client_id: clientId,
    redirect_uri: redirectUri,
  });

  // A long-lived token for the app and the checks
  const socket = await connectHaSocket({ haUrl, token: accessToken });
  const token = await socket.call("auth/long_lived_access_token", {
    client_name: TOKEN_CLIENT_NAME,
    lifespan: TOKEN_LIFESPAN_DAYS,
  });
  socket.close();

  return token;
}

async function exchangeAuthCode({ haUrl, clientId, authCode }) {
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code: authCode,
    client_id: clientId,
  });
  const response = await fetch(`${haUrl}/auth/token`, { method: "POST", body: form });
  const tokens = await response.json();

  return tokens.access_token;
}

async function waitForDemo(haRest) {
  const deadline = Date.now() + TIMING.haStartMs;

  while (Date.now() < deadline) {
    const states = await haRest("GET", "/api/states");
    const hasLights = entityIdsOf(states, "light").length > 0;
    if (hasLights) return states;
    await sleep(TIMING.pollMs);
  }
  throw new Error("The demo integration brought no lights");
}

const entityIdsOf = (states, domain) =>
  states.map((state) => state.entity_id).filter((entityId) => entityId.startsWith(`${domain}.`));

async function createHome({ socket, states, notes }) {
  // Floor, two areas (onboarding may have made them already) and a label
  const floor = await socket.call("config/floor_registry/create", {
    name: TEST_DATA.floor,
    level: 0,
  });
  const livingRoom = await placeArea({
    socket,
    name: TEST_DATA.livingRoom,
    floorId: floor.floor_id,
  });
  const kitchen = await placeArea({ socket, name: TEST_DATA.kitchen, floorId: floor.floor_id });
  const label = await socket.call("config/label_registry/create", {
    name: TEST_DATA.label,
    color: "amber",
  });

  // Two demo lights into the areas and under the label
  const lights = entityIdsOf(states, "light");
  const labelId = label.label_id;
  await placeLight({ socket, entityId: lights[0], areaId: livingRoom.area_id, labelId, notes });
  await placeLight({ socket, entityId: lights[1], areaId: kitchen.area_id, labelId, notes });

  return {
    floorId: floor.floor_id,
    kitchenId: kitchen.area_id,
    labelId,
    lights,
    motionSensor: entityIdsOf(states, "binary_sensor")[0],
  };
}

async function placeArea({ socket, name, floorId }) {
  const areas = await socket.call("config/area_registry/list");
  const existing = areas.find((area) => area.name === name);

  if (existing) {
    return socket.call("config/area_registry/update", {
      area_id: existing.area_id,
      floor_id: floorId,
    });
  }
  return socket.call("config/area_registry/create", { name, floor_id: floorId });
}

/**
 * Gives a light the area and the label. Since 2026.12 HA refuses an own area for an entity without
 * a name of its own (it is named after its device); the area then goes to the device.
 */
async function placeLight({ socket, entityId, areaId, labelId, notes }) {
  try {
    await socket.call("config/entity_registry/update", {
      entity_id: entityId,
      area_id: areaId,
      labels: [labelId],
    });
    return;
  } catch (error) {
    notes.push(`own area for ${entityId} (now set on its device): ${error.message}`);
  }

  const entry = await socket.call("config/entity_registry/get", { entity_id: entityId });
  await socket.call("config/entity_registry/update", { entity_id: entityId, labels: [labelId] });
  await socket.call("config/device_registry/update", {
    device_id: entry.device_id,
    area_id: areaId,
  });
}

async function createHelpers(socket) {
  const { helpers, brightness } = TEST_DATA;
  const guest = await socket.call("input_boolean/create", {
    name: helpers.guest,
    icon: "mdi:account",
  });
  const evening = await socket.call("input_number/create", {
    name: helpers.brightness,
    min: 0,
    max: brightness.max,
    step: brightness.step,
    initial: brightness.initial,
  });
  await socket.call("counter/create", { name: helpers.doorbell, step: 1, initial: 0 });
  await socket.call("input_select/create", { name: helpers.mode, options: ["Day", "Night"] });

  return { guest: `input_boolean.${guest.id}`, brightness: `input_number.${evening.id}` };
}

async function createFlows({ haRest, home, helpers, notes }) {
  // Automations; a refused one is noted, its checks then fail with "no entry"
  for (const config of automationConfigs({ home, helpers })) {
    const path = `/api/config/automation/config/${config.id}`;
    await haRest("POST", path, config).catch((error) =>
      notes.push(`automation "${config.alias}": ${error.message}`),
    );
  }

  // The script the automations call, and a scene
  await haRest(
    "POST",
    `/api/config/script/config/${TEST_DATA.script.key}`,
    scriptConfig({ home, helpers }),
  );
  await haRest("POST", `/api/config/scene/config/${TEST_DATA.scene.id}`, sceneConfig(home));
}

/** New syntax, old syntax, floor + label targets with `exclude`, and if / then / else. */
function automationConfigs({ home, helpers }) {
  const { motion, oldSyntax, floorOff, ifThen } = TEST_DATA.automations;
  const [firstLight] = home.lights;
  const guestIsOff = { condition: "state", entity_id: helpers.guest, state: "off" };
  const brightness = { brightness_pct: TEST_DATA.motionBrightness.initial };

  return [
    {
      id: motion.id,
      alias: motion.name,
      mode: "single",
      triggers: [{ trigger: "state", entity_id: home.motionSensor, to: "on" }],
      conditions: [guestIsOff],
      actions: [{ action: "light.turn_on", target: { entity_id: firstLight }, data: brightness }],
    },
    {
      id: oldSyntax.id,
      alias: oldSyntax.name,
      trigger: [{ platform: "time", at: "22:00:00" }],
      condition: [],
      action: [{ service: "light.turn_off", target: { entity_id: home.lights } }],
    },
    {
      id: floorOff.id,
      alias: floorOff.name,
      triggers: [{ trigger: "time", at: "23:00:00" }],
      conditions: [],
      actions: [
        {
          action: "light.turn_off",
          target: { floor_id: home.floorId, exclude: { area_id: [home.kitchenId] } },
        },
        { action: "light.turn_on", target: { label_id: home.labelId } },
      ],
    },
    {
      id: ifThen.id,
      alias: ifThen.name,
      mode: "restart",
      triggers: [{ trigger: "state", entity_id: helpers.guest }],
      conditions: [],
      actions: [
        {
          if: [{ ...guestIsOff, state: "on" }],
          then: [{ action: `script.${TEST_DATA.script.key}` }],
          else: [{ action: "light.turn_off", target: { entity_id: firstLight } }],
        },
        { delay: { seconds: 1 } },
      ],
    },
  ];
}

function scriptConfig({ home, helpers }) {
  return {
    alias: TEST_DATA.script.name,
    mode: "single",
    sequence: [
      {
        action: "light.turn_on",
        target: { entity_id: home.lights[0] },
        data: { brightness_pct: 30 },
      },
      {
        action: "input_number.set_value",
        target: { entity_id: helpers.brightness },
        data: { value: 30 },
      },
    ],
  };
}

function sceneConfig(home) {
  const [firstLight, secondLight] = home.lights;

  return {
    id: TEST_DATA.scene.id,
    name: TEST_DATA.scene.name,
    entities: { [firstLight]: { state: "on", brightness: 77 }, [secondLight]: "off" },
  };
}
