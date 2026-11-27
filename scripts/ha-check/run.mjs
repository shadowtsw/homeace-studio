// HA check: a throwaway Home Assistant (by default the current beta) with the demo integration and the
// app, both in Docker. Fills HA with a small test home and runs the quick checks of
// docs/ha-compatibility.md in the UI and through the app's API. See docs/recipes.md#ha-release-check.
//
//   node scripts/ha-check/run.mjs                    → HA beta, app built from this working tree
//   node scripts/ha-check/run.mjs --ha stable        → another HA image tag (e.g. 2026.12.0)
//   node scripts/ha-check/run.mjs --image <tag>      → an app image built before (no build)
//   node scripts/ha-check/run.mjs --down             → remove containers, volumes and network
//
// Every run starts HA and the app from scratch. Afterwards both keep running to look around
// (addresses at the end). Needs Docker and Node.js 22+; the UI check needs Edge or Chrome.
// Exit code 1 when a check failed.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";
import { argument, sleep } from "../devtools.mjs";
import { FLOW_CHECKS } from "./checks-flows.mjs";
import { HOME_CHECKS } from "./checks-home.mjs";
import { runChecks } from "./checks.mjs";
import { waitForHa } from "./clients.mjs";
import {
  APP_IMAGE,
  APP_URL,
  CONTAINER_PORT,
  DEFAULT_HA_TAG,
  DOCKER_NAME,
  HA_CONFIGURATION,
  HA_IMAGE,
  HA_URL,
  HA_URL_IN_NETWORK,
  OWNER,
  PORT,
  TIMING,
} from "./constants.mjs";
import { setUpHa } from "./ha-setup.mjs";
import { checkUi } from "./ui-check.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
/** Docker Desktop on Windows; its folder also holds the credential helper `docker pull` needs. */
const WINDOWS_DOCKER_DIR = "C:\\Program Files\\Docker\\Docker\\resources\\bin";
/** Writes the configuration from stdin into the fresh volume, plus the empty files it includes. */
const WRITE_CONFIGURATION =
  "cat > /config/configuration.yaml && echo '[]' > /config/automations.yaml" +
  " && touch /config/scripts.yaml /config/scenes.yaml";
const NOT_COVERED = "HA user (ingress headers), Supervisor (install, update), icon packs from HACS";

const docker = createDocker();

await main();

async function main() {
  // Start from scratch, or only clean up
  removeAll();
  if (process.argv.includes("--down")) return console.log("Removed the HA check containers.");

  // HA with the demo integration and the test home
  const haImage = `${HA_IMAGE}:${argument("--ha", DEFAULT_HA_TAG)}`;
  startHa(haImage);
  const appImage = argument("--image", "") || buildApp();
  await waitForHa({ haUrl: HA_URL, timeoutMs: TIMING.haStartMs, pollMs: TIMING.pollMs });
  const setup = await setUpHa({ haUrl: HA_URL });
  console.log(`\nHA ${setup.version} (${haImage}) · app ${appImage}`);
  for (const note of setup.notes) console.log(`  HA refused: ${note}`);

  // The app, then the checks: the UI first, it changes nothing
  await startApp({ appImage, token: setup.token });
  const ui = await checkUi({ appUrl: APP_URL });
  printUi(ui);
  const checks = [...FLOW_CHECKS, ...HOME_CHECKS];
  const results = await runChecks({ checks, appUrl: APP_URL, haUrl: HA_URL, token: setup.token });

  // Summary; HA and the app keep running
  const isGreen = printSummary({ ui, results });
  process.exitCode = isGreen ? 0 : 1;
}

/** `docker(args, { input })` runs Docker and throws with its output when it fails. */
function createDocker() {
  const desktopDocker = join(WINDOWS_DOCKER_DIR, "docker.exe");
  const isDesktopOnWindows = process.platform === "win32" && existsSync(desktopDocker);
  const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === "PATH") ?? "PATH";
  const pathWithDocker = `${WINDOWS_DOCKER_DIR}${delimiter}${process.env[pathKey]}`;
  const envWithDocker = { ...process.env, [pathKey]: pathWithDocker };
  const env = isDesktopOnWindows ? envWithDocker : process.env;
  const command = isDesktopOnWindows ? desktopDocker : "docker";

  return function docker(args, { input, mayFail = false } = {}) {
    const result = spawnSync(command, args, { cwd: ROOT, env, input, encoding: "utf8" });
    const hasFailed = result.status !== 0 && !mayFail;

    if (hasFailed) throw new Error(`docker ${args[0]} failed:\n${result.stderr || result.error}`);
    return result.stdout.trim();
  };
}

