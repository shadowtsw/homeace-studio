import { Module } from "@nestjs/common";

import { HaModule } from "../ha/ha.module";
import { HaSceneRepository } from "./repositories/ha-scene.repository";
import { SCENE_REPOSITORY } from "./scenes.constants";
import { ScenesController } from "./scenes.controller";
import { ScenesService } from "./scenes.service";

/** The scene editor: edit without switching, preview and try on purpose. */
@Module({
  imports: [HaModule],
  controllers: [ScenesController],
  providers: [ScenesService, { provide: SCENE_REPOSITORY, useClass: HaSceneRepository }],
})
export class ScenesModule {}
