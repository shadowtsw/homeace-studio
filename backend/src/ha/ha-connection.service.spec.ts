import { Logger } from "@nestjs/common";

import { HaCommandError } from "./ha-command.error";
import { HaConnectionService } from "./ha-connection.service";
import type { HaEndpoint } from "./ha-endpoint";

type Listener = (event: { data?: string }) => void;

/** Stands in for the global WebSocket so tests can play Home Assistant's side. */
class FakeSocket {
  static instances: FakeSocket[] = [];
  readonly sent: Record<string, unknown>[] = [];
  private readonly listeners = new Map<string, Listener[]>();

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  send(data: string): void {
    this.sent.push(JSON.parse(data) as Record<string, unknown>);
  }

  close(): void {
    this.emit("close", {});
  }

  receive(message: Record<string, unknown>): void {
    this.emit("message", { data: JSON.stringify(message) });
  }

  lastCommandId(): number {
    const lastMessage = this.sent[this.sent.length - 1];
    return Number(lastMessage.id);
  }

  private emit(type: string, event: { data?: string }): void {
    (this.listeners.get(type) ?? []).forEach((listener) => listener(event));
  }
}

const ENDPOINT: HaEndpoint = {
  restUrl: "http://ha.local:8123/api",
  websocketUrl: "ws://ha.local:8123/api/websocket",
  token: "token",
  isAddon: false,
};
const flushPromises = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/** Starts a command and plays a successful login, so the command reaches the socket. */
async function startLoggedIn<T>(
  service: HaConnectionService,
  type: string,
): Promise<{ socket: FakeSocket; result: Promise<T> }> {
  const result = service.call<T>({ type });
  const socket = FakeSocket.instances[0];

  socket.receive({ type: "auth_required" });
  socket.receive({ type: "auth_ok", ha_version: "2026.11.2" });
  await flushPromises();

  return { socket, result };
}

describe("HaConnectionService", () => {
  const originalWebSocket = globalThis.WebSocket;
  let service: HaConnectionService;

  beforeAll(() => {
    Logger.overrideLogger(false);
  });

  beforeEach(() => {
    FakeSocket.instances = [];
    globalThis.WebSocket = FakeSocket as unknown as typeof WebSocket;
    service = new HaConnectionService(ENDPOINT);
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
    globalThis.WebSocket = originalWebSocket;
  });

  /** Plays a successful login on a socket the service opened on its own. */
  async function logIn(socket: FakeSocket): Promise<void> {
    socket.receive({ type: "auth_required" });
    socket.receive({ type: "auth_ok", ha_version: "2026.11.2" });
    await flushPromises();
  }

  function subscriptionsOn(socket: FakeSocket): Record<string, unknown>[] {
    return socket.sent.filter((message) => message.type === "subscribe_events");
  }

  it("subscribes once per event type and forwards only matching events", async () => {
    const first = jest.fn();
    const second = jest.fn();

    service.subscribe({ eventType: "state_changed", handler: first });
    service.subscribe({ eventType: "state_changed", handler: second });
    const socket = FakeSocket.instances[0];
    await logIn(socket);
    socket.receive({ id: socket.lastCommandId(), type: "result", success: true, result: null });

    socket.receive({ type: "event", event: { event_type: "state_changed", data: {} } });
    socket.receive({ type: "event", event: { event_type: "call_service", data: {} } });

    expect(subscriptionsOn(socket)).toEqual([
      expect.objectContaining({ event_type: "state_changed" }),
    ]);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("reconnects on its own after a drop and subscribes again", async () => {
    jest.useFakeTimers({ doNotFake: ["setImmediate"] });
    service.subscribe({ eventType: "state_changed", handler: jest.fn() });
    const first = FakeSocket.instances[0];
    await logIn(first);
    first.receive({ id: first.lastCommandId(), type: "result", success: true, result: null });

    first.close();
    expect(FakeSocket.instances).toHaveLength(1);

    jest.advanceTimersByTime(5_000);
    const second = FakeSocket.instances[1];
    await logIn(second);

    expect(subscriptionsOn(second)).toEqual([
      expect.objectContaining({ event_type: "state_changed" }),
    ]);
  });

  it("logs in with the token and resolves the command result", async () => {
    const { socket, result } = await startLoggedIn<string[]>(service, "get_states");

    expect(socket.url).toBe("ws://ha.local:8123/api/websocket");
    expect(socket.sent[0]).toEqual({ type: "auth", access_token: "token" });
    expect(socket.sent[1]).toMatchObject({ type: "get_states" });

    socket.receive({ id: socket.lastCommandId(), type: "result", success: true, result: ["a"] });

    await expect(result).resolves.toEqual(["a"]);
  });

  it("rejects with HaCommandError when HA reports an error", async () => {
    const { socket, result } = await startLoggedIn(service, "config/unknown");

    socket.receive({
      id: socket.lastCommandId(),
      type: "result",
      success: false,
      error: { code: "unknown_command", message: "Unknown command." },
    });

    await expect(result).rejects.toEqual(new HaCommandError("unknown_command", "Unknown command."));
  });

  it("rejects when HA refuses the token", async () => {
    const result = service.call({ type: "get_states" });
    const socket = FakeSocket.instances[0];

    socket.receive({ type: "auth_required" });
    socket.receive({ type: "auth_invalid", message: "Invalid access token" });

    await expect(result).rejects.toThrow("Home Assistant rejected the token");
  });

  it("rejects open commands on disconnect and reconnects on the next command", async () => {
    const { socket, result } = await startLoggedIn(service, "get_states");

    socket.close();
    await expect(result).rejects.toThrow("Home Assistant disconnected");

    void service.call({ type: "get_states" }).catch(() => undefined);
    expect(FakeSocket.instances).toHaveLength(2);
  });
});
