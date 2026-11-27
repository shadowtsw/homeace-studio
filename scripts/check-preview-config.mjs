// Checks that the Preview app is the normal app under another name: homeace-studio-preview/config.yaml must
// equal homeace-studio/config.yaml except the keys below. So the Preview can never ask Home Assistant for
// more access (ports, APIs, folders) than the normal app, and the two files cannot drift apart unnoticed.
//
// Usage (from the project root): node scripts/check-preview-config.mjs   → exit 1 on a difference

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
/** Top-level keys the Preview sets on its own; every other line must be the same. */
const OWN_KEYS = ["name", "version", "slug", "description", "image", "panel_title"];
const OWN_KEY_LINE = new RegExp(`^(${OWN_KEYS.join("|")}):`);
/** Preview versions look like "0.15.0-preview.2". */
const PREVIEW_VERSION = /^version: "\d+\.\d+\.\d+-preview\.\d+"$/m;

/** The lines that have to match: no comments, no blank lines, no own keys. */
function comparableLines(file) {
  return readFileSync(join(PROJECT_ROOT, file), "utf8")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line !== "" && !line.trimStart().startsWith("#") && !OWN_KEY_LINE.test(line));
}

const stable = comparableLines("homeace-studio/config.yaml");
const preview = comparableLines("homeace-studio-preview/config.yaml");
const problems = [];

const longest = Math.max(stable.length, preview.length);
for (let index = 0; index < longest; index++) {
  if (stable[index] !== preview[index]) {
    problems.push(
      `line ${index + 1}: normal "${stable[index] ?? ""}" ≠ preview "${preview[index] ?? ""}"`,
    );
  }
}

const previewConfig = readFileSync(
  join(PROJECT_ROOT, "homeace-studio-preview/config.yaml"),
  "utf8",
);
if (!PREVIEW_VERSION.test(previewConfig)) {
  problems.push('version must look like "0.15.0-preview.1"');
}
if (!/^slug: homeace_studio_preview$/m.test(previewConfig)) {
  problems.push(
    "slug must stay homeace_studio_preview (another slug is another app for every user)",
  );
}

if (problems.length) {
  console.error("homeace-studio-preview/config.yaml differs from the normal app:");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(
  "Preview config matches the normal app (apart from name, version, slug, description, image, panel title).",
);
