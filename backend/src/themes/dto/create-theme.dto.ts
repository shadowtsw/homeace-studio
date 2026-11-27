import { IsObject } from "class-validator";

export class CreateThemeDto {
  /** The theme in the file format; ThemesService checks every field with the shared rules. */
  @IsObject()
  theme!: Record<string, unknown>;
}
