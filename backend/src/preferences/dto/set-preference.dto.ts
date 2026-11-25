import { IsDefined } from "class-validator";

export class SetPreferenceDto {
  /** A boolean, a finite number or a short string; checked in PreferencesService. */
  @IsDefined()
  value!: unknown;
}
