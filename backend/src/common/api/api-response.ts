import type { MessageId } from "src/messages/message-ids";

/** Envelope of every response (see docs/api.md). */
export interface ApiResponse<T = unknown> {
  message: MessageId;
  error: boolean;
  data: T | null;
}

/**
 * Payload for exceptions that carry a message ID, e.g.
 * `new NotFoundException(apiError(MESSAGE_ID.notFound, { params: { id } }))`.
 * Everything except `message` ends up in `ApiResponse.data`.
 */
export interface ApiErrorPayload {
  message: MessageId;
  params?: Record<string, string | number>;
  fields?: { field: string; message: MessageId }[];
}

export type ApiErrorOptions = {
  message: MessageId;
  details?: Omit<ApiErrorPayload, "message">;
};

export function apiError({ message, details = {} }: ApiErrorOptions): ApiErrorPayload {
  return { message, ...details };
}
