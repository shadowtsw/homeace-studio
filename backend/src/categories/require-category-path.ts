import { BadRequestException } from "@nestjs/common";

import { apiError } from "src/common/api/api-response";
import { MESSAGE_ID } from "src/messages/message-ids";
import { normalizeCategoryPath } from "./category-path";

/**
 * Normalizes a user-typed category path for use in a request.
 *
 * @returns The clean path, e.g. "Haus/Terrasse".
 * @throws BadRequestException `CATEGORY_PATH_INVALID` when a level is empty.
 */
export function requireCategoryPath(path: string): string {
  const normalized = normalizeCategoryPath(path);

  if (normalized === null) {
    throw new BadRequestException(
      apiError({ message: MESSAGE_ID.categoryPathInvalid, details: { params: { path } } }),
    );
  }

  return normalized;
}
