import { Module } from "@nestjs/common";

import { CategoriesModule } from "../categories/categories.module";
import { ENTITY_LOOKUP_WAIT, wait } from "../common/utils/wait";
import { HaModule } from "../ha/ha.module";
import { HaSceneRepository } from "./repositories/ha-scene.repository";
import { SceneCreateService } from "./scene-create.service";
import { SCENE_CLOCK, SCENE_REPOSITORY } from "./scenes.constants";
import { ScenesController } from "./scenes.controller";
import { ScenesService } from "./scenes.service";

/** The scene editor: create, edit without switching, preview and try on purpose. */
@Module({
  imports: [HaModule, CategoriesModule],
  controllers: [ScenesController],
  providers: [
    ScenesService,
    SceneCreateService,
    { provide: SCENE_REPOSITORY, useClass: HaSceneRepository },
    { provide: ENTITY_LOOKUP_WAIT, useValue: wait },
    { provide: SCENE_CLOCK, useValue: () => Date.now() },
  ],
})
export class ScenesModule {}
