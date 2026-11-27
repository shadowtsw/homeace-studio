import { setState, type FakeHaData } from "./data";
import { applyScene } from "./scenes";
import { domainOf, now, type Payload } from "./shared";

/** Service calls that change a state, by service name. */
const STATE_BY_SERVICE: Partial<Record<string, string>> = {
  turn_on: "on",
  turn_off: "off",
  open_cover: "open",
  close_cover: "closed",
  open_valve: "open",
  close_valve: "closed",
};

type NextStateOptions = { service: string; entityId: string; current: string };

/** The state a service call leaves: toggled, a timestamp for buttons and scenes, or by service. */
function nextState({ service, entityId, current }: NextStateOptions): string | undefined {
  if (service === "toggle") return current === "on" ? "off" : "on";
  if (service === "press" || domainOf(entityId) === "scene") return now();
  return STATE_BY_SERVICE[service];
}

/** `call_service`: the targets change their state like in HA; `scene.apply` sets each device. */
export function callService({ ha, payload }: { ha: FakeHaData; payload: Payload }): null {
  if (payload.domain === "scene" && payload.service === "apply") return applyScene({ ha, payload });

  const service = String(payload.service);
  const target = (payload.target ?? {}) as { entity_id?: string | string[] };
  const entityIds = [target.entity_id ?? []].flat();

  for (const entityId of entityIds) {
    const state = ha.states.get(entityId);

    if (!state) continue;

    const next = nextState({ service, entityId, current: state.state });

    // "trigger" and "script.turn_on" run something but keep the state, like in HA.
    if (next && !(domainOf(entityId) === "script" && service === "turn_on")) {
      setState({ ha, entityId, value: next });
    }
  }

  return null;
}
