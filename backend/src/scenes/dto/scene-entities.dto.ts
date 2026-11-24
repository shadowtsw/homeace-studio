import { IsObject } from "class-validator";

import type { SceneValue } from "../scene.model";

/** What a scene sets (or a preview shows), per device: `{ "light.x": { "state": "on", … } }`. */
export class SceneEntitiesDto {
  @IsObject()
  entities!: Record<string, SceneValue>;
}
