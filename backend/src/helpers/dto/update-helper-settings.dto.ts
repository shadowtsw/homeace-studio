import { IsObject } from "class-validator";

export class UpdateHelperSettingsDto {
  /** Type-specific settings like for creating; checked per type in the service (helper-payload.ts). */
  @IsObject()
  settings!: Record<string, unknown>;
}
