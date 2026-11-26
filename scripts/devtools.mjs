// Shared helpers for scripts that drive a headless Edge or Chrome through the DevTools protocol
// (screenshots.mjs, recordings.mjs). No extra packages: Node 22+ has a WebSocket built in.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const SETTLE_MS = 700;
const BROWSER_START_ATTEMPTS = 50;
const CLICK_ATTEMPTS = 25;
const CLICK_RETRY_MS = 200;

const BROWSER_CANDIDATES = [
  process.env.BROWSER_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/microsoft-edge",
].filter(Boolean);

/**
 * A browser that only shows the page. Without these, Edge starts its own extensions, updates and
 * sync next to it, and after about 15 seconds a screenshot takes seconds to minutes (measured with
 * Edge 158 on Windows, even on an empty page). The last three keep a window nobody looks at awake.
 */
const QUIET_BROWSER = [
  "--disable-extensions",
  "--disable-component-extensions-with-background-pages",
  "--disable-component-update",
  "--disable-background-networking",
  "--disable-sync",
  "--disable-default-apps",
  "--no-default-browser-check",
  "--metrics-recording-only",
  "--no-pings",
  "--mute-audio",
  "--disable-client-side-phishing-detection",
  "--disable-domain-reliability",
  "--disable-breakpad",
  "--disable-hang-monitor",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
];

export const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** The value after `--name` on the command line, or `fallback`. */
export function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

/** Minimal DevTools protocol client for one page; `on` listens to protocol events. */
async function connect(wsUrl) {
  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  const listeners = new Map();
  let nextId = 1;

  socket.addEventListener("message", (message) => {
    const data = JSON.parse(String(message.data));
    if (data.method) {
      for (const listener of listeners.get(data.method) ?? []) listener(data.params);
      return;
    }
    const waiter = pending.get(data.id);
    if (!waiter) return;
    pending.delete(data.id);
    if (data.error) waiter.reject(new Error(data.error.message));
    else waiter.resolve(data.result);
  });
  await new Promise((done, fail) => {
    socket.addEventListener("open", done, { once: true });
    socket.addEventListener("error", fail, { once: true });
  });

  return {
    send(method, params = {}) {
      const id = nextId++;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((done, fail) => pending.set(id, { resolve: done, reject: fail }));
    },
    /** Listens to a protocol event; returns a function that stops listening. */
    on(method, listener) {
      listeners.set(method, [...(listeners.get(method) ?? []), listener]);
      return () =>
        listeners.set(
          method,
          listeners.get(method).filter((known) => known !== listener),
        );
    },
    close: () => socket.close(),
  };
}

function findBrowser() {
  const path = BROWSER_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!path) throw new Error("No Edge or Chrome found; set BROWSER_PATH.");
  return path;
}

/**
 * Starts a headless browser with a fresh profile and connects to its page.
 * Call `stop()` at the end; it also removes the profile. `windowSize` should match the emulated
 * view when recording.
 */
export async function startBrowser({ debugPort, windowSize = "1440,900" }) {
  const profile = mkdtempSync(join(tmpdir(), "homeace-browser-"));
  const browser = spawn(findBrowser(), [
    "--headless=new",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    "--hide-scrollbars",
    "--no-first-run",
    ...QUIET_BROWSER,
    "--lang=en-US",
    `--window-size=${windowSize}`,
    "about:blank",
  ]);
  const stop = async () => {
    browser.kill();
    await sleep(500);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      // The browser may still hold a file for a moment; the temp folder is cleaned up later anyway.
    }
  };

  let target;
  for (let attempt = 0; attempt < BROWSER_START_ATTEMPTS && !target; attempt++) {
    await sleep(200);
    try {
      const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
      target = targets.find((item) => item.type === "page");
    } catch {
      // The browser is still starting.
    }
  }
  if (!target) {
    await stop();
    throw new Error("The browser did not start.");
  }
  const page = await connect(target.webSocketDebuggerUrl);
  // "Leave the page?" for unsaved edits would block the next reload; scripts always leave.
  page.on("Page.javascriptDialogOpening", () =>
    page.send("Page.handleJavaScriptDialog", { accept: true }),
  );
  await page.send("Page.enable");
  return { page, stop };
}

/** Runs code in the page and returns its result. */
export async function evaluate(page, expression) {
  const { result, exceptionDetails } = await page.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? expression);
  return result.value;
}

/** Clicks the first element matching `selector` whose text contains `text`. */
export async function click(page, selector, text) {
  // The data loads after the page; try again for a few seconds before giving up.
  for (let attempt = 0; attempt < CLICK_ATTEMPTS; attempt++) {
    if (await tryClick(page, selector, text)) {
      await sleep(SETTLE_MS);
      return;
    }
    await sleep(CLICK_RETRY_MS);
  }
  throw new Error(`Nothing to click: ${selector} "${text ?? ""}"`);
}

function tryClick(page, selector, text) {
  return evaluate(
    page,
    `(() => {
      const el = [...document.querySelectorAll(${JSON.stringify(selector)})]
        .find((node) => node.textContent.includes(${JSON.stringify(text ?? "")}));
      if (!el) return false;
      // No scrollIntoView: it would also shift containers with overflow: hidden.
      el.click();
      return true;
    })()`,
  );
}

/**
 * Opens the app fresh: viewport, colour scheme, language and kept preferences.
 * `stored` holds extra localStorage entries (e.g. the chosen list filters).
 */
export async function open(page, { appUrl, view, locale, stored = {}, keepMotion = false }) {
  const { width, height, scale, isMobile, isDark } = view;
  await page.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: scale,
    mobile: isMobile,
  });
  await page.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: isDark ? "dark" : "light" }],
  });
  await page.send("Page.navigate", { url: appUrl });
  await sleep(SETTLE_MS);
  const entries = { "homeace.locale": locale, ...stored };
  await evaluate(
    page,
    `localStorage.clear();
     for (const [key, value] of Object.entries(${JSON.stringify(entries)})) localStorage.setItem(key, value);`,
  );
  await page.send("Page.reload");
  await sleep(SETTLE_MS * 2);
  if (keepMotion) return;
  // Slide-ins must be finished on the picture, whatever the browser's frame timing.
  await evaluate(
    page,
    `document.head.insertAdjacentHTML("beforeend",
      "<style>*,*::before,*::after{transition:none!important;animation:none!important}</style>")`,
  );
}
