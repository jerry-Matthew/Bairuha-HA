import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { DatabaseModule } from '../database/database.module';
import { GithubService } from './github.service';

import { ExtensionsLoaderService } from './extensions-loader.service';

@Module({
    imports: [DatabaseModule],
    controllers: [IntegrationsController],
    providers: [IntegrationsService, GithubService, ExtensionsLoaderService],
    exports: [IntegrationsService, GithubService],
})
export class IntegrationsModule {
    constructor(private readonly extensionsLoader: ExtensionsLoaderService) {
        console.log('!!! INTEGRATIONS MODULE INITIALIZED !!!');
    }
}
