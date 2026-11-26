/**
 * Relative on purpose: behind HA ingress the app runs under /api/hassio_ingress/<token>/, and the
 * Supervisor forwards <prefix>/api/... to the add-on. Locally Vite proxies /api to the backend.
 */
export const API_BASE_URL = "api";

/** Status used for ApiError when no HTTP response arrived at all. */
const NO_RESPONSE_STATUS = 0;

/** Built into the frontend: without a backend there is no catalog to ask. */
export const NETWORK_ERROR_ID = "NETWORK_ERROR";
const INTERNAL_ERROR_ID = "INTERNAL_ERROR";

/** Envelope of every backend response (docs/api.md). */
type ApiResponse<T> = {
  message: string;
  error: boolean;
  data: T | null;
};

export type ApiErrorData = {
  params?: Record<string, string | number>;
  fields?: { field: string; message: string }[];
};

export class ApiError extends Error {
  constructor(
    /** Message ID from the backend catalog, e.g. "CATEGORY_NAME_TAKEN". */
    readonly messageId: string,
    readonly status: number,
    readonly data: ApiErrorData | null = null,
  ) {
    super(messageId);
    this.name = "ApiError";
  }
}

export type ApiFetchOptions = {
  path: string;
  options?: RequestInit;
};

/**
 * Sends a request and returns `data` of the response envelope. All requests go through here.
 *
 * @throws ApiError with the backend's message ID, or NETWORK_ERROR when no answer arrived.
 */
export async function apiFetch<T>({ path, options }: ApiFetchOptions): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new ApiError(NETWORK_ERROR_ID, NO_RESPONSE_STATUS);
  }

  const body = await parseBody<T>(response);

  if (!response.ok || !body || body.error) {
    const messageId = body?.message ?? INTERNAL_ERROR_ID;
    throw new ApiError(messageId, response.status, (body?.data as ApiErrorData | null) ?? null);
  }

  return body.data as T;
}

type BodyMethod = "POST" | "PATCH" | "PUT";

export type ApiSendOptions = {
  method: BodyMethod;
  path: string;
  body: unknown;
};

/** Sends a JSON body with POST, PATCH or PUT. */
export function apiSend<T>({ method, path, body }: ApiSendOptions): Promise<T> {
  return apiFetch<T>({
    path,
    options: {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  });
}

export type ApiPostOptions = {
  path: string;
  body?: unknown;
};

/** Sends a JSON body with POST. */
export function apiPost<T>({ path, body = {} }: ApiPostOptions): Promise<T> {
  return apiSend<T>({ method: "POST", path, body });
}

/** A proxy error page or an empty body is no envelope; treat it as "no usable answer". */
async function parseBody<T>(response: Response): Promise<ApiResponse<T> | null> {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    return null;
  }
}
