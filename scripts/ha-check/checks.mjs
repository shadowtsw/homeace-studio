// Runs the API checks of the HA check and prints each result. The checks themselves are in
// checks-flows.mjs and checks-home.mjs.

import { connectHaSocket, createAppApi, createHaRest } from "./clients.mjs";

/** Throws with `message` unless `condition` holds; the check then fails with that message. */
export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * Runs the checks in order, so later ones see what earlier ones changed (renames, a new scene).
 *
 * @param checks - `{ area, name, run(context) }`; `run` answers a short detail or nothing.
 * @returns `{ area, name, isOk, detail }` per check.
 */
export async function runChecks({ checks, appUrl, haUrl, token }) {
  const context = await createContext({ appUrl, haUrl, token });
  const results = [];

  for (const check of checks) {
    const result = await runCheck(check, context);
    results.push(result);
    printResult(result);
  }
  context.socket.close();

  return results;
}

async function runCheck({ area, name, run }, context) {
  try {
    const detail = await run(context);
    return { area, name, isOk: true, detail: detail ?? "" };
  } catch (error) {
    return { area, name, isOk: false, detail: error.message };
  }
}

function printResult({ area, name, isOk, detail }) {
  const mark = isOk ? "✅" : "❌";
  const suffix = detail ? ` — ${detail}` : "";

  console.log(`${mark} [${area}] ${name}${suffix}`);
}

/**
 * What every check gets: the app's API, HA's REST and WebSocket API, the demo entities it uses and a
 * `shared` object for values one check hands to a later one.
 */
async function createContext({ appUrl, haUrl, token }) {
  const app = createAppApi(appUrl);
  const haRest = createHaRest({ haUrl, token });
  const socket = await connectHaSocket({ haUrl, token });
  const entityIds = (await haRest("GET", "/api/states")).map((state) => state.entity_id);

  /** The entity ID of an entry by its name, read fresh, because checks rename entries. */
  async function entityIdOf(name) {
    const entries = await app.ok("GET", "/api/entries");
    const entityId = entries.find((entry) => entry.name === name)?.entityId;
    assert(entityId, `no entry "${name}"`);
    return entityId;
  }

  return {
    app,
    haRest,
    socket,
    appUrl,
    entityIdOf,
    lights: entityIds.filter((entityId) => entityId.startsWith("light.")),
    sensor: entityIds.find((entityId) => entityId.startsWith("sensor.")),
    shared: {},
  };
}
