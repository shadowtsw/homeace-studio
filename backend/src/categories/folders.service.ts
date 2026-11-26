import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { parentOf } from "./folder-order";
import { apiError } from "src/common/api/api-response";
import { MESSAGE_ID } from "src/messages/message-ids";
import { OVERLAY_REPOSITORY } from "../overlay/overlay.constants";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import { requireCategoryPath } from "./require-category-path";

export type FolderOverview = {
  /** Empty folders the user created, e.g. "Haus/Pool". */
  saved: string[];
  /** Folder path → "#rrggbb". */
  colors: Record<string, string>;
  /** Parent path ("" for the top level) → its subfolders in the user's order. */
  order: Record<string, string[]>;
};

export type SetOrderOptions = {
  parent: string;
  order: string[];
};

export type SetColorOptions = {
  path: string;
  color: string | null;
};

/**
 * Empty folders the user creates in the tree. HA gets no category for them (no empty categories);
 * the HA category appears automatically when the first entry moves in.
 */
@Injectable()
export class FoldersService {
  constructor(@Inject(OVERLAY_REPOSITORY) private readonly overlay: OverlayRepository) {}

  /** Saved empty folders (sorted) and the color of every folder that has one. */
  async findAll(): Promise<FolderOverview> {
    const overlay = await this.overlay.read();
    const saved = [...overlay.folders].sort((first, second) =>
      first.localeCompare(second, undefined, { sensitivity: "base" }),
    );

    return { saved, colors: overlay.folderColors, order: overlay.folderOrder };
  }

  /**
   * Gives a folder its own color (only in the overlay; HA categories have no color).
   */
  /**
   * Sets the own order of a folder's direct subfolders (or of the top level); an empty list goes
   * back to A–Z. Only HomeAce Studio shows it; HA keeps its categories alphabetical.
   *
   * @throws BadRequestException `CATEGORY_PATH_INVALID` for a path that is not a direct child.
   */
  async setOrder({ parent, order }: SetOrderOptions): Promise<void> {
    const parentPath = parent === "" ? "" : requireCategoryPath(parent);
    const children = order.map((path) => requireCategoryPath(path));
    if (children.some((path) => parentOf(path) !== parentPath)) {
      throw new BadRequestException(
        apiError({
          message: MESSAGE_ID.categoryPathInvalid,
          details: { params: { path: parent } },
        }),
      );
    }

    await this.overlay.update((overlay) => {
      const folderOrder = { ...overlay.folderOrder };
      if (children.length === 0) delete folderOrder[parentPath];
      else folderOrder[parentPath] = [...new Set(children)];
      return { ...overlay, folderOrder };
    });
  }

  async setColor({ path, color }: SetColorOptions): Promise<void> {
    const folder = requireCategoryPath(path);

    await this.overlay.update((overlay) => {
      const folderColors = { ...overlay.folderColors };

      if (color === null) {
        delete folderColors[folder];
      } else {
        folderColors[folder] = color;
      }

      return { ...overlay, folderColors };
    });
  }

  /** @returns The normalized path, e.g. "Haus/Pool" for " Haus / Pool ". */
  async create(path: string): Promise<string> {
    const folder = requireCategoryPath(path);
    const overlay = await this.overlay.read();

    if (overlay.folders.includes(folder)) {
      throw new ConflictException(
        apiError({ message: MESSAGE_ID.folderExists, details: { params: { path: folder } } }),
      );
    }

    await this.overlay.update((current) => ({ ...current, folders: [...current.folders, folder] }));

    return folder;
  }

  /**
   * Forgets an empty folder. HA categories are not touched; they disappear with their last entry.
   */
  async delete(path: string): Promise<void> {
    const folder = requireCategoryPath(path);
    const overlay = await this.overlay.read();

    if (!overlay.folders.includes(folder)) {
      throw new NotFoundException(
        apiError({ message: MESSAGE_ID.folderNotFound, details: { params: { path: folder } } }),
      );
    }

    await this.overlay.update((current) => ({
      ...current,
      folders: current.folders.filter((item) => item !== folder),
    }));
    await this.setColor({ path: folder, color: null });
  }
}
