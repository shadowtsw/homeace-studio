import { randomInt, timingSafeEqual } from "node:crypto";

import { Inject, Injectable, Logger } from "@nestjs/common";

import type { HaEndpoint } from "../ha/ha-endpoint";
import { HA_ENDPOINT } from "../ha/ha.constants";
import { OVERLAY_REPOSITORY } from "../overlay/overlay.constants";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import {
  MCP_PATH,
  MCP_PORT,
  MCP_PORT_KEY,
  MCP_TOKEN_ALPHABET,
  MCP_TOKEN_LENGTH,
  MCP_TOKEN_PREFIX,
  SUPERVISOR_SELF_INFO_URL,
} from "./ai.constants";

const SUPERVISOR_TIMEOUT_MS = 5_000;
const BEARER_PREFIX = "Bearer ";

export type McpConnection = { client: string | null; at: string };

/** What the settings dialog shows. */
export type McpOverview = {
  isEnabled: boolean;
  token: string | null;
  path: string;
  /** Port inside the container. */
  containerPort: number;
  /**
   * Port on the HA host. In the app: the mapped port, or null when the user has not set one yet.
   * Outside the app (development, demo) the container port, since nothing maps it.
   */
  hostPort: number | null;
  isAddon: boolean;
  lastConnection: McpConnection | null;
};

export function createMcpToken(): string {
  let token = MCP_TOKEN_PREFIX;

  for (let index = 0; index < MCP_TOKEN_LENGTH; index++) {
    token += MCP_TOKEN_ALPHABET[randomInt(MCP_TOKEN_ALPHABET.length)];
  }

  return token;
}

export type IsSameTokenOptions = {
  given: string;
  expected: string;
};

/** Compares in constant time, so the answer time tells nothing about the token. */
export function isSameToken({ given, expected }: IsSameTokenOptions): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);

  return a.length === b.length && timingSafeEqual(a, b);
}

/** Switch, token and last connection of the MCP access. */
@Injectable()
export class McpAccessService {
  private readonly logger = new Logger(McpAccessService.name);
  /** Only in memory: "last connected" is a hint, not worth a write on every request. */
  private lastConnection: McpConnection | null = null;

  constructor(
    @Inject(OVERLAY_REPOSITORY) private readonly overlay: OverlayRepository,
    @Inject(HA_ENDPOINT) private readonly endpoint: HaEndpoint,
    @Inject(MCP_PORT) readonly port: number,
  ) {}

  async overview(): Promise<McpOverview> {
    const [overlay, hostPort] = await Promise.all([this.overlay.read(), this.findHostPort()]);

    return {
      isEnabled: overlay.mcp.isEnabled,
      token: overlay.mcp.token,
      path: MCP_PATH,
      containerPort: this.port,
      hostPort,
      isAddon: this.endpoint.isAddon,
      lastConnection: this.lastConnection,
    };
  }

  /** Switching on the first time creates a token. */
  async setEnabled(isEnabled: boolean): Promise<McpOverview> {
    await this.overlay.update((current) => ({
      ...current,
      mcp: { isEnabled, token: current.mcp.token ?? (isEnabled ? createMcpToken() : null) },
    }));
    this.logger.log(`MCP access ${isEnabled ? "on" : "off"}`);

    return this.overview();
  }

  /** The old token stops working at once. */
  async renewToken(): Promise<McpOverview> {
    await this.overlay.update((current) => ({
      ...current,
      mcp: { ...current.mcp, token: createMcpToken() },
    }));
    this.lastConnection = null;
    this.logger.log("MCP token renewed");

    return this.overview();
  }

  /**
   * Checks a request's Authorization header.
   *
   * @returns "off" while access is switched off, "denied" for a missing or wrong token.
   */
  async authorize(header: string | undefined): Promise<"ok" | "off" | "denied"> {
    const { mcp } = await this.overlay.read();

    if (!mcp.isEnabled) return "off";
    if (!mcp.token || !header?.startsWith(BEARER_PREFIX)) return "denied";

    return isSameToken({ given: header.slice(BEARER_PREFIX.length).trim(), expected: mcp.token })
      ? "ok"
      : "denied";
  }

  /** Client of the latest connection; tool calls come without a name, only the handshake has it. */
  get lastClient(): string | null {
    return this.lastConnection?.client ?? null;
  }

  recordConnection(client: string | null): void {
    this.lastConnection = {
      client: client ?? this.lastConnection?.client ?? null,
      at: new Date().toISOString(),
    };
  }

  /** Asks the Supervisor which host port the user mapped; outside the app the port is direct. */
  private async findHostPort(): Promise<number | null> {
    if (!this.endpoint.isAddon) return this.port;

    try {
      const response = await fetch(SUPERVISOR_SELF_INFO_URL, {
        headers: { Authorization: `Bearer ${this.endpoint.token}` },
        signal: AbortSignal.timeout(SUPERVISOR_TIMEOUT_MS),
      });
      const body = (await response.json()) as {
        data?: { network?: Record<string, number | null> };
      };
      const mapped = body.data?.network?.[MCP_PORT_KEY];

      return typeof mapped === "number" ? mapped : null;
    } catch (error) {
      this.logger.warn(`Could not read the app's network settings: ${String(error)}`);
      return null;
    }
  }
}
