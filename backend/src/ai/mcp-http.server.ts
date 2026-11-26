import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";

import { EntriesService } from "../entries/entries.service";
import { OVERLAY_REPOSITORY } from "../overlay/overlay.constants";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import { AiPlansService } from "./ai-plans.service";
import { MCP_MAX_BODY_BYTES, MCP_PATH, MCP_TOOLS_VERSION } from "./ai.constants";
import { McpAccessService } from "./mcp-access.service";
import { createMcpServer } from "./mcp-tools";

const HTTP = {
  badRequest: 400,
  unauthorized: 401,
  notFound: 404,
  methodNotAllowed: 405,
  payloadTooLarge: 413,
  unavailable: 503,
  internalError: 500,
} as const;

/** JSON-RPC error codes for answers outside the MCP SDK. */
const JSON_RPC = { parseError: -32700, serverError: -32000 } as const;

type JsonRpcMessage = { method?: unknown; params?: { clientInfo?: { name?: unknown } } };

class BodyTooLargeError extends Error {}

type SendErrorOptions = {
  response: ServerResponse;
  status: number;
  code: number;
  message: string;
};

function sendError({ response, status, code, message }: SendErrorOptions): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }));
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MCP_MAX_BODY_BYTES) {
        reject(new BodyTooLargeError());
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

/** The client's name from an `initialize` message, e.g. "claude-code". */
function clientNameOf(message: unknown): string | null {
  const messages = (Array.isArray(message) ? message : [message]) as JsonRpcMessage[];
  const name = messages.find((item) => item?.method === "initialize")?.params?.clientInfo?.name;

  return typeof name === "string" ? name.slice(0, 80) : null;
}

/**
 * The MCP endpoint on its own port (8098), apart from the UI behind HA ingress. It only answers
 * while the user switched the access on, and only with the right token.
 *
 * Stateless Streamable HTTP: every POST gets a fresh MCP server, so no sessions are kept. GET (a
 * server-sent event stream) and DELETE (ending a session) are not needed for that.
 */
@Injectable()
export class McpHttpServer implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(McpHttpServer.name);
  private server: Server | null = null;

  constructor(
    private readonly access: McpAccessService,
    private readonly plans: AiPlansService,
    private readonly entries: EntriesService,
    @Inject(OVERLAY_REPOSITORY) private readonly overlay: OverlayRepository,
  ) {}

  onApplicationBootstrap(): void {
    // A taken port (e.g. a second local backend) must not stop the app; MCP is optional.
    this.start(this.access.port).catch((error: Error) =>
      this.logger.error(`MCP endpoint not started: ${error.message}`),
    );
  }

  /** @param port - 0 picks a free port (tests). @returns The port it listens on. */
  start(port: number): Promise<number> {
    const server = createServer((request, response) => void this.handle({ request, response }));
    this.server = server;

    return new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, () => {
        const actualPort = (server.address() as AddressInfo).port;
        this.logger.log(`MCP endpoint listening on port ${actualPort}${MCP_PATH}`);
        resolve(actualPort);
      });
    });
  }

  onModuleDestroy(): void {
    this.server?.close();
  }

  private async handle({
    request,
    response,
  }: {
    request: IncomingMessage;
    response: ServerResponse;
  }): Promise<void> {
    try {
      if (new URL(request.url ?? "/", "http://localhost").pathname !== MCP_PATH) {
        return sendError({
          response,
          status: HTTP.notFound,
          code: JSON_RPC.serverError,
          message: `Not found; use ${MCP_PATH}`,
        });
      }

      const authorization = await this.access.authorize(request.headers.authorization);

      if (authorization === "off") {
        return sendError({
          response,
          status: HTTP.unavailable,
          code: JSON_RPC.serverError,
          message: "MCP access is switched off in HomeAce Studio (Settings → AI access).",
        });
      }

      if (authorization === "denied") {
        response.setHeader("WWW-Authenticate", 'Bearer realm="HomeAce Studio"');
        return sendError({
          response,
          status: HTTP.unauthorized,
          code: JSON_RPC.serverError,
          message: "Missing or wrong token.",
        });
      }

      if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        return sendError({
          response,
          status: HTTP.methodNotAllowed,
          code: JSON_RPC.serverError,
          message: "Only POST is supported.",
        });
      }

      let message: unknown;

      try {
        message = JSON.parse(await readBody(request));
      } catch (error) {
        if (error instanceof BodyTooLargeError) {
          return sendError({
            response,
            status: HTTP.payloadTooLarge,
            code: JSON_RPC.serverError,
            message: "Request too large.",
          });
        }
        return sendError({
          response,
          status: HTTP.badRequest,
          code: JSON_RPC.parseError,
          message: "Invalid JSON.",
        });
      }

      const client = clientNameOf(message);
      this.access.recordConnection(client);

      const mcp = createMcpServer({
        entries: this.entries,
        plans: this.plans,
        overlay: this.overlay,
        client: this.access.lastClient,
        version: MCP_TOOLS_VERSION,
      });
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

      response.on("close", () => {
        void transport.close();
        void mcp.close();
      });

      await mcp.connect(transport);
      await transport.handleRequest(request, response, message);
    } catch (error) {
      this.logger.error(`MCP request failed: ${String(error)}`);

      if (!response.headersSent) {
        sendError({
          response,
          status: HTTP.internalError,
          code: JSON_RPC.serverError,
          message: "Internal error.",
        });
      }
    }
  }
}
