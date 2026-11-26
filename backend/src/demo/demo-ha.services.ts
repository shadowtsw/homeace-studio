import { HaConnectionService, type HaEventHandler } from "../ha/ha-connection.service";
import { HaRestService } from "../ha/ha-rest.service";
import { DEMO_ENDPOINT } from "./demo.constants";
import type { FakeHa } from "./fake-ha";

/**
 * Stand-in for the WebSocket connection in demo mode. It extends the real service so every module
 * keeps injecting `HaConnectionService`; only the public methods are replaced. The real one
 * connects lazily, so it never opens a socket here.
 */
export class DemoHaConnectionService extends HaConnectionService {
  constructor(private readonly fake: FakeHa) {
    super({ ...DEMO_ENDPOINT });
  }

  override call<TResult>(type: string, payload: Record<string, unknown> = {}): Promise<TResult> {
    // Like the real connection: errors arrive as a rejected promise, never synchronously.
    return Promise.resolve().then(() => this.fake.call({ type, payload }) as TResult);
  }

  override snapshot<TEvent>(type: string): Promise<TEvent> {
    return Promise.resolve().then(() => this.fake.snapshot(type) as TEvent);
  }

  override subscribe(eventType: string, handler: HaEventHandler): void {
    this.fake.subscribe({ eventType, handler });
  }

  override onModuleDestroy(): void {
    // Nothing to close.
  }
}

/** Stand-in for HA's REST API in demo mode. */
export class DemoHaRestService extends HaRestService {
  constructor(private readonly fake: FakeHa) {
    super({ ...DEMO_ENDPOINT });
  }

  override get<TResult>(path: string): Promise<TResult | null> {
    return Promise.resolve().then(() => this.fake.restGet(path) as TResult | null);
  }

  override post<TResult>(path: string, body: unknown): Promise<TResult> {
    return Promise.resolve().then(() => this.fake.restPost({ path, body }) as TResult);
  }

  override delete(path: string): Promise<void> {
    return Promise.resolve().then(() => this.fake.restDelete(path));
  }
}
