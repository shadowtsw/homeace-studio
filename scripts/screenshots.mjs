// Takes the README screenshots from a running demo (no extra packages).
//
//   1. Start the demo:  cd backend && npm run build && HOMEACE_DEMO=true PORT=3100 \
//        STATIC_DIR=../frontend/dist node dist/main.js   (build the frontend first: npm run build)
//   2. Run:             node scripts/screenshots.mjs [--url http://localhost:3100/] [--out docs/images]
//                         [--locale en] [--only name,name] [--with-posts]
//
// --locale de takes the same pictures in German (for German posts; keep them out of the repo with
// --out). --with-posts adds the pictures that are only for posts, not for the README.
// Drives Microsoft Edge or Google Chrome headless (see devtools.mjs); set BROWSER_PATH if the browser
// is not found.

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { SETTLE_MS, argument, click, evaluate, open, sleep, startBrowser } from "./devtools.mjs";

const DEBUG_PORT = 9333;

const appUrl = argument("--url", "http://localhost:3100/");
const outDir = resolve(argument("--out", "docs/images"));
const locale = argument("--locale", "en");
const only = argument("--only", "").split(",").filter(Boolean);
const withPosts = process.argv.includes("--with-posts");

async function capture(page, name) {
  const { data } = await page.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(outDir, name), Buffer.from(data, "base64"));
  console.log("  " + name);
}

const DESKTOP = { width: 1440, height: 900, scale: 1.5, isMobile: false };
const PHONE = { width: 390, height: 844, scale: 2, isMobile: true };

/** The README pictures: what each shows and how to get there. */
const SHOTS = [
  {
    name: "overview-light.png",
    view: { ...DESKTOP, isDark: false },
    steps: async (page) => {
      await click(page, ".category-tree-node", "House");
      await click(page, ".category-tree-node", "Terrace");
      await click(page, ".entry-list-row__open", "Terrace light on motion");
    },
  },
  {
    name: "flow-dark.png",
    view: { ...DESKTOP, isDark: true },
    steps: async (page) => {
      await click(page, ".category-tree-node", "House");
      await click(page, ".category-tree-node", "Garden");
      await click(page, ".entry-list-row__open", "Morning garden watering");
    },
  },
  {
    name: "editing-light.png",
    view: { ...DESKTOP, isDark: false },
    steps: async (page) => {
      await click(page, ".category-tree-node", "Energy");
      await click(page, ".entry-list-row__open", "Solar surplus into the wallbox");
      await click(page, ".flow-block__chip--editable", "1500");
    },
  },
  {
    name: "cleanup-light.png",
    view: { ...DESKTOP, isDark: false },
    steps: async (page) => {
      await click(page, ".cleanup-hint .btn--primary");
      await click(page, ".cleanup__section-head .btn", "Tick all");
      await click(page, ".cleanup__row:has(input[type=radio]) > input[type=checkbox]");
    },
  },
  {
    name: "checkup-light.png",
    view: { ...DESKTOP, isDark: false },
    steps: async (page) => {
      await click(page, ".category-tree__special", "Check-up");
      await click(page, ".checkup-list__open", "Hallway light at night");
    },
  },
  {
    name: "picker-dark.png",
    view: { ...DESKTOP, isDark: true },
    steps: async (page) => {
      await click(page, ".category-tree-node", "House");
      await click(page, ".category-tree-node", "Terrace");
      await click(page, ".entry-list-row__open", "Terrace light on motion");
      // The light of the "Turn on" action; the same name also appears in other blocks.
      await evaluate(
        page,
        `[...document.querySelectorAll(".flow-block__chip--entity")]
          .find((chip) => chip.closest(".flow-block")?.textContent.includes("Turn on"))
          ?.click()`,
      );
      await sleep(SETTLE_MS);
      await click(page, ".entity-picker__chip", "Living room");
    },
  },
  {
    name: "history-dark.png",
    view: { ...DESKTOP, isDark: true },
    steps: async (page) => {
      await click(page, ".category-tree-node", "House");
      await click(page, ".category-tree-node", "Garden");
      await click(page, ".entry-list-row__open", "Morning garden watering");
      await click(page, ".entry-detail-tabs__tab", "History");
      // Yesterday's run took the "then" branch: the dry-soil case.
      await click(page, ".history__run", "30 min");
    },
  },
  {
    name: "areas-light.png",
    view: { ...DESKTOP, isDark: false },
    steps: async (page) => {
      await click(page, ".category-tree__modes button", "Areas");
      await click(page, ".area-node__main", "Hallway");
      await click(page, ".entry-list-row__open", "Good night");
    },
  },
  {
    name: "dependencies-light.png",
    view: { ...DESKTOP, isDark: false },
    steps: async (page) => {
      await click(page, ".category-tree-node", "House");
      await click(page, ".category-tree-node", "Terrace");
      await click(page, ".entry-list-row__open", "Terrace light on motion");
      await click(page, ".entry-detail-tabs__tab", "Dependencies");
    },
  },
  {
    name: "properties-dark.png",
    view: { ...DESKTOP, isDark: true },
    steps: async (page) => {
      await click(page, ".category-tree-node", "House");
      await click(page, ".category-tree-node", "Terrace");
      await click(page, ".entry-list-row__open", "Terrace brightness at night");
      await click(page, ".entry-detail-tabs__tab", "Properties");
      // The entity ID and the visibility section are the new parts; scroll them into view.
      await evaluate(
        page,
        `document.querySelector(".entity-id")?.scrollIntoView({ block: "center" })`,
      );
      await sleep(SETTLE_MS);
    },
  },
  {
    name: "phone-dark.png",
    view: { ...PHONE, isDark: true },
    steps: async (page) => {
      await click(page, ".entry-list-head__nav-toggle");
      await click(page, ".category-tree-node", "House");
      await click(page, ".category-tree-node", "Terrace");
    },
  },
  {
    name: "phone-flow-light.png",
    view: { ...PHONE, isDark: false },
    steps: async (page) => {
      await click(page, ".entry-list-head__nav-toggle");
      await click(page, ".category-tree-node", "Routines");
      await click(page, ".entry-list-row__open", "Good night");
    },
  },
  {
    name: "helper-settings-light.png",
    view: { ...DESKTOP, isDark: false },
    steps: async (page) => {
      await click(page, ".category-tree-node", "House");
      await click(page, ".category-tree-node", "Terrace");
      await click(page, ".entry-list-row__open", "Terrace brightness at night");
      await click(page, ".entry-detail-tabs__tab", "Settings");
      // A minimum above the maximum: the check marks it red before anything is saved.
      await evaluate(
        page,
        `(() => {
          const field = [...document.querySelectorAll(".helper-settings__field")]
            .find((label) => label.textContent.includes("Minimum"));
          const input = field.querySelector("input");
          const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
          setValue.call(input, "120");
          input.dispatchEvent(new Event("input", { bubbles: true }));
        })()`,
      );
      await sleep(SETTLE_MS);
    },
  },
  {
    name: "labels-dark.png",
    view: { ...DESKTOP, isDark: true },
    steps: async (page) => {
      await click(page, ".category-tree-node", "House");
      await click(page, ".entry-list-row__open", "Cozy evening");
      await click(page, ".entry-detail-tabs__tab", "Properties");
      await click(page, "[data-label-toggle]");
      await evaluate(
        page,
        `[...document.querySelectorAll(".label-picker__row")]
          .find((row) => row.textContent.includes("Lights"))
          ?.querySelector(".label-picker__edit")?.click()`,
      );
      await sleep(SETTLE_MS);
      await click(page, ".label-edit__delete");
    },
  },
  {
    name: "settings-light.png",
    view: { ...DESKTOP, isDark: false },
    steps: async (page) => {
      await click(page, '[aria-label="Settings"]');
      await click(page, ".settings-window__tab", "Good to know");
      // The beta tool's topic stays out of the README until the owner approves the beta
      // (the last in the list, icon mdi-auto-fix). Remove these lines then.
      await evaluate(
        page,
        `document.querySelector(".settings-window .mdi-auto-fix")?.closest("button, li")?.style.setProperty("display", "none")`,
      );
    },
  },
  {
    // For the posts: the scene editor as a still picture.
    name: "scenes-light.png",
    isForPostsOnly: true,
    view: { ...DESKTOP, isDark: false },
    steps: async (page) => {
      await click(page, ".category-tree-node", "House");
      await click(page, ".entry-list-row__open", "Cozy evening");
    },
  },
  {
    // For the posts: automations, helpers and devices together in one folder.
    name: "entities-dark.png",
    isForPostsOnly: true,
    view: { ...DESKTOP, isDark: true },
    stored: { "homeace.scopes": JSON.stringify(["all", "entities"]) },
    steps: async (page) => {
      await click(page, ".category-tree-node", "House");
      await click(page, ".category-tree-node", "Terrace");
      await click(page, ".entry-list-row__open", "Terrace light on motion");
    },
  },
  {
    // Last, because it leaves a plan from an AI in the demo, which the other pictures should not show.
    name: "ai-plan-light.png",
    view: { ...DESKTOP, isDark: false },
    before: seedAiPlan,
    steps: async (page) => {
      await click(page, ".ai-hint .btn--primary");
    },
  },
];

