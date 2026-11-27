// What the shared core is copied to. Used by sync-core.mjs (writes the copies) and
// check-core-copies.mjs (fails when a copy differs).
//
// core/ holds plain TypeScript without dependencies that the frontend and the backend both need, such
// as the check of an imported theme (the browser checks it, the backend checks it again). Each side
// gets a copy inside its own src/ and builds it like its own code, so the Dockerfile, build-addon.mjs
// and the image workflow stay as they are (owner's decision 2026-11-27, "Weg A").
//
// Rules: edit only in core/, then run `node scripts/sync-core.mjs`; relative imports only; tests in
// core/**/__tests__/ use Vitest and are copied to the frontend only (the backend runs Jest).

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

export const PROJECT_ROOT = resolve(import.meta.dirname, "..");
export const CORE_DIR = join(PROJECT_ROOT, "core");
/** Where the copies go; each side's src/core/ belongs to the copies alone. */
export const TARGETS = [
  { name: "frontend", dir: join(PROJECT_ROOT, "frontend", "src", "core"), withTests: true },
  { name: "backend", dir: join(PROJECT_ROOT, "backend", "src", "core"), withTests: false },
];

const TEST_FOLDER = "__tests__";
const COPIED_FILE = /\.ts$/;

/** Every file below `dir`, as paths relative to it with forward slashes. */
export function filesBelow(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return filesBelow(path).map((file) => `${name}/${file}`);
    }
    return [name];
  });
}

function isTestFile(file) {
  return file.split("/").includes(TEST_FOLDER);
}

/** The first line of every copy, so nobody edits it there by mistake. */
function header(file) {
  return `// Copied from core/${file} by scripts/sync-core.mjs. Edit it there and run the script.\n`;
}

/**
 * What every target should contain: relative path → content.
 *
 * @returns One map per target.
 */
export function expectedCopies() {
  const coreFiles = filesBelow(CORE_DIR).filter((file) => COPIED_FILE.test(file));

  return TARGETS.map((target) => {
    const files = coreFiles.filter((file) => target.withTests || !isTestFile(file));
    const contents = new Map(
      files.map((file) => [file, header(file) + readFileSync(join(CORE_DIR, file), "utf8")]),
    );
    return { ...target, contents };
  });
}

/** A path for messages, from the project root. */
export function shown(path) {
  return relative(PROJECT_ROOT, path).split(sep).join("/");
}
