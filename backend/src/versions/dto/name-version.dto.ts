import { IsOptional, IsString, MaxLength } from "class-validator";

/** Longer input is refused; the service keeps at most MAX_VERSION_NAME_LENGTH characters of it. */
const MAX_NAME_INPUT_LENGTH = 200;

export class NameVersionDto {
  /** The name to give, or empty/null to take the name away. */
  @IsOptional()
  @IsString()
  @MaxLength(MAX_NAME_INPUT_LENGTH)
  name?: string | null;
}
