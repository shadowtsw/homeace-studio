// Opens every test flow in the app (headless Edge or Chrome, see ../devtools.mjs) and counts the
// blocks the editor does not know, plus console errors. Changes nothing, so it runs before the API
// checks.

import { click, evaluate, open, sleep, startBrowser } from "../devtools.mjs";
import { TEST_DATA } from "./constants.mjs";

const DEBUG_PORT = 9344;
const VIEW = { width: 1440, height: 900, scale: 1, isMobile: false, isDark: false };
const FLOW_SETTLE_MS = 1200;

const COUNT_BLOCKS = `(() => ({
  blocks: document.querySelectorAll(".flow-block").length,
  unknown: document.querySelectorAll(".flow-block--unknown").length,
}))()`;

/**
 * @returns `{ flows: [{ name, blocks, unknown }], consoleErrors }`.
 */
export async function checkUi({ appUrl }) {
  const automationNames = Object.values(TEST_DATA.automations).map((automation) => automation.name);
  const flowNames = [...automationNames, TEST_DATA.script.name];
  const { page, stop } = await startBrowser({ debugPort: DEBUG_PORT });
  const consoleErrors = [];
  const flows = [];

  try {
    await listenForErrors(page, consoleErrors);
    await open(page, { appUrl, view: VIEW, locale: "en" });
    for (const name of flowNames) flows.push(await inspectFlow(page, name));
  } finally {
    await stop();
  }

  return { flows, consoleErrors };
}

async function listenForErrors(page, consoleErrors) {
  await page.send("Runtime.enable");
  page.on("Runtime.exceptionThrown", (event) => {
    consoleErrors.push(event.exceptionDetails?.exception?.description ?? "exception");
  });
  page.on("Runtime.consoleAPICalled", (event) => {
    if (event.type !== "error") return;
    consoleErrors.push(event.args.map((arg) => arg.value ?? arg.description).join(" "));
  });
}

async function inspectFlow(page, name) {
  await click(page, ".entry-list-row__open", name);
  await sleep(FLOW_SETTLE_MS);
  const counts = await evaluate(page, COUNT_BLOCKS);

  return { name, ...counts };
}
