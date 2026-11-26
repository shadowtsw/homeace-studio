// Checks for the block catalog, the texts from HA, flows and scenes: the 🔴 rows of
// docs/ha-compatibility.md.

import { isDeepStrictEqual } from "node:util";
import { sleep } from "../devtools.mjs";
import { assert } from "./checks.mjs";
import { TEST_DATA, TIMING } from "./constants.mjs";

const CATALOG_PARTS = ["triggers", "conditions", "actions"];
/** A name that is the key itself, or a raw translation key, means HA's text was not found. */
const RAW_NAME = /component\.|\[%key/;
const FLOW_KIND = { automation: "automation", script: "script" };

const automationChecks = Object.values(TEST_DATA.automations).map(({ id, name }) => ({
  area: "Flow format",
  name: `"${name}": read, save unchanged, HA keeps the same config`,
  run: (context) => checkUnchangedSave(context, { kind: FLOW_KIND.automation, key: id, name }),
}));

export const FLOW_CHECKS = [
  { area: "Core", name: "the app loads every kind of entry", run: checkEntryKinds },
  {
    area: "Block catalog",
    name: "catalog in German: groups, names, fields, scripts by name",
    run: (context) => checkCatalog(context, "de"),
  },
  {
    area: "Texts from HA",
    name: "catalog in English",
    run: (context) => checkCatalog(context, "en"),
  },
  ...automationChecks,
  {
    area: "Flow format",
    name: "script: read, save unchanged",
    run: (context) =>
      checkUnchangedSave(context, {
        kind: FLOW_KIND.script,
        key: TEST_DATA.script.key,
        name: TEST_DATA.script.name,
      }),
  },
  { area: "Flow format", name: "change a value and save", run: checkValueChange },
  {
    area: "Flow files",
    name: "create and delete an automation and a script",
    run: checkCreateDelete,
  },
  {
    area: "Scene file",
    name: "create a scene, add a light: saving switches nothing",
    run: checkSceneSave,
  },
  { area: "Scene file", name: "preview switches, restore goes back", run: checkScenePreview },
  { area: "Scene file", name: "read the existing scene", run: checkExistingScene },
];

async function checkEntryKinds(context) {
  const entries = await context.app.ok("GET", "/api/entries");
  const counts = Object.groupBy(entries, (entry) => entry.kind);
  const summary = Object.entries(counts).map(([kind, list]) => `${kind} ${list.length}`);
  const automationCount = Object.keys(TEST_DATA.automations).length;

  assert(counts.automation?.length === automationCount, `automations: ${summary.join(", ")}`);
  assert(counts.script && counts.scene && counts.helper, `missing kinds: ${summary.join(", ")}`);
  return summary.join(", ");
}

async function checkCatalog(context, language) {
  // Every part has entries, and they have names
  const catalog = await context.app.ok("GET", `/api/editor/catalog?lang=${language}`);
  const entries = CATALOG_PARTS.flatMap((part) => Object.entries(catalog[part] ?? {}));
  const counts = CATALOG_PARTS.map((part) => `${part} ${Object.keys(catalog[part] ?? {}).length}`);
  const unnamed = entries.filter(([key, entry]) => entry.name === key || RAW_NAME.test(entry.name));
  const unnamedKeys = unnamed.map(([key]) => key);

  assert(
    CATALOG_PARTS.every((part) => Object.keys(catalog[part] ?? {}).length > 0),
    counts.join(", "),
  );
  assert(unnamed.length === 0, `without a name: ${unnamedKeys.join(", ")}`);

  // A script is its own action, named by its alias
  const scriptName = catalog.actions[`script.${TEST_DATA.script.key}`]?.name;
  assert(scriptName === TEST_DATA.script.name, `the script is called "${scriptName}"`);

  const turnOn = catalog.actions["light.turn_on"]?.name;
  return `${counts.join(", ")}; light.turn_on "${turnOn}"`;
}

async function checkUnchangedSave(context, { kind, key, name }) {
  // Read through the app, save it back unchanged
  const entityId = await context.entityIdOf(name);
  const flow = await context.app.ok("GET", `/api/editor/flows/${entityId}`);
  assert(flow.isEditable, "not editable");
  const haPath = `/api/config/${kind}/config/${key}`;
  const before = await context.haRest("GET", haPath);
  await context.app.ok("PUT", `/api/editor/flows/${entityId}`, { config: flow.config });
  await sleep(TIMING.settleMs);

  // HA's config file must be exactly the same
  const after = await context.haRest("GET", haPath);
  assert(isDeepStrictEqual(before, after), `HA config changed: ${JSON.stringify(after)}`);
  const keepsExclude = JSON.stringify(after).includes('"exclude"');

  return `keys ${Object.keys(flow.config).join("/")}${keepsExclude ? "; exclude kept" : ""}`;
}

async function checkValueChange(context) {
  const { motion } = TEST_DATA.automations;
  const { changed } = TEST_DATA.motionBrightness;
  const entityId = await context.entityIdOf(motion.name);
  const flow = await context.app.ok("GET", `/api/editor/flows/${entityId}`);
  const config = structuredClone(flow.config);
  config.actions[0].data.brightness_pct = changed;

  await context.app.ok("PUT", `/api/editor/flows/${entityId}`, { config });
  await sleep(TIMING.settleMs);
  const saved = await context.haRest("GET", `/api/config/automation/config/${motion.id}`);
  assert(saved.actions[0].data.brightness_pct === changed, JSON.stringify(saved.actions[0]));
}

async function checkCreateDelete(context) {
  const automation = await context.app.ok("POST", "/api/flows", {
    kind: FLOW_KIND.automation,
    name: "Check automation",
    categoryPath: "Check/New",
  });
  const script = await context.app.ok("POST", "/api/flows", {
    kind: FLOW_KIND.script,
    name: "Check script",
  });
  await context.app.ok("DELETE", `/api/flows/${automation.entityId}`);
  await context.app.ok("DELETE", `/api/flows/${script.entityId}`);
  await sleep(TIMING.switchMs);

  const entries = await context.app.ok("GET", "/api/entries");
  const created = [automation.entityId, script.entityId];
  const left = entries.filter((entry) => created.includes(entry.entityId));
  assert(left.length === 0, `still there: ${left.map((entry) => entry.entityId).join(", ")}`);
  return created.join(", ");
}

const stateOf = async (context, entityId) =>
  (await context.haRest("GET", `/api/states/${entityId}`)).state;

async function checkSceneSave(context) {
  // A new scene gets the first light, set the other way round than it is now
  const [light] = context.lights;
  const { entityId } = await context.app.ok("POST", "/api/scenes", { name: "Check scene" });
  const stateBefore = await stateOf(context, light);
  const wanted = stateBefore === "on" ? { state: "off" } : { state: "on", brightness: 50 };
  await context.app.ok("PUT", `/api/scenes/${entityId}`, { entities: { [light]: wanted } });
  await sleep(TIMING.switchMs);

  // The light did not switch, the scene has the value
  const stateAfter = await stateOf(context, light);
  assert(stateAfter === stateBefore, `the light switched: ${stateBefore} → ${stateAfter}`);
  const scene = await context.app.ok("GET", `/api/scenes/${entityId}`);
  const device = scene.devices.find((item) => item.entityId === light);
  assert(device?.values?.state === wanted.state, JSON.stringify(scene.devices));

  context.shared.scene = { entityId, light, stateBefore, wanted };
  return `${entityId}: ${light} stays ${stateAfter}`;
}

async function checkScenePreview(context) {
  const { entityId, light, stateBefore, wanted } = context.shared.scene ?? {};
  assert(entityId, "no scene from the check before");

  await context.app.ok("POST", `/api/scenes/${entityId}/preview`, {
    entities: { [light]: wanted },
  });
  await sleep(TIMING.switchMs);
  const inPreview = await stateOf(context, light);
  assert(inPreview === wanted.state, `preview shows ${inPreview}`);

  await context.app.ok("POST", `/api/scenes/${entityId}/restore`, {});
  await sleep(TIMING.switchMs);
  const restored = await stateOf(context, light);
  assert(restored === stateBefore, `after restore ${restored} instead of ${stateBefore}`);
  return `${stateBefore} → preview ${inPreview} → back ${restored}`;
}

async function checkExistingScene(context) {
  const entityId = await context.entityIdOf(TEST_DATA.scene.name);
  const scene = await context.app.ok("GET", `/api/scenes/${entityId}`);
  const values = scene.devices.map(
    (device) => `${device.entityId}=${JSON.stringify(device.values)}`,
  );

  assert(scene.isEditable && scene.devices.length > 0, JSON.stringify(scene));
  return values.join("; ");
}