/** Sends a folder plan through the MCP endpoint of the demo, as an AI client would. */
async function seedAiPlan() {
  const api = new URL("api/mcp", appUrl);
  const access = await fetch(api, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isEnabled: true }),
  });
  const { data } = await access.json();
  const mcp = new URL(`http://${new URL(appUrl).hostname}:${data.hostPort}${data.path}`);
  const plan = {
    title: "Sort by rooms",
    reasoning:
      "You mostly look for things by room, so security and the office move under House, and the old test goes to an archive instead of staying uncategorized.",
    operations: [
      { type: "renameFolder", from: "Security", to: "House/Security" },
      {
        type: "moveEntry",
        entityId: "automation.office_heating_in_the_morning",
        to: "House/Office",
      },
      {
        type: "moveEntry",
        entityId: "automation.office_lights_on_presence",
        to: "House/Office",
      },
      {
        type: "moveEntry",
        entityId: "input_number.office_target_temperature",
        to: "House/Office",
      },
      {
        type: "moveEntry",
        entityId: "automation.old_light_switch_test",
        to: "Archive",
      },
    ],
  };
  const response = await fetch(mcp, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${data.token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "propose_folder_plan", arguments: plan },
    }),
  });
  if (!response.ok) throw new Error(`MCP answered ${response.status}`);
  await response.text();
}

/** The pictures of this run: --only names them, else the README ones (and the post ones on request). */
function chosenShots() {
  if (only.length > 0) return SHOTS.filter((shot) => only.includes(shot.name));
  return SHOTS.filter((shot) => withPosts || !shot.isForPostsOnly);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const { page, stop } = await startBrowser({ debugPort: DEBUG_PORT });
  try {
    console.log(`Screenshots of ${appUrl} → ${outDir}`);
    for (const shot of chosenShots()) {
      await shot.before?.();
      await open(page, { appUrl, view: shot.view, locale, stored: shot.stored });
      await shot.steps(page);
      await capture(page, shot.name);
    }
    page.close();
  } finally {
    await stop();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
