import { IsObject } from "class-validator";

export class ImportPreferencesDto {
  /** Name → value, as this browser kept them; invalid entries are dropped. */
  @IsObject()
  values!: Record<string, unknown>;
}
