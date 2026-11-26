import { SCRIPT_START_ACTION } from "./entityBlocks";

/** Whether a flow block starts a script without waiting (`script.turn_on`, also as old `service`). */
export function isScriptStartBlock(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;

  const block = raw as { action?: unknown; service?: unknown };
  return (block.action ?? block.service) === SCRIPT_START_ACTION;
}
