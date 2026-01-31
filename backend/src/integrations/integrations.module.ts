import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { DatabaseModule } from '../database/database.module';
import { GithubService } from './github.service';
import { ExtensionsLoaderService } from './extensions-loader.service';
import { Integration } from './entities/integration.entity';
import { IntegrationCatalog } from './entities/integration-catalog.entity';
import { CatalogSyncHistory } from './entities/catalog-sync-history.entity';
import { CatalogSyncChange } from './entities/catalog-sync-change.entity';
import { ConfigEntry } from './entities/config-entry.entity';

@Module({
    imports: [
        DatabaseModule,
        TypeOrmModule.forFeature([
            Integration,
            IntegrationCatalog,
            CatalogSyncHistory,
            CatalogSyncChange,
            ConfigEntry,
        ]),
    ],
    controllers: [IntegrationsController],
    providers: [IntegrationsService, GithubService, ExtensionsLoaderService],
    exports: [IntegrationsService, GithubService],
})
export class IntegrationsModule {
    constructor(private readonly extensionsLoader: ExtensionsLoaderService) {
        console.log('!!! INTEGRATIONS MODULE INITIALIZED !!!');
    }
}
