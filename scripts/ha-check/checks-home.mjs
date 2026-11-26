// Checks for folders, helpers, the registries, devices, run history and live updates: the 🔴 and 🟠
// rows of docs/ha-compatibility.md that do not belong to flows and scenes.

import { sleep } from "../devtools.mjs";
import { assert } from "./checks.mjs";
import { TEST_DATA, TIMING } from "./constants.mjs";

const ENTITY_FOLDER_SCOPE = "homeace_entities";
const AREA_SOURCE_USES = "uses";

export const HOME_CHECKS = [
  {
    area: "Own category scope",
    name: "entity into a folder and out again",
    run: checkEntityFolder,
  },
  {
    area: "Entitäten einsortieren",
    name: "data: integration names, technical entities",
    run: checkSortingData,
  },
  { area: "Helpers", name: "change max, the other fields stay", run: checkHelperSettings },
  { area: "Helpers", name: "create, duplicate, delete", run: checkHelperCopy },
  { area: "Entity registry", name: "created_at, a new helper is not unused", run: checkCreatedAt },
  { area: "Entity registry", name: "name, icon, alias", run: checkEntryEdit },
  {
    area: "Entity registry",
    name: "rename an entity ID with its references",
    run: checkEntityRename,
  },
  {
    area: "Categories, labels, areas",
    name: "folder: move in, rename, move out",
    run: checkFolders,
  },
  {
    area: "Categories, labels, areas",
    name: "label: create, change, delete, usage",
    run: checkLabels,
  },
  { area: "Categories, labels, areas", name: "area: create, change, delete", run: checkAreas },
  { area: "Floors", name: "floors by name", run: checkFloors },
  {
    area: "Devices, config entries",
    name: "area from the device in the area view",
    run: checkDeviceArea,
  },
  { area: "Run history", name: "run by hand: history says so", run: checkRunHistory },
  { area: "Run history", name: "keep more runs (stored_traces)", run: checkStoredTraces },
  { area: "Live updates", name: "rename in HA, event in the app", run: checkLiveUpdate },
  { area: "Dependencies", name: "who uses the first light", run: checkDependencies },
  { area: "Dashboard resources", name: "lovelace/resources without an error", run: checkResources },
];

async function checkEntityFolder(context) {
  const path = "Check/Sensors";
  await context.app.ok("POST", `/api/entities/${context.sensor}/move`, { categoryPath: path });
  await sleep(TIMING.settleMs);
  const entities = await context.app.ok("GET", "/api/entities");
  const moved = entities.find((entity) => entity.entityId === context.sensor);
  const categories = await context.socket.call("config/category_registry/list", {
    scope: ENTITY_FOLDER_SCOPE,
  });

  assert(moved?.categoryPath === path, `folder: ${moved?.categoryPath}`);
  assert(
    categories.some((category) => category.name === path),
    "no category in HA",
  );
  await context.app.ok("POST", `/api/entities/${context.sensor}/move`, { categoryPath: null });
  return context.sensor;
}

async function checkSortingData(context) {
  const data = await context.app.ok("GET", "/api/entity-sorting");
  const technical = data.entities.filter((entity) => entity.entityCategory).length;
  const unnamed = data.entities.filter((entity) => !entity.name).length;
  const integrationCount = Object.keys(data.integrations ?? {}).length;

  assert(integrationCount > 0, "no integration names (manifest/list)");
  assert(unnamed === 0, `${unnamed} entities without a name`);
  return `${data.entities.length} entities, ${technical} technical, demo is "${data.integrations.demo}"`;
}

async function checkHelperSettings(context) {
  const { brightness, helpers } = TEST_DATA;
  const entityId = await context.entityIdOf(helpers.brightness);
  const { settings } = await context.app.ok("GET", `/api/helpers/${entityId}/settings`);
  await context.app.ok("PUT", `/api/helpers/${entityId}/settings`, {
    settings: { ...settings, max: brightness.changedMax },
  });

  const stored = await context.socket.call("input_number/list");
  const helper = stored.find((item) => item.name === helpers.brightness);
  const isKept = helper?.initial === brightness.initial && helper?.step === brightness.step;
  assert(helper?.max === brightness.changedMax && isKept, JSON.stringify(helper));
  return JSON.stringify(helper);
}

