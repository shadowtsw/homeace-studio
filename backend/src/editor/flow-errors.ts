import { BadRequestException } from "@nestjs/common";

import { apiError } from "src/common/api/api-response";
import { HaRestError } from "src/ha/ha-rest.service";
import { MESSAGE_ID } from "src/messages/message-ids";

const HTTP_BAD_REQUEST = 400;

/**
 * HA answers an invalid flow config with 400 and its own reason ("Message malformed: …"). That
 * becomes `FLOW_INVALID` with the reason; every other error stays as it is.
 */
export function toFlowError(error: unknown): unknown {
  if (error instanceof HaRestError && error.status === HTTP_BAD_REQUEST) {
    return new BadRequestException(
      apiError({ message: MESSAGE_ID.flowInvalid, details: { params: { reason: error.message } } }),
    );
  }

  return error;
}
