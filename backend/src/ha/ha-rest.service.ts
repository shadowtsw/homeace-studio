import { Inject, Injectable } from "@nestjs/common";

import type { HaEndpoint } from "./ha-endpoint";
import { HA_ENDPOINT, HA_REQUEST_TIMEOUT_MS } from "./ha.constants";

const HTTP_NOT_FOUND = 404;
const PATH_SEPARATOR = "/";

/** Home Assistant answered a REST request with an error status. */
export class HaRestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = HaRestError.name;
  }
}

/**
 * HA's REST API, for the few things the WebSocket API cannot do, like saving an automation
 * into automations.yaml (`/api/config/automation/config/<id>`).
 */
@Injectable()
export class HaRestService {
  constructor(@Inject(HA_ENDPOINT) private readonly endpoint: HaEndpoint) {}

  /**
   * @param path - Below `/api`, e.g. "config/automation/config/1718034411822".
   * @returns The JSON answer, or null when HA does not know the resource (404).
   */
  async get<TResult>(path: string): Promise<TResult | null> {
    const response = await this.send({ method: "GET", path });

    if (response.status === HTTP_NOT_FOUND) return null;

    return (await this.readOrThrow(response)) as TResult;
  }

  async post<TResult>(path: string, body: unknown): Promise<TResult> {
    const response = await this.send({ method: "POST", path, body });

    return (await this.readOrThrow(response)) as TResult;
  }

  async delete(path: string): Promise<void> {
    await this.readOrThrow(await this.send({ method: "DELETE", path }));
  }

  private send({
    method,
    path,
    body,
  }: {
    method: string;
    path: string;
    body?: unknown;
  }): Promise<Response> {
    return fetch(this.endpoint.restUrl + PATH_SEPARATOR + path, {
      method,
      headers: {
        Authorization: `Bearer ${this.endpoint.token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(HA_REQUEST_TIMEOUT_MS),
    });
  }

  /** HA sends errors as `{ "message": "Message malformed: …" }`. */
  private async readOrThrow(response: Response): Promise<unknown> {
    const answer: unknown = await response.json().catch(() => null);

    if (response.ok) return answer;

    const message =
      answer && typeof answer === "object" && "message" in answer
        ? String(answer.message)
        : response.statusText;

    throw new HaRestError(response.status, message);
  }
}
