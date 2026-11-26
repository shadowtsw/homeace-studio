// Records the short clips for the README and the release posts from a running demo.
//
//   1. Start the demo (see screenshots.mjs), e.g. on port 3100.
//   2. Run:  node scripts/recordings.mjs [--url http://localhost:3100/] [--out docs/images]
//              [--mp4-out <folder>] [--locale en] [--only name,name]
//
// Writes <name>.gif into --out (README) and, with --mp4-out, <name>.mp4 there too (posts: sharper and
// smaller than a GIF; keep them out of the repo). Needs ffmpeg on the PATH.
//
// How: clicks, the slider and drags are the page's own events, sent to whatever lies under a drawn
// pointer (a headless browser draws no pointer and no drag image). That keeps a recording free of the
// browser's own drag handling, which holds a drag open between frames. A screenshot takes longer than a frame lasts, so pointer
// movement is filmed frame by frame (stop motion, every frame the same length) and only waiting uses
// real time, so the app's own fades and slides keep their pace.
//
// The demo keeps what a clip changes (a new automation, a sorted device): restart it before a
// second run.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { argument, click, evaluate, open, sleep, startBrowser } from "./devtools.mjs";

const DEBUG_PORT = 9334;
const MOVE_FRAME_MS = 40; // 25 frames per second while the pointer moves
const GIF_WIDTH = 960;
const GIF_FPS = 15;
/** The clips play this much faster than filmed; at the real pace people fell asleep (owner). */
const PLAYBACK_SPEED = 1.3;
const GIF_COLORS = 128;

const appUrl = argument("--url", "http://localhost:3100/");
const outDir = resolve(argument("--out", "docs/images"));
const mp4Dir = argument("--mp4-out", "");
const locale = argument("--locale", "en");
const only = argument("--only", "").split(",").filter(Boolean);

const VIEW = { width: 1280, height: 800, scale: 1, isMobile: false };
const ONLY_ENTITIES = { "homeace.scopes": JSON.stringify(["entities"]) };
/** Demo entities ticked in the folder clip, in this order; the first one is dragged. */
const TICKED_FOR_FOLDER = [
  "light.living_room_floor_lamp",
  "light.living_room",
  "switch.power_strip_outlet_1",
];

// ---------------------------------------------------------------------------------------------
// Film: frames with their durations
// ---------------------------------------------------------------------------------------------