function removeAll() {
  const containers = [DOCKER_NAME.app, DOCKER_NAME.ha];
  const volumes = [DOCKER_NAME.haVolume, DOCKER_NAME.appVolume];

  docker(["rm", "-f", ...containers], { mayFail: true });
  docker(["volume", "rm", ...volumes], { mayFail: true });
  docker(["network", "rm", DOCKER_NAME.network], { mayFail: true });
}

function startHa(haImage) {
  // The newest image, and its configuration in a fresh volume before the first start
  console.log(`Pulling ${haImage} …`);
  docker(["pull", "--quiet", haImage]);
  const volume = `${DOCKER_NAME.haVolume}:/config`;
  docker(["volume", "create", DOCKER_NAME.haVolume]);
  docker(
    ["run", "--rm", "-i", "-v", volume, "--entrypoint", "sh", haImage, "-c", WRITE_CONFIGURATION],
    {
      input: HA_CONFIGURATION,
    },
  );

  // HA in its own network, so the app reaches it by name
  const ports = `${PORT.ha}:${CONTAINER_PORT.ha}`;
  docker(["network", "create", DOCKER_NAME.network]);
  docker([
    "run",
    "-d",
    "--name",
    DOCKER_NAME.ha,
    "--network",
    DOCKER_NAME.network,
    "-p",
    ports,
    "-v",
    volume,
    haImage,
  ]);
}

/** Builds the app image from this working tree, uncommitted changes included (lint and tests run). */
function buildApp() {
  console.log("Building the app from this working tree (lint, tests, build) …");
  const buildArgs = ["--build-arg", "BUILD_VERSION=ha-check", "-t", APP_IMAGE];
  docker(["build", "--quiet", "-f", "homeace-studio/Dockerfile", ...buildArgs, "."]);
  return APP_IMAGE;
}

async function startApp({ appImage, token }) {
  const ports = `${PORT.app}:${CONTAINER_PORT.app}`;
  const volume = `${DOCKER_NAME.appVolume}:/config`;
  const env = [
    "-e",
    `HA_URL=${HA_URL_IN_NETWORK}`,
    "-e",
    `HA_TOKEN=${token}`,
    "-e",
    "HOMEACE_DEMO=false",
  ];
  docker([
    "run",
    "-d",
    "--name",
    DOCKER_NAME.app,
    "--network",
    DOCKER_NAME.network,
    "-p",
    ports,
    ...env,
    "-v",
    volume,
    appImage,
  ]);

  const deadline = Date.now() + TIMING.appStartMs;
  while (Date.now() < deadline) {
    const status = await fetch(`${APP_URL}/api/entries`).then(
      (response) => response.status,
      () => null,
    );
    if (status === 200) return;
    await sleep(TIMING.pollMs);
  }
  throw new Error(
    `The app did not answer at ${APP_URL}:\n${docker(["logs", "--tail", "20", DOCKER_NAME.app])}`,
  );
}

function printUi({ flows, consoleErrors }) {
  console.log("\nUI");
  for (const { name, blocks, unknown } of flows) {
    const mark = unknown === 0 && blocks > 0 ? "✅" : "❌";
    console.log(`${mark} "${name}": ${blocks} blocks, ${unknown} unknown`);
  }
  const errors = consoleErrors.length ? consoleErrors.join("\n   ") : "none";
  console.log(`${consoleErrors.length ? "❌" : "✅"} console errors: ${errors}\n\nAPI`);
}

function printSummary({ ui, results }) {
  const failedChecks = results.filter((result) => !result.isOk);
  const failedFlows = ui.flows.filter((flow) => flow.unknown > 0 || flow.blocks === 0);
  const isGreen =
    failedChecks.length === 0 && failedFlows.length === 0 && ui.consoleErrors.length === 0;
  const greenCount = results.length - failedChecks.length;

  console.log(
    `\n${isGreen ? "✅ All green" : "❌ Not green"}: API ${greenCount}/${results.length}, UI ${ui.flows.length - failedFlows.length}/${ui.flows.length} flows`,
  );
  console.log(`Not covered here: ${NOT_COVERED}.`);
  console.log(
    `HA: ${HA_URL} (${OWNER.username} / ${OWNER.password}) · app: ${APP_URL} · remove: --down`,
  );
  return isGreen;
}
