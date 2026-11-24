import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";

import { AiModule } from "./ai/ai.module";
import { LOCAL_ENV_FILE } from "./app.constants";
import { CheckupModule } from "./checkup/checkup.module";
import { CategoriesModule } from "./categories/categories.module";
import { EntryAreasModule } from "./areas/entry-areas.module";
import { DependenciesModule } from "./dependencies/dependencies.module";
import { ScenesModule } from "./scenes/scenes.module";
import { TracesModule } from "./traces/traces.module";
import { RenameModule } from "./rename/rename.module";
import { DuplicateModule } from "./duplicate/duplicate.module";
import { ApiExceptionFilter } from "./common/api/api-exception.filter";
import { ResponseEnvelopeInterceptor } from "./common/api/response-envelope.interceptor";
import { EditorModule } from "./editor/editor.module";
import { EntriesModule } from "./entries/entries.module";
import { HaModule } from "./ha/ha.module";
import { HelpersModule } from "./helpers/helpers.module";
import { LiveModule } from "./live/live.module";
import { LookupsModule } from "./lookups/lookups.module";
import { MessagesModule } from "./messages/messages.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: LOCAL_ENV_FILE }),
    HaModule,
    MessagesModule,
    CategoriesModule,
    EntriesModule,
    HelpersModule,
    LookupsModule,
    LiveModule,
    EditorModule,
    AiModule,
    CheckupModule,
    DependenciesModule,
    EntryAreasModule,
    TracesModule,
    ScenesModule,
    RenameModule,
    DuplicateModule,
  ],
  providers: [
    // Every answer uses the { message, error, data } envelope (docs/api.md).
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
