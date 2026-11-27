import { checkThemeText } from "@/core/themes/checkTheme";
import { themeFileValue } from "@/core/themes/themeFormat";

import type { GateMessage } from "./themeGate";

/**
 * The gate's own process: it gets the text of a theme file and answers with the check result, the
 * theme in the file format (the page checks it once more). It has no access to the page, Home
 * Assistant or stored data; the page ends it after a time limit.
 *
 * The app's TypeScript setup knows the window, not a worker, so the worker's two functions are
 * described here by hand.
 */
type WorkerScope = {
  addEventListener(type: "message", listener: (event: MessageEvent<unknown>) => void): void;
  postMessage(message: GateMessage): void;
};

const workerScope = globalThis as unknown as WorkerScope;

workerScope.addEventListener("message", (event) => {
  const result = checkThemeText(event.data);
  if (!result.isValid) {
    workerScope.postMessage(result);
    return;
  }

  const file = themeFileValue(result.theme);
  workerScope.postMessage({ isValid: true, file, report: result.report });
});
