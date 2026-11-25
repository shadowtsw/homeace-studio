import { Controller, Get, Headers } from "@nestjs/common";
import type { IncomingHttpHeaders } from "node:http";

import { haUserFrom, type HaUser } from "./ha-user";

export type PreferencesAnswer = {
  /** The HA user who opened HomeAce Studio; null when it was not opened through HA. */
  user: HaUser | null;
};

/**
 * Preferences per HA user (docs/api.md). For now it only says which user is there; keeping the
 * values per user comes next.
 */
@Controller("preferences")
export class PreferencesController {
  @Get()
  read(@Headers() headers: IncomingHttpHeaders): PreferencesAnswer {
    return { user: haUserFrom(headers) };
  }
}