function createFilm(page) {
  const frames = [];

  async function shoot() {
    await evaluate(page, "window.__recording.tick()");
    const { data } = await page.send("Page.captureScreenshot", {
      format: "jpeg",
      quality: 88,
      optimizeForSpeed: true,
    });
    return data;
  }

  return {
    frames,
    /** One frame of a fixed length (stop motion). */
    async frame(ms = MOVE_FRAME_MS) {
      frames.push({ data: await shoot(), seconds: ms / 1000 });
    },
    /** Films in real time for `ms`, so the app's own animations keep their pace. */
    async wait(ms) {
      const end = performance.now() + ms;
      while (performance.now() < end) {
        const started = performance.now();
        const data = await shoot();
        frames.push({ data, seconds: (performance.now() - started) / 1000 });
      }
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Drawn pointer and drag label
// ---------------------------------------------------------------------------------------------

const POINTER_SCRIPT = `(() => {
  const pointer = document.createElement("div");
  pointer.innerHTML = '<svg width="22" height="26" viewBox="0 0 22 26"><path d="M2 2 L2 21 L7 16.5 L10.5 24 L14 22.5 L10.5 15 L17 15 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  pointer.style.cssText = "position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform-origin:2px 2px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))";
  const label = document.createElement("div");
  label.style.cssText = "position:fixed;left:0;top:0;z-index:2147483646;pointer-events:none;display:none;padding:6px 12px;border-radius:999px;background:#2f4fd8;color:#fff;font:600 13px system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.25)";
  // One invisible pixel that changes before every frame: a screenshot of a page without any
  // change can wait many seconds for the next repaint.
  const tick = document.createElement("div");
  tick.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;z-index:2147483647;pointer-events:none;background:#000;opacity:0.01";
  document.body.append(pointer, label, tick);
  window.__recording = {
    move(x, y) {
      pointer.style.translate = (x - 2) + "px " + (y - 2) + "px";
      label.style.translate = (x + 14) + "px " + (y + 16) + "px";
    },
    press(isDown) { pointer.style.scale = isDown ? "0.85" : "1"; },
    carry(text) { label.textContent = text; label.style.display = text ? "block" : "none"; },
    tick() { tick.style.opacity = tick.style.opacity === "0.01" ? "0.02" : "0.01"; },
    drag: dragEvents(),
    /** A click on whatever is under the pointer, with the events a mouse sends. */
    click(x, y) {
      const element = document.elementFromPoint(x, y);
      const init = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0 };
      element.dispatchEvent(new PointerEvent("pointerdown", init));
      element.dispatchEvent(new MouseEvent("mousedown", init));
      element.dispatchEvent(new PointerEvent("pointerup", init));
      element.dispatchEvent(new MouseEvent("mouseup", init));
      element.dispatchEvent(new MouseEvent("click", init));
    },
    /** Sets a range input to the value under x, as dragging its thumb would. */
    slideTo(selector, x, isDone) {
      const input = document.querySelector(selector);
      const box = input.getBoundingClientRect();
      const share = Math.min(1, Math.max(0, (x - box.left) / box.width));
      const value = Number(input.min || 0) + share * (Number(input.max || 100) - Number(input.min || 0));
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setValue.call(input, String(Math.round(value)));
      input.dispatchEvent(new Event(isDone ? "change" : "input", { bubbles: true }));
    },
  };

  // The page's own drag events with a real DataTransfer, without the browser's drag machinery:
  // while the browser runs a drag of its own, screenshots take seconds to minutes.
  function dragEvents() {
    let transfer, source, under;
    const fire = (element, type, x, y) =>
      element.dispatchEvent(new DragEvent(type, {
        bubbles: true, cancelable: true, composed: true, dataTransfer: transfer, clientX: x, clientY: y,
      }));
    return {
      start(x, y) {
        transfer = new DataTransfer();
        source = document.elementFromPoint(x, y);
        under = null;
        fire(source, "dragstart", x, y);
      },
      over(x, y) {
        const element = document.elementFromPoint(x, y);
        if (element !== under) {
          if (under) fire(under, "dragleave", x, y);
          fire(element, "dragenter", x, y);
          under = element;
        }
        fire(element, "dragover", x, y);
      },
      drop(x, y) {
        fire(document.elementFromPoint(x, y), "drop", x, y);
        fire(source, "dragend", x, y);
      },
    };
  }
  window.__recording.move(640, 400);
})()`;

/** Mouse actions with a visible pointer, filmed as they happen. */
function createHand(page, film) {
  const at = { x: 640, y: 400 };

  async function centerOf(selector, text = "") {
    const point = await evaluate(
      page,
      `(() => {
        const el = [...document.querySelectorAll(${JSON.stringify(selector)})]
          .find((node) => node.textContent.includes(${JSON.stringify(text)}));
        if (!el) return null;
        const box = el.getBoundingClientRect();
        return { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) };
      })()`,
    );
    if (!point) throw new Error(`Not on screen: ${selector} "${text}"`);
    return point;
  }

  /** Moves the pointer frame by frame; `onStep` sends the matching mouse or drag event. */
  async function glide(to, { ms = 600, onStep } = {}) {
    const from = { ...at };
    const steps = Math.max(1, Math.round(ms / MOVE_FRAME_MS));
    for (let step = 1; step <= steps; step++) {
      const progress = step / steps;
      const eased = progress < 0.5 ? 2 * progress ** 2 : 1 - (-2 * progress + 2) ** 2 / 2;
      at.x = Math.round(from.x + (to.x - from.x) * eased);
      at.y = Math.round(from.y + (to.y - from.y) * eased);
      await evaluate(page, `window.__recording.move(${at.x}, ${at.y})`);
      await onStep?.({ ...at });
      await film.frame();
    }
  }

  const press = (isDown) => evaluate(page, `window.__recording.press(${isDown})`);

  async function clickOn(selector, text) {
    await glide(await centerOf(selector, text));
    await press(true);
    await evaluate(page, `window.__recording.click(${at.x}, ${at.y})`);
    await film.frame(120);
    await press(false);
  }

  /** Drags a range input's thumb sideways by `pixels`, starting at `fromX`. */
  async function slide(selector, { fromX, pixels, ms = 1200 }) {
    const { y } = await centerOf(selector);
    const slideTo = (x, isDone) =>
      evaluate(page, `window.__recording.slideTo(${JSON.stringify(selector)}, ${x}, ${isDone})`);
    await glide({ x: fromX, y });
    await press(true);
    await glide({ x: fromX + pixels, y }, { ms, onStep: (point) => slideTo(point.x, false) });
    await slideTo(at.x, true);
    await press(false);
  }

  /** A drag as the page sees it: dragstart, dragenter/dragover along the way, drop, dragend. */
  async function drag({ from, to, label, hoverMs = 700 }) {
    const dragEvent = (type, point) =>
      evaluate(page, `window.__recording.drag.${type}(${point.x}, ${point.y})`);
    await glide(await centerOf(...from));
    await press(true);
    await dragEvent("start", at);
    await evaluate(page, `window.__recording.carry(${JSON.stringify(label)})`);
    await glide(await centerOf(...to), { ms: 900, onStep: (point) => dragEvent("over", point) });
    await film.wait(hoverMs);
    await dragEvent("drop", at);
    await evaluate(page, "window.__recording.carry('')");
    await press(false);
  }

  return { clickOn, slide, drag, centerOf, wait: film.wait };
}

// ---------------------------------------------------------------------------------------------
// Frames → GIF and MP4
// ---------------------------------------------------------------------------------------------

/** Writes the frames with their durations and lets ffmpeg build the GIF (and the MP4). */
function encode(frames, { name, crop }) {
  const work = mkdtempSync(join(tmpdir(), "homeace-clip-"));
  try {
    const lines = [];
    frames.forEach((frame, index) => {
      const file = `f${String(index).padStart(5, "0")}.jpg`;
      writeFileSync(join(work, file), Buffer.from(frame.data, "base64"));
      const seconds = frame.seconds / PLAYBACK_SPEED;
      lines.push(`file '${file}'`, `duration ${Math.max(seconds, 0.001).toFixed(3)}`);
    });
    lines.push(lines.at(-2)); // ffmpeg's concat format ignores the last duration otherwise
    writeFileSync(join(work, "frames.txt"), lines.join("\n"));
    const seconds = frames.reduce((sum, frame) => sum + frame.seconds, 0) / PLAYBACK_SPEED;
    console.log(`  ${name}: ${frames.length} frames, ${seconds.toFixed(1)} s`);

    const input = ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "frames.txt"];
    // A cropped clip is narrow already; it keeps its size instead of being scaled to GIF_WIDTH.
    const cropFilter = crop ? `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},` : "";
    const gifWidth = crop ? Math.min(crop.width, GIF_WIDTH) : GIF_WIDTH;
    const gifFilter =
      `${cropFilter}fps=${GIF_FPS},scale=${gifWidth}:-1:flags=lanczos,split[a][b];` +
      `[a]palettegen=max_colors=${GIF_COLORS}:stats_mode=diff[p];` +
      "[b][p]paletteuse=dither=none:diff_mode=rectangle";
    const gif = join(outDir, `${name}.gif`);
    execFileSync("ffmpeg", [...input, "-vf", gifFilter, "-loop", "0", gif], { cwd: work });
    console.log("    " + gif);

    if (mp4Dir) {
      const mp4 = resolve(mp4Dir, `${name}.mp4`);
      const mp4Video = [
        "-vf",
        `${cropFilter}fps=30,format=yuv420p`,
        "-c:v",
        "libx264",
        "-crf",
        "20",
      ];
      execFileSync("ffmpeg", [...input, ...mp4Video, "-movflags", "+faststart", mp4], {
        cwd: work,
      });
      console.log("    " + mp4);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------
// The clips
// ---------------------------------------------------------------------------------------------

/** Each clip: how the page looks, what happens before filming, and what is filmed. */
const CLIPS = [
  {
    name: "drag-into-flow-light",
    view: { ...VIEW, isDark: false },
    stored: ONLY_ENTITIES,
    prepare: async (page) => {
      await openFolder(page, ["House", "Terrace"]);
      await click(page, ".entry-list__title-row button", "New");
      await click(page, ".entry-list__new-menu button", "Automation");
      await evaluate(page, `document.querySelector(".dialog-frame input")?.focus()`);
      await page.send("Input.insertText", { text: "Terrace light when someone comes" });
      await click(page, ".dialog-frame__buttons button", "Create");
      await sleep(1200);
      await closeToasts(page);
    },
    record: async (hand) => {
      await hand.drag({
        from: [".entity-list-row", "Terrace motion"],
        to: [".flow-view__section--when"],
        label: "Terrace motion",
      });
      await hand.wait(600);
      await hand.clickOn(".choice-list__item", "Motion detected");
      await hand.wait(800);
      await hand.drag({
        from: [".entity-list-row", "Terrace light"],
        to: [".flow-view__section--then"],
        label: "Terrace light",
      });
      await hand.wait(600);
      await hand.clickOn(".choice-list__item", "Turn on");
    },
  },
  {
    name: "scenes-dark",
    view: { ...VIEW, isDark: true },
    prepare: async (page) => {
      await openFolder(page, ["House"]);
      await click(page, ".entry-list-row__open", "Cozy evening");
    },
    record: async (hand) => {
      const slider = ".scene-row__brightness";
      const { x } = await hand.centerOf(slider);
      await hand.slide(slider, { fromX: x - 80, pixels: 150 });
      await hand.wait(400);
      await hand.clickOn('.scene-row__swatch[aria-label="Purple"]');
      await hand.wait(900);
      await hand.clickOn("button", "Preview");
      await hand.wait(2000);
      await hand.clickOn("button", "Stop preview");
    },
  },
  {
    name: "sort-into-folder-light",
    view: { ...VIEW, isDark: false },
    // Navigation and list only: the empty details would take half the picture.
    crop: { x: 0, y: 0, width: 660, height: VIEW.height },
    stored: ONLY_ENTITIES,
    prepare: async (page) => {
      await click(page, ".category-tree__special", "Uncategorized");
      // The demo has many loose entities (the sorting tool's work); the search finds the three
      await evaluate(page, `document.querySelector(".entry-list__search input")?.focus()`);
      await page.send("Input.insertText", { text: "Living room" });
      await sleep(600);
      // The toast sits in the middle of the page and the crop would cut it in half; opening the
      // folder at the end shows the result anyway.
      await evaluate(
        page,
        // !important: the toast host's own scoped style would win otherwise
        `document.head.insertAdjacentHTML("beforeend", "<style>.toast-host{display:none !important}</style>")`,
      );
    },
    record: async (hand) => {
      // Tick three, then drag one of them: all three go along
      for (const entityId of TICKED_FOR_FOLDER) {
        await hand.clickOn(`[data-plain-entity-id="${entityId}"] .entity-list-row__check`);
        await hand.wait(250);
      }
      await hand.wait(600);
      await hand.drag({
        from: [".entity-list-row", "Floor lamp"],
        to: [".category-tree-node", "House"],
        label: `Floor lamp +${TICKED_FOR_FOLDER.length - 1}`,
        hoverMs: 500,
      });
      await hand.wait(800);
      await hand.clickOn(".category-tree-node", "House");
    },
  },
];

/** Closes the toasts that are showing (they would cover the first seconds of a clip). */
async function closeToasts(page) {
  await evaluate(
    page,
    `document.querySelectorAll(".toast-host__close").forEach((button) => button.click())`,
  );
  await sleep(300);
}

/** Opens a folder path in the tree, e.g. ["House", "Terrace"]. */
async function openFolder(page, path) {
  for (const name of path) await click(page, ".category-tree-node", name);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  if (mp4Dir) mkdirSync(resolve(mp4Dir), { recursive: true });
  const { page, stop } = await startBrowser({
    debugPort: DEBUG_PORT,
    windowSize: `${VIEW.width},${VIEW.height}`,
  });
  try {
    console.log(`Clips of ${appUrl} → ${outDir}`);
    const clips = only.length > 0 ? CLIPS.filter((clip) => only.includes(clip.name)) : CLIPS;
    for (const clip of clips) {
      await open(page, { appUrl, view: clip.view, locale, stored: clip.stored, keepMotion: true });
      // The big tidy-up card would take the eye; folded it is one quiet line.
      await click(page, ".cleanup-hint button", "Later");
      await clip.prepare(page);
      await evaluate(page, POINTER_SCRIPT);
      const film = createFilm(page);
      await film.frame(700); // a calm first look before anything moves
      await clip.record(createHand(page, film));
      await film.wait(1200);
      await film.frame(1500); // the result stays a moment before the GIF starts over
      encode(film.frames, clip);
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
