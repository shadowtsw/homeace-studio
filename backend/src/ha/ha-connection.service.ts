import { Inject, Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";

import { HaCommandError } from "./ha-command.error";
import type { HaEndpoint } from "./ha-endpoint";
import {
  HA_COMMAND,
  HA_ENDPOINT,
  HA_MESSAGE,
  HA_RECONNECT_DELAY_MS,
  HA_REQUEST_TIMEOUT_MS,
  HA_UNKNOWN_ERROR_CODE,
} from "./ha.constants";
import type { HaEvent } from "./ha.types";

type HaMessage = {
  type: string;
  id?: number;
  success?: boolean;
  result?: unknown;
  error?: { code?: string; message?: string };
  event?: HaEvent;
  ha_version?: string;
  message?: string;
};

type PendingRequest = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

export type HaEventHandler = (event: HaEvent) => void;

export type HaCallOptions = {
  type: string;
  payload?: Record<string, unknown>;
};

export type HaSnapshotOptions = {
  type: string;
  payload?: Record<string, unknown>;
};

export type HaSubscribeOptions = {
  eventType: string;
  handler: HaEventHandler;
};

/**
 * One shared WebSocket connection to Home Assistant, used by every module.
 *
 * - Commands: `call()` connects lazily and resolves with the command's result.
 * - Events: `subscribe()` listens to an event type. Subscriptions survive disconnects: after a
 *   drop the service reconnects on its own (every few seconds) and subscribes again.
 *
 * Uses the WebSocket built into Node 22+, so no extra package is needed.
 */
@Injectable()
export class HaConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(HaConnectionService.name);
  private readonly pending = new Map<number, PendingRequest>();
  /** One-shot listeners of `snapshot()`, by the id of their subscription command. */
  private readonly snapshotWaiters = new Map<number, (event: unknown) => void>();
  /** Events are matched by their type, so the ids of the subscriptions do not matter. */
  private readonly handlersByEventType = new Map<string, HaEventHandler[]>();
  private socket: WebSocket | null = null;
  private connection: Promise<void> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  private nextId = 1;

  constructor(@Inject(HA_ENDPOINT) private readonly endpoint: HaEndpoint) {}

  /**
   * Sends one command and resolves with its `result`.
   * HA's WebSocket API is untyped, so the caller declares the shape it expects for this command.
   */
  async call<TResult>({ type, payload = {} }: HaCallOptions): Promise<TResult> {
    await this.ensureConnected();

    const result = await this.request({ id: this.nextId++, type, payload });

    return result as TResult;
  }

  /**
   * For subscription commands that send their data as the first event (e.g.
   * `trigger_platforms/subscribe`): subscribes, resolves with that first event, then unsubscribes.
   */
  async snapshot<TEvent>({ type, payload = {} }: HaSnapshotOptions): Promise<TEvent> {
    await this.ensureConnected();

    const id = this.nextId++;
    const firstEvent = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.snapshotWaiters.delete(id);
        reject(new Error(`Home Assistant sent no data for "${type}"`));
      }, HA_REQUEST_TIMEOUT_MS);

      this.snapshotWaiters.set(id, (event) => {
        clearTimeout(timer);
        resolve(event);
      });
    });

    try {
      await this.request({ id, type, payload });
    } catch (error) {
      this.snapshotWaiters.delete(id);
      // The waiter's timer still fires later; its rejection is not needed anymore.
      firstEvent.catch(() => undefined);
      throw error;
    }

    const event = await firstEvent;
    // Only the first answer is needed; later updates would just pile up.
    void this.call({ type: HA_COMMAND.unsubscribeEvents, payload: { subscription: id } }).catch(
      () => undefined,
    );

    return event as TEvent;
  }

  /** Sends one command with a given id and resolves with its `result`. */
  private request({
    id,
    type,
    payload,
  }: {
    id: number;
    type: string;
    payload: Record<string, unknown>;
  }): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      const timeoutError = new Error(`Home Assistant command "${type}" timed out`);
      const timer = setTimeout(
        () => this.failRequest({ id, error: timeoutError }),
        HA_REQUEST_TIMEOUT_MS,
      );

      this.pending.set(id, { resolve, reject, timer });
      this.send({ id, type, ...payload });
    });
  }

  /** Calls `handler` for every event of this type, also after reconnects. */
  subscribe({ eventType, handler }: HaSubscribeOptions): void {
    const handlers = this.handlersByEventType.get(eventType) ?? [];
    this.handlersByEventType.set(eventType, [...handlers, handler]);

    // HA needs one subscription per event type; further handlers share it.
    if (handlers.length === 0) {
      void this.sendSubscription(eventType);
    }
  }

  onModuleDestroy(): void {
    this.isShuttingDown = true;

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.socket?.close();
  }

  private ensureConnected(): Promise<void> {
    this.connection ??= this.connect();
    return this.connection;
  }

  private async connect(): Promise<void> {
    try {
      await this.openSocket();
    } catch (error) {
      // Forget the failed attempt so the next command tries again.
      this.connection = null;
      throw error;
    }
  }

  /** Resolves once HA has accepted the token. */
  private openSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.endpoint.websocketUrl);
      this.socket = socket;

      socket.addEventListener("message", (event) => {
        this.handleMessage({ raw: String(event.data), onLoggedIn: resolve, onLoginFailed: reject });
      });
      socket.addEventListener("error", () => {
        reject(new Error(`Cannot reach Home Assistant at ${this.endpoint.websocketUrl}`));
      });
      socket.addEventListener("close", () => {
        // After a successful login this reject is a no-op; it only matters if HA hangs up during login.
        reject(new Error("Home Assistant closed the connection during login"));
        this.handleClose();
      });
    });
  }

  private handleMessage({
    raw,
    onLoggedIn,
    onLoginFailed,
  }: {
    raw: string;
    onLoggedIn: () => void;
    onLoginFailed: (error: Error) => void;
  }): void {
    const message = JSON.parse(raw) as HaMessage;

    switch (message.type) {
      case HA_MESSAGE.authRequired:
        this.send({ type: HA_MESSAGE.auth, access_token: this.endpoint.token });
        return;
      case HA_MESSAGE.authOk:
        this.logger.log(`Connected to Home Assistant ${message.ha_version ?? ""}`.trim());
        onLoggedIn();
        return;
      case HA_MESSAGE.authInvalid:
        onLoginFailed(new Error(`Home Assistant rejected the token: ${message.message ?? ""}`));
        return;
      case HA_MESSAGE.result:
        this.settleRequest(message);
        return;
      case HA_MESSAGE.event:
        this.routeEvent(message);
        return;
    }
  }

  /** Snapshot answers go to their waiter; everything else to the event type subscribers. */
  private routeEvent(message: HaMessage): void {
    const waiter = message.id === undefined ? undefined : this.snapshotWaiters.get(message.id);

    if (waiter && message.id !== undefined) {
      this.snapshotWaiters.delete(message.id);
      waiter(message.event);
      return;
    }

    this.dispatchEvent(message.event);
  }

  private dispatchEvent(event: HaEvent | undefined): void {
    if (!event) return;

    const handlers = this.handlersByEventType.get(event.event_type) ?? [];

    handlers.forEach((handler) => {
      // One failing listener must not stop the others or break the connection.
      try {
        handler(event);
      } catch (error) {
        this.logger.error(`Handler for "${event.event_type}" failed`, error);
      }
    });
  }

  /** @returns Whether HA accepted the subscription; on failure a reconnect is scheduled. */
  private async sendSubscription(eventType: string): Promise<boolean> {
    try {
      await this.call({ type: HA_COMMAND.subscribeEvents, payload: { event_type: eventType } });
      return true;
    } catch (error) {
      this.logger.warn(`Subscribing to "${eventType}" failed: ${String(error)}`);
      this.scheduleReconnect();
      return false;
    }
  }

  private scheduleReconnect(): void {
    const hasSubscriptions = this.handlersByEventType.size > 0;

    if (this.isShuttingDown || this.reconnectTimer || !hasSubscriptions) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.resubscribeAll();
    }, HA_RECONNECT_DELAY_MS);
  }

  /** Sends every subscription again; stops at the first failure, which schedules the next try. */
  private async resubscribeAll(): Promise<void> {
    for (const eventType of this.handlersByEventType.keys()) {
      const isSubscribed = await this.sendSubscription(eventType);

      if (!isSubscribed) return;
    }

    this.logger.log("Event subscriptions restored");
  }

  private settleRequest(message: HaMessage): void {
    const request = message.id === undefined ? undefined : this.pending.get(message.id);

    if (!request || message.id === undefined) {
      return;
    }

    clearTimeout(request.timer);
    this.pending.delete(message.id);

    if (message.success) {
      request.resolve(message.result);
      return;
    }

    const code = message.error?.code ?? HA_UNKNOWN_ERROR_CODE;
    request.reject(new HaCommandError(code, message.error?.message ?? code));
  }

  private failRequest({ id, error }: { id: number; error: Error }): void {
    const request = this.pending.get(id);

    if (!request) {
      return;
    }

    clearTimeout(request.timer);
    this.pending.delete(id);
    request.reject(error);
  }

  private handleClose(): void {
    const wasConnected = this.connection !== null;
    this.socket = null;
    this.connection = null;

    const openRequestIds = [...this.pending.keys()];
    openRequestIds.forEach((id) =>
      this.failRequest({ id, error: new Error("Home Assistant disconnected") }),
    );

    if (wasConnected && !this.isShuttingDown) {
      this.logger.warn("Connection to Home Assistant closed; reconnecting");
    }

    this.scheduleReconnect();
  }

  private send(payload: Record<string, unknown>): void {
    if (!this.socket) {
      throw new Error("Not connected to Home Assistant");
    }

    this.socket.send(JSON.stringify(payload));
  }
}