async function checkHelperCopy(context) {
  const created = await context.app.ok("POST", "/api/helpers", {
    type: "input_text",
    name: "Check text",
    settings: { max: 50 },
  });
  const original = await context.entityIdOf(TEST_DATA.helpers.brightness);
  const copyName = `${TEST_DATA.helpers.brightness} copy`;
  const copy = await context.app.ok("POST", `/api/entries/${original}/duplicate`, {
    name: copyName,
  });

  const stored = await context.socket.call("input_number/list");
  const copied = stored.find((item) => item.name === copyName);
  assert(copied?.max === TEST_DATA.brightness.changedMax, `copy: ${JSON.stringify(copied)}`);
  await context.app.ok("DELETE", `/api/helpers/${copy.entityId}`);

  context.shared.newHelper = created.entityId;
  return `${created.entityId}, copy ${copy.entityId}`;
}

async function checkCreatedAt(context) {
  const registry = await context.socket.call("config/entity_registry/list");
  const withCreatedAt = registry.filter((entry) => entry.created_at).length;
  const { findings } = await context.app.ok("GET", "/api/checkup");
  const isNewHelperReported = findings.some(
    (finding) => finding.entityId === context.shared.newHelper,
  );

  assert(
    withCreatedAt === registry.length,
    `${withCreatedAt} of ${registry.length} have created_at`,
  );
  assert(!isNewHelperReported, "the helper made a moment ago is reported");
  return `${registry.length} entries; check-up findings: ${findings.length}`;
}

async function checkEntryEdit(context) {
  const entityId = await context.entityIdOf(TEST_DATA.automations.ifThen.name);
  const alias = "Check alias";
  await context.app.ok("PATCH", `/api/entries/${entityId}`, {
    name: `${TEST_DATA.automations.ifThen.name} (renamed)`,
    icon: "mdi:test-tube",
    aliases: [alias],
  });

  const details = await context.app.ok("GET", `/api/entries/${entityId}/details`);
  const stored = await context.socket.call("config/entity_registry/get", { entity_id: entityId });
  assert(
    details.aliases.includes(alias) && stored.icon === "mdi:test-tube",
    JSON.stringify(stored),
  );
  return `aliases in HA ${JSON.stringify(stored.aliases)}`;
}

async function checkEntityRename(context) {
  const oldId = await context.entityIdOf(TEST_DATA.helpers.guest);
  const newId = `${oldId}_renamed`;
  const references = await context.app.ok("GET", `/api/entries/${oldId}/references`);
  const result = await context.app.ok("POST", `/api/entries/${oldId}/rename`, {
    newEntityId: newId,
    withReferences: true,
  });
  await sleep(TIMING.settleMs);

  const motionId = TEST_DATA.automations.motion.id;
  const config = JSON.stringify(
    await context.haRest("GET", `/api/config/automation/config/${motionId}`),
  );
  const isRewritten = config.includes(`"${newId}"`) && !config.includes(`"${oldId}"`);
  assert(isRewritten, `motion automation: ${config}`);
  return `${references.length} references, ${result.updated.length} updated, ${result.skipped.length} skipped`;
}

async function checkFolders(context) {
  const entityId = await context.entityIdOf(TEST_DATA.automations.oldSyntax.name);
  await context.app.ok("POST", `/api/entries/${entityId}/move`, { categoryPath: "Check/Flows" });
  await context.app.ok("POST", "/api/categories/rename", { from: "Check", to: "Checked" });
  await sleep(TIMING.settleMs);

  const entries = await context.app.ok("GET", "/api/entries");
  const entry = entries.find((item) => item.entityId === entityId);
  assert(entry?.categoryPath === "Checked/Flows", `folder: ${entry?.categoryPath}`);
  await context.app.ok("POST", `/api/entries/${entityId}/move`, { categoryPath: null });
}

async function checkLabels(context) {
  // Create, change and delete one
  const label = await context.app.ok("POST", "/api/labels", {
    name: "Check label",
    color: "indigo",
  });
  await context.app.ok("PATCH", `/api/labels/${label.labelId}`, {
    name: "Check label 2",
    color: null,
  });
  await context.app.ok("DELETE", `/api/labels/${label.labelId}`);

  // The test label names the flow that targets it
  const labels = await context.app.ok("GET", "/api/labels");
  const testLabel = labels.find((item) => item.name === TEST_DATA.label);
  const usage = await context.app.ok("GET", `/api/labels/${testLabel.labelId}/usage`);
  const targetNames = usage.flowsAsTarget.map((flow) => flow.name);
  assert(targetNames.includes(TEST_DATA.automations.floorOff.name), JSON.stringify(usage));
  return `"${TEST_DATA.label}": ${usage.entities} entities, target in ${targetNames.join(", ")}`;
}

