import { Inject, Injectable, Logger } from "@nestjs/common";

import { CATEGORY_SCOPE } from "../categories/categories.constants";
import { CategoriesService } from "../categories/categories.service";
import { ENTITY_LOOKUP_WAIT } from "../common/utils/wait";
import { FLOW_LOOKUP_ATTEMPTS, FLOW_LOOKUP_DELAY_MS } from "../editor/editor.constants";
import { toFlowError } from "../editor/flow-errors";
import { scriptKeyFor } from "../editor/flow-key";
import type { CreateSceneDto } from "./dto/create-scene.dto";
import type { SceneRepository } from "./repositories/scene.repository";
import { SCENE_CLOCK, SCENE_REPOSITORY } from "./scenes.constants";

const SCENE_PREFIX = "scene.";

/** Creates empty scenes in scenes.yaml; the scene editor fills them. */
@Injectable()
export class SceneCreateService {
  private readonly logger = new Logger(SceneCreateService.name);

  constructor(
    @Inject(SCENE_REPOSITORY) private readonly scenes: SceneRepository,
    private readonly categories: CategoriesService,
    @Inject(ENTITY_LOOKUP_WAIT) private readonly pause: (milliseconds: number) => Promise<void>,
    @Inject(SCENE_CLOCK) private readonly now: () => number,
  ) {}

  /**
   * Creates a scene without devices, so activating it switches nothing, then sorts it into the
   * folder. Like HA's own editor, the id is the current time in milliseconds.
   *
   * @returns The entity ID HA gave the new scene.
   * @throws BadRequestException `FLOW_INVALID` when HA rejects the config.
   */
  async create(dto: CreateSceneDto): Promise<{ entityId: string }> {
    const name = dto.name.trim();
    const id = String(this.now());

    // Write the empty scene; HA reloads its scenes on its own
    await this.scenes
      .saveConfig({ id, config: { id, name, entities: {} } })
      .catch((error: unknown) => {
        throw toFlowError(error);
      });

    // Wait for HA to register it, then sort it into its folder
    const entityId = await this.waitForEntityId(id);

    if (!entityId) {
      // The scene exists; only the folder could not be set. HA names it after a slug of the name.
      this.logger.warn(`Entity of new scene "${id}" not found; category not set`);
      return { entityId: SCENE_PREFIX + scriptKeyFor(name) };
    }

    if (dto.categoryPath) {
      await this.categories.assign({
        entityId,
        scope: CATEGORY_SCOPE.scene,
        currentCategoryId: null,
        targetPath: dto.categoryPath,
      });
    }

    this.logger.log(`Created ${entityId}`);

    return { entityId };
  }

  private async waitForEntityId(id: string): Promise<string | null> {
    for (let attempt = 0; attempt < FLOW_LOOKUP_ATTEMPTS; attempt++) {
      const entityId = await this.scenes.findEntityId(id);
      if (entityId) return entityId;

      await this.pause(FLOW_LOOKUP_DELAY_MS);
    }

    return null;
  }
}
