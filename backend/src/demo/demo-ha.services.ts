import {
  HaConnectionService,
  type HaCallOptions,
  type HaSnapshotOptions,
  type HaSubscribeOptions,
} from "../ha/ha-connection.service";
import { HaRestService, type HaPostOptions } from "../ha/ha-rest.service";
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

  override call<TResult>({ type, payload = {} }: HaCallOptions): Promise<TResult> {
    // Like the real connection: errors arrive as a rejected promise, never synchronously.
    return Promise.resolve().then(() => this.fake.call({ type, payload }) as TResult);
  }

  override snapshot<TEvent>({ type }: HaSnapshotOptions): Promise<TEvent> {
    return Promise.resolve().then(() => this.fake.snapshot(type) as TEvent);
  }

  override subscribe({ eventType, handler }: HaSubscribeOptions): void {
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

  override post<TResult>({ path, body }: HaPostOptions): Promise<TResult> {
    return Promise.resolve().then(() => this.fake.restPost({ path, body }) as TResult);
  }

  override delete(path: string): Promise<void> {
    return Promise.resolve().then(() => this.fake.restDelete(path));
  }
}
