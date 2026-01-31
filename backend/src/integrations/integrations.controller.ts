import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
    constructor(private readonly integrationsService: IntegrationsService) { }

    @Get()
    async getIntegrations(
        @Query('q') query?: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number
    ) {
        return this.integrationsService.getIntegrations(
            query,
            limit ? parseInt(String(limit)) : 50,
            offset ? parseInt(String(offset)) : 0
        );
    }

    @Get('sync/status')
    async getSyncStatus(@Query('syncId') syncId?: string) {
        return this.integrationsService.getSyncStatus(syncId);
    }

    @Post('sync')
    async triggerSync(@Body() body: { type?: 'full' | 'incremental' | 'manual'; dryRun?: boolean; force?: boolean }) {
        return this.integrationsService.triggerSync(body);
    }

    @Post('sync/ha')
    async syncFromHomeAssistant() {
        return this.integrationsService.syncFromHomeAssistant();
    }
}
