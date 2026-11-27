// Checks that frontend/src/core/ and backend/src/core/ are exact copies of core/ (see
// core-copies.mjs), so the browser and the backend always check with the same rules.
//
// Usage (from the project root): node scripts/check-core-copies.mjs   → exit 1 on a difference

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expectedCopies, filesBelow, shown } from "./core-copies.mjs";

const problems = [];

for (const target of expectedCopies()) {
  const present = new Set(filesBelow(target.dir));

  for (const [file, content] of target.contents) {
    const path = join(target.dir, file);
    if (!present.has(file)) problems.push(`missing: ${shown(path)}`);
    // Line endings may differ on Windows checkouts; the text itself may not
    else if (normalized(readFileSync(path, "utf8")) !== normalized(content)) {
      problems.push(`differs from core/: ${shown(path)}`);
    }
  }
  for (const file of present) {
    if (!target.contents.has(file)) problems.push(`not in core/: ${shown(join(target.dir, file))}`);
  }
}

function normalized(text) {
  return text.replace(/\r\n/g, "\n");
}

if (problems.length > 0) {
  console.error("The copies of core/ are out of date. Run: node scripts/sync-core.mjs");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log("The copies of core/ match.");
