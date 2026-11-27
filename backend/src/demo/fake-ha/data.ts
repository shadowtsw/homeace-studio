import { CATEGORY_SCOPE, type CategoryScope } from "../../categories/categories.constants";
import type {
  HaArea,
  HaCategory,
  HaDevice,
  HaEntityRegistryEntry,
  HaLabel,
  HaState,
} from "../../ha/ha.types";
import { DEMO_EVENT_DELAY_MS } from "../demo.constants";
import type { DemoHome } from "../demo-home";
import type { EventHandler, FlowKind, Payload } from "./shared";

/** Everything the fake HA keeps. `FakeHa` owns it; the topic modules read and change it. */
export type FakeHaData = {
  readonly home: DemoHome;
  readonly registry: Map<string, HaEntityRegistryEntry>;
  readonly states: Map<string, HaState>;
  /** States of disabled entities wait here until they are enabled again. */
  readonly unloaded: Map<string, HaState>;
  /** Stored helpers by "<type>.<id>", once created or updated; others come from their state. */
  readonly helperItems: Map<string, Payload>;
  readonly categories: Map<CategoryScope, HaCategory[]>;
  /** scenes.yaml by scene id. */
  readonly sceneConfigs: Map<string, Payload>;
  readonly flowConfigs: Map<FlowKind, Map<string, Payload>>;
  readonly handlers: Map<string, EventHandler[]>;
  readonly devices: Map<string, HaDevice>;
  readonly areas: HaArea[];
  readonly labels: HaLabel[];
  /** Counts up for the ids of new devices and categories. */
  nextId: number;
  /** The demo home's own entities count as old, like a home in use; later ones are new. */
  isSeeded: boolean;
};

/** Empty registries on the demo home's areas and labels; `FakeHa` then adds the home's entities. */
export function createData(home: DemoHome): FakeHaData {
  const categories = new Map<CategoryScope, HaCategory[]>();

  for (const scope of Object.values(CATEGORY_SCOPE)) categories.set(scope, []);

  return {
    home,
    registry: new Map<string, HaEntityRegistryEntry>(),
    states: new Map<string, HaState>(),
    unloaded: new Map<string, HaState>(),
    helperItems: new Map<string, Payload>(),
    categories,
    sceneConfigs: new Map<string, Payload>(),
    flowConfigs: new Map<FlowKind, Map<string, Payload>>([
      ["automation", new Map()],
      ["script", new Map()],
    ]),
    handlers: new Map<string, EventHandler[]>(),
    devices: new Map<string, HaDevice>(),
    areas: home.areas,
    labels: home.labels,
    nextId: 1,
    isSeeded: false,
  };
}

/** Fires an HA event for its subscribers, a moment later like HA. */
export function emit({
  ha,
  eventType,
  data,
}: {
  ha: FakeHaData;
  eventType: string;
  data: Payload;
}): void {
  const handlers = ha.handlers.get(eventType) ?? [];

  if (handlers.length === 0) return;

  setTimeout(() => {
    for (const handler of handlers) handler({ event_type: eventType, data });
  }, DEMO_EVENT_DELAY_MS);
}

/** Changes a state and fires `state_changed`; an entity without a state is left alone. */
export function setState({
  ha,
  entityId,
  value,
  attributes = {},
}: {
  ha: FakeHaData;
  entityId: string;
  value: string;
  attributes?: Payload;
}): void {
  const oldState = ha.states.get(entityId);

  if (!oldState) return;

  const newState = {
    ...oldState,
    state: value,
    attributes: { ...oldState.attributes, ...attributes },
  };
  ha.states.set(entityId, newState);
  emit({
    ha,
    eventType: "state_changed",
    data: { entity_id: entityId, old_state: oldState, new_state: newState },
  });
}
