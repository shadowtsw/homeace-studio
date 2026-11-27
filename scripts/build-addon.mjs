// Assembles the local add-on folder the HA Supervisor builds from.
//
// The Supervisor's build context is the add-on folder itself, so it must contain the sources:
//   <out>/config.yaml, Dockerfile, DOCS.md, .dockerignore   (from homeace-studio/)
//   <out>/frontend/, <out>/backend/                         (sources, without node_modules/dist/.env)
//
// Usage (from the project root, Node 22+):
//   node scripts/build-addon.mjs                         → dist-addon/homeace_studio
//   node scripts/build-addon.mjs --to \\homeassistant.local\addons
//                                                        → <share>/homeace_studio (e.g. Samba share)
//   node scripts/build-addon.mjs --channel preview       → dist-addon/homeace_studio_preview
//
// The Preview channel (homeace-studio-preview/) holds only what differs from the normal app: config.yaml,
// DOCS.md, CHANGELOG.md and the icons. Everything else, the Dockerfile included, comes from
// homeace-studio/, so both channels build the same app from the same sources.

import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const CHANNELS = {
  stable: { slug: "homeace_studio", folder: "homeace-studio" },
  preview: { slug: "homeace_studio_preview", folder: "homeace-studio-preview" },
};
const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const ADDON_SOURCE = join(PROJECT_ROOT, CHANNELS.stable.folder);
const SOURCE_PARTS = ["frontend", "backend"];
/** Never copied: installed packages, build output, local secrets and caches. */
const SKIPPED_NAMES = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".env",
  ".eslintcache",
  ".vscode",
]);

/** The value after `--name` on the command line; `undefined` when the flag is missing. */
function flagValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;

  return process.argv[index + 1] ?? "";
}

const channelName = flagValue("--channel") ?? "stable";
const channel = CHANNELS[channelName];

if (!channel) {
  console.error(`Unknown channel "${channelName}", use: ${Object.keys(CHANNELS).join(", ")}`);
  process.exit(1);
}

const targetParent = flagValue("--to") ?? join(PROJECT_ROOT, "dist-addon");

if (!targetParent) {
  console.error("Missing folder after --to, e.g. --to \\\\homeassistant.local\\addons");
  process.exit(1);
}

const target = join(targetParent, channel.slug);
const keep = (path) => !SKIPPED_NAMES.has(basename(path));

// Start clean, so files deleted in the repo do not linger in the add-on folder.
if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
}

cpSync(ADDON_SOURCE, target, { recursive: true });

// The Preview's own files replace the normal app's ones of the same name.
if (channel !== CHANNELS.stable) {
  cpSync(join(PROJECT_ROOT, channel.folder), target, { recursive: true });
}

for (const part of SOURCE_PARTS) {
  cpSync(join(PROJECT_ROOT, part), join(target, part), { recursive: true, filter: keep });
}

// Released versions name a ready-made image; a local app must build from these sources instead.
const configPath = join(target, "config.yaml");
const config = readFileSync(configPath, "utf8");
writeFileSync(configPath, config.replace(/^image:.*\r?\n/m, ""));

console.log(`Add-on folder ready: ${target}`);
console.log("In HA: Settings → Apps → App store → ⋮ → Check for updates → Local apps.");
