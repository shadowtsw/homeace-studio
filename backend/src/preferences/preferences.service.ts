import { BadRequestException, Inject, Injectable } from "@nestjs/common";

import { apiError } from "../common/api/api-response";
import { MESSAGE_ID } from "../messages/message-ids";
import { OVERLAY_REPOSITORY } from "../overlay/overlay.constants";
import type { UserPreferences } from "../overlay/overlay.model";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import type { HaUser } from "./ha-user";
import {
  MAX_PREFERENCES_PER_USER,
  cleanPreferences,
  isPreferenceName,
  isPreferenceValue,
} from "./preference-values";

export type PreferencesAnswer = {
  /** The HA user who opened HomeAce Studio; null when it was not opened through HA. */
  user: HaUser | null;
  /** Their kept settings; null when there is no user or nothing kept yet (first visit). */
  values: UserPreferences | null;
};

export type SetOptions = {
  user: HaUser | null;
  name: string;
  value: unknown;
};

export type ImportFirstOptions = {
  user: HaUser | null;
  values: unknown;
};

/** Settings that follow a HA user to every device, kept in the overlay by HA user ID. */
@Injectable()
export class PreferencesService {
  constructor(@Inject(OVERLAY_REPOSITORY) private readonly overlay: OverlayRepository) {}

  async read(user: HaUser | null): Promise<PreferencesAnswer> {
    if (!user) return { user: null, values: null };

    const overlay = await this.overlay.read();

    return { user, values: overlay.userPreferences[user.id] ?? null };
  }

  /** Sets one setting of the user; the others stay. */
  async set({ user, name, value }: SetOptions): Promise<UserPreferences> {
    // Check the request
    const knownUser = requireUser(user);
    const isValid = isPreferenceName(name) && isPreferenceValue(value);
    if (!isValid) {
      throw new BadRequestException(
        apiError({ message: MESSAGE_ID.preferenceInvalid, details: { params: { name } } }),
      );
    }

    // Write it, unless the user already has too many others
    const overlay = await this.overlay.update((current) => {
      const own = current.userPreferences[knownUser.id] ?? {};
      const isNewName = !(name in own);
      const isFull = isNewName && Object.keys(own).length >= MAX_PREFERENCES_PER_USER;
      if (isFull) return current;

      const next: UserPreferences = { ...own, [name]: value };
      return { ...current, userPreferences: { ...current.userPreferences, [knownUser.id]: next } };
    });

    return overlay.userPreferences[knownUser.id] ?? {};
  }

  /**
   * The first visit through HA: the values this browser kept become the user's settings. When the
   * user already has settings (another device came first), they win and nothing changes.
   *
   * @returns The user's settings after the import.
   */
  async importFirst({ user, values }: ImportFirstOptions): Promise<UserPreferences> {
    const knownUser = requireUser(user);
    const cleanValues = cleanPreferences(values);

    // One step in the overlay queue: two devices opening at once cannot both import
    const overlay = await this.overlay.update((current) => {
      if (current.userPreferences[knownUser.id]) return current;

      return {
        ...current,
        userPreferences: { ...current.userPreferences, [knownUser.id]: cleanValues },
      };
    });

    return overlay.userPreferences[knownUser.id] ?? {};
  }
}

/** Without a HA user there is nobody to keep settings for (opened locally, in the demo). */
function requireUser(user: HaUser | null): HaUser {
  if (!user) throw new BadRequestException(apiError({ message: MESSAGE_ID.preferencesNoUser }));

  return user;
}