async function checkAreas(context) {
  const area = await context.app.ok("POST", "/api/areas", { name: "Check area", icon: "mdi:bed" });
  await context.app.ok("PATCH", `/api/areas/${area.areaId}`, { name: "Check area 2", icon: null });
  await context.app.ok("DELETE", `/api/areas/${area.areaId}`);
  return area.areaId;
}

async function checkFloors(context) {
  const floors = await context.app.ok("GET", "/api/floors");
  const names = floors.map((floor) => floor.name);

  assert(names.includes(TEST_DATA.floor), names.join(", "));
  return names.join(", ");
}

async function checkDeviceArea(context) {
  const motionId = await context.entityIdOf(TEST_DATA.automations.motion.name);
  const entryAreas = await context.app.ok("GET", "/api/entry-areas");
  const areas = entryAreas.find((item) => item.entityId === motionId)?.areas ?? [];
  const derived = areas.find((area) => area.name === TEST_DATA.livingRoom);
  const devices = await context.socket.call("config/device_registry/list");
  const children = devices.filter((device) => device.parent_device_id).length;

  assert(derived?.source === AREA_SOURCE_USES, `areas: ${JSON.stringify(areas)}`);
  return `"${TEST_DATA.automations.motion.name}" → ${derived.name}; ${devices.length} devices, ${children} children`;
}

async function checkRunHistory(context) {
  const automationId = await context.entityIdOf(TEST_DATA.automations.motion.name);
  const scriptId = await context.entityIdOf(TEST_DATA.script.name);
  await context.app.ok("POST", `/api/entries/${automationId}/run`);
  await context.app.ok("POST", `/api/entries/${scriptId}/run`);
  await sleep(TIMING.runMs);

  const automationRuns = (await context.app.ok("GET", `/api/traces/${automationId}`)).runs;
  const scriptRuns = (await context.app.ok("GET", `/api/traces/${scriptId}`)).runs;
  const [lastRun] = automationRuns;
  assert(lastRun && scriptRuns.length > 0, `runs: ${automationRuns.length} / ${scriptRuns.length}`);
  assert(lastRun.start.by === "user", `a run by hand counts as "${lastRun.start.by}"`);
  return `${lastRun.result}, steps ${lastRun.steps.map((step) => step.path).join(" ")}`;
}

async function checkStoredTraces(context) {
  const keep = 20;
  const automationId = await context.entityIdOf(TEST_DATA.automations.motion.name);
  await context.app.ok("PUT", `/api/traces/${automationId}/stored`, { count: keep });
  await sleep(TIMING.settleMs);

  const config = await context.haRest(
    "GET",
    `/api/config/automation/config/${TEST_DATA.automations.motion.id}`,
  );
  assert(config.trace?.stored_traces === keep, JSON.stringify(config.trace));
}

async function checkLiveUpdate(context) {
  // Listen to the app's events, then rename an entry directly in HA
  const entityId = await context.entityIdOf(TEST_DATA.automations.oldSyntax.name);
  const abort = new AbortController();
  const response = await fetch(`${context.appUrl}/api/events`, { signal: abort.signal });
  const changed = waitForText(response.body, "changed");
  await sleep(TIMING.settleMs);
  const newName = `${TEST_DATA.automations.oldSyntax.name} (live)`;
  await context.socket.call("config/entity_registry/update", {
    entity_id: entityId,
    name: newName,
  });

  // The app reports the change within a few seconds
  const timeout = sleep(TIMING.liveEventMs).then(() => false);
  const isReported = await Promise.race([changed, timeout]);
  abort.abort();
  assert(isReported, `no "changed" event within ${TIMING.liveEventMs / 1000} s`);
}

/** Resolves true once the stream contains `text`, false when it ends or is aborted first. */
async function waitForText(stream, text) {
  const decoder = new TextDecoder();
  let received = "";

  try {
    for await (const chunk of stream) {
      received += decoder.decode(chunk);
      if (received.includes(text)) return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function checkDependencies(context) {
  const [light] = context.lights;
  const { usedBy } = await context.app.ok("GET", `/api/dependencies/${light}`);
  const users = usedBy.map((user) => `${user.name} (${user.roles.join("/")})`);

  assert(usedBy.length >= 2, `used by: ${users.join(", ")}`);
  return users.join(", ");
}

async function checkResources(context) {
  const resources = await context.app.ok("GET", "/api/icon-packs/resources");
  return JSON.stringify(resources);
}
