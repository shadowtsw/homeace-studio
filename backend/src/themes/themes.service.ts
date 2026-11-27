import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { apiError } from "../common/api/api-response";
import { checkThemeValue } from "../core/themes/checkTheme";
import {
  MAX_OWN_THEMES,
  newOwnThemeId,
  ownThemeRecord,
  readOwnThemes,
  uniqueThemeName,
  type OwnTheme,
  type OwnThemeRecord,
} from "../core/themes/ownThemes";
import { MESSAGE_ID } from "../messages/message-ids";
import { OVERLAY_REPOSITORY } from "../overlay/overlay.constants";
import type { Overlay } from "../overlay/overlay.model";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import type { HaUser } from "../preferences/ha-user";

export type CreateOptions = {
  user: HaUser | null;
  /** The theme in the file format, from the request body: checked again here. */
  theme: unknown;
};

export type CreatedTheme = {
  id: string;
  themes: OwnThemeRecord[];
};

/**
 * Own themes per HA user, in the overlay. Whatever comes in goes through the same check as in the
 * browser (core/themes), so only clean themes are stored; whatever is read is checked again.
 */
@Injectable()
export class ThemesService {
  constructor(@Inject(OVERLAY_REPOSITORY) private readonly overlay: OverlayRepository) {}

  async list(user: HaUser | null): Promise<OwnThemeRecord[]> {
    const knownUser = requireUser(user);
    const overlay = await this.overlay.read();

    return ownThemesOf({ overlay, user: knownUser }).map(ownThemeRecord);
  }

  /**
   * Stores a theme under a name no other own theme of the user has (" (2)" instead of
   * overwriting).
   *
   * @returns The new theme's id and the user's whole list.
   */
  async create({ user, theme }: CreateOptions): Promise<CreatedTheme> {
    // Check the theme like a file from outside
    const knownUser = requireUser(user);
    const result = checkThemeValue(theme);
    if (!result.isValid || !result.theme.name) {
      throw new BadRequestException(apiError({ message: MESSAGE_ID.themeInvalid }));
    }

    // Add it in one step of the overlay queue (a failed step does not block the next one)
    const id = newOwnThemeId();
    const overlay = await this.overlay.update((current) => {
      const ownThemes = ownThemesOf({ overlay: current, user: knownUser });
      if (ownThemes.length >= MAX_OWN_THEMES) throw limitReached();

      const takenNames = ownThemes.map((ownTheme) => ownTheme.theme.name);
      const name = uniqueThemeName({ name: result.theme.name, takenNames });
      const added: OwnTheme = { id, theme: { ...result.theme, name } };
      const withAdded = [...ownThemes, added];
      return withOwnThemes({ overlay: current, user: knownUser, ownThemes: withAdded });
    });

    return { id, themes: ownThemesOf({ overlay, user: knownUser }).map(ownThemeRecord) };
  }

  /** @returns The user's list without the theme. */
  async remove({ user, id }: { user: HaUser | null; id: string }): Promise<OwnThemeRecord[]> {
    const knownUser = requireUser(user);

    const overlay = await this.overlay.update((current) => {
      const ownThemes = ownThemesOf({ overlay: current, user: knownUser });
      const kept = ownThemes.filter((ownTheme) => ownTheme.id !== id);
      if (kept.length === ownThemes.length) {
        throw new NotFoundException(apiError({ message: MESSAGE_ID.themeNotFound }));
      }

      return withOwnThemes({ overlay: current, user: knownUser, ownThemes: kept });
    });

    return ownThemesOf({ overlay, user: knownUser }).map(ownThemeRecord);
  }
}

/** The user's stored themes, checked again (the overlay file can be edited by hand). */
function ownThemesOf({ overlay, user }: { overlay: Overlay; user: HaUser }): OwnTheme[] {
  return readOwnThemes(overlay.userThemes[user.id]);
}

function withOwnThemes({
  overlay,
  user,
  ownThemes,
}: {
  overlay: Overlay;
  user: HaUser;
  ownThemes: OwnTheme[];
}): Overlay {
  const records = ownThemes.map(ownThemeRecord);

  return { ...overlay, userThemes: { ...overlay.userThemes, [user.id]: records } };
}

function limitReached(): ConflictException {
  const details = { params: { count: MAX_OWN_THEMES } };

  return new ConflictException(apiError({ message: MESSAGE_ID.themeLimitReached, details }));
}

/** Without a HA user there is nobody to keep themes for; the browser keeps them then. */
function requireUser(user: HaUser | null): HaUser {
  if (!user) throw new BadRequestException(apiError({ message: MESSAGE_ID.themesNoUser }));

  return user;
}
