import { firstValueFrom, take, toArray } from "rxjs";

import type {
  HaConnectionService,
  HaEventHandler,
  HaSubscribeOptions,
} from "../ha/ha-connection.service";
import { LIVE_DEBOUNCE_MS, LiveService } from "./live.service";

describe("LiveService", () => {
  it("subscribes to the live event types and fires once after a burst of relevant events", async () => {
    jest.useFakeTimers();
    const handlers = new Map<string, HaEventHandler>();
    const ha = {
      subscribe: ({ eventType, handler }: HaSubscribeOptions) => handlers.set(eventType, handler),
    } as unknown as HaConnectionService;
    const service = new LiveService(ha);
    service.onModuleInit();

    const emitted = firstValueFrom(service.changes$.pipe(take(1), toArray()));
    const registryHandler = handlers.get("category_registry_updated");
    const stateHandler = handlers.get("state_changed");

    registryHandler?.({ event_type: "category_registry_updated", data: {} });
    stateHandler?.({
      event_type: "state_changed",
      data: {
        entity_id: "automation.licht",
        old_state: { state: "on" },
        new_state: { state: "off" },
      },
    });
    jest.advanceTimersByTime(LIVE_DEBOUNCE_MS);

    await expect(emitted).resolves.toHaveLength(1);
    expect([...handlers.keys()]).toContain("entity_registry_updated");
    jest.useRealTimers();
  });
});
