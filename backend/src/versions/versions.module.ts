import { dirname, join } from "node:path";

import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { DEMO_ENV, isDemoMode } from "../demo/demo.constants";
import { HaModule } from "../ha/ha.module";
import { DEFAULT_OVERLAY_FILE, OVERLAY_ENV } from "../overlay/overlay.constants";
import { FileVersionsRepository } from "./repositories/file-versions.repository";
import { HaVersionTargetRepository } from "./repositories/ha-version-target.repository";
import { MemoryVersionsRepository } from "./repositories/memory-versions.repository";
import type { VersionsRepository } from "./repositories/versions.repository";
import {
  VERSION_TARGET_REPOSITORY,
  VERSIONS_CLOCK,
  VERSIONS_DIR,
  VERSIONS_FOLDER,
  VERSIONS_REPOSITORY,
} from "./versions.constants";
import { VersionsController } from "./versions.controller";
import { VersionsService } from "./versions.service";

@Module({
  imports: [HaModule],
  controllers: [VersionsController],
  providers: [
    VersionsService,
    {
      // Next to the overlay file: in the add-on /config/versions (part of HA backups).
      provide: VERSIONS_DIR,
      inject: [ConfigService],
      useFactory: (config: ConfigService): string => {
        const overlayFile = config.get<string>(OVERLAY_ENV.file)?.trim() || DEFAULT_OVERLAY_FILE;
        return join(dirname(overlayFile), VERSIONS_FOLDER);
      },
    },
    {
      // The demo keeps versions in memory, like its overlay.
      provide: VERSIONS_REPOSITORY,
      inject: [ConfigService, VERSIONS_DIR],
      useFactory: (config: ConfigService, dir: string): VersionsRepository =>
        isDemoMode(config.get<string>(DEMO_ENV))
          ? new MemoryVersionsRepository()
          : new FileVersionsRepository(dir),
    },
    { provide: VERSION_TARGET_REPOSITORY, useClass: HaVersionTargetRepository },
    { provide: VERSIONS_CLOCK, useValue: () => Date.now() },
  ],
  exports: [VersionsService],
})
export class VersionsModule {}
