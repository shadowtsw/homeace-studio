// Copies core/ into frontend/src/core/ and backend/src/core/ (see core-copies.mjs for why).
// Run it after every change in core/; the checks fail while a copy differs.
//
// Usage (from the project root): node scripts/sync-core.mjs

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { expectedCopies, filesBelow, shown } from "./core-copies.mjs";

for (const target of expectedCopies()) {
  // Copies of files that no longer exist in core/ go away
  for (const file of filesBelow(target.dir)) {
    if (!target.contents.has(file)) rmSync(join(target.dir, file));
  }

  // Every core file, with the header line
  for (const [file, content] of target.contents) {
    const path = join(target.dir, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
  console.log(`${shown(target.dir)}: ${target.contents.size} files`);
}
