// Clients for the HA check: Home Assistant's REST and WebSocket API, and the app's API.

import { sleep } from "../devtools.mjs";

const JSON_HEADERS = { "content-type": "application/json" };

/** HA's WebSocket message types the check reacts to. */
const WS_MESSAGE = {
  authRequired: "auth_required",
  authOk: "auth_ok",
  authInvalid: "auth_invalid",
  result: "result",
};

/** `/api/onboarding` answers 200 while HA waits for its owner and 404 once it is onboarded. */
const ONBOARDING_STATUS = { waiting: 200, done: 404 };

const toBody = (body) => (body === undefined ? undefined : JSON.stringify(body));

/**
 * Waits until HA answers over HTTP.
 *
 * @returns true when HA was onboarded before (a reused volume), false for a fresh one.
 * @throws When HA does not answer within `timeoutMs`.
 */
export async function waitForHa({ haUrl, timeoutMs, pollMs }) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const status = await fetch(`${haUrl}/api/onboarding`).then(
      (response) => response.status,
      () => null,
    );
    if (status === ONBOARDING_STATUS.waiting) return false;
    if (status === ONBOARDING_STATUS.done) return true;
    await sleep(pollMs);
  }
  throw new Error(`Home Assistant did not answer at ${haUrl} within ${timeoutMs / 1000} s`);
}

/**
 * REST calls to HA: `haRest(method, path, body)` answers HA's JSON and throws with HA's text on an
 * error status.
 *
 * @param token - Bearer token; leave it out for the onboarding calls before a user exists.
 */
export function createHaRest({ haUrl, token = "" }) {
  const headers = token ? { ...JSON_HEADERS, authorization: `Bearer ${token}` } : JSON_HEADERS;

  return async function haRest(method, path, body) {
    const response = await fetch(haUrl + path, { method, headers, body: toBody(body) });
    const text = await response.text();

    if (!response.ok) throw new Error(`HA ${method} ${path} → ${response.status} ${text}`);
    return text ? JSON.parse(text) : null;
  };
}

/**
 * Opens HA's WebSocket API and logs in.
 *
 * @returns `{ call(type, data), close() }`; `call` sends one command and resolves with its result or
 *   rejects with HA's error.
 */
export function connectHaSocket({ haUrl, token }) {
  const socket = new WebSocket(`${haUrl.replace(/^http/, "ws")}/api/websocket`);
  const pending = new Map();
  let lastId = 0;

  const call = (type, data = {}) =>
    new Promise((resolve, reject) => {
      lastId += 1;
      pending.set(lastId, { resolve, reject, type });
      socket.send(JSON.stringify({ id: lastId, type, ...data }));
    });

  return new Promise((resolve, reject) => {
    socket.onerror = () => reject(new Error(`No WebSocket connection to ${haUrl}`));
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === WS_MESSAGE.authRequired) {
        socket.send(JSON.stringify({ type: "auth", access_token: token }));
      }
      if (message.type === WS_MESSAGE.authOk) resolve({ call, close: () => socket.close() });
      if (message.type === WS_MESSAGE.authInvalid) reject(new Error("HA refused the token"));
      if (message.type === WS_MESSAGE.result) settle(pending, message);
    };
  });
}

function settle(pending, message) {
  const waiting = pending.get(message.id);
  if (!waiting) return;

  pending.delete(message.id);
  if (message.success) waiting.resolve(message.result);
  else waiting.reject(new Error(`${waiting.type}: ${JSON.stringify(message.error)}`));
}

/**
 * The app's API (envelope `{ message, error, data }`, see docs/api.md).
 *
 * @returns `request(method, path, body)` answers the envelope plus `status`; `ok(…)` answers `data`
 *   and throws unless the call succeeded.
 */
export function createAppApi(appUrl) {
  async function request(method, path, body) {
    const response = await fetch(appUrl + path, {
      method,
      headers: JSON_HEADERS,
      body: toBody(body),
    });
    const envelope = await response.json().catch(() => ({}));

    return { status: response.status, ...envelope };
  }

  async function ok(method, path, body) {
    const answer = await request(method, path, body);
    const hasFailed = answer.status >= 400 || answer.error;

    if (hasFailed) {
      const data = JSON.stringify(answer.data ?? "");
      throw new Error(`${method} ${path} → ${answer.status} ${answer.message} ${data}`);
    }
    return answer.data;
  }

  return { request, ok };
}
