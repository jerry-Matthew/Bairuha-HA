import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { ActivityService } from './activity.service';

@Controller('activity')
export class ActivityController {
    constructor(private readonly activityService: ActivityService) { }

    @Get()
    async getActivities(
        @Query('limit') limitStr?: string,
        @Query('offset') offsetStr?: string,
        @Query('filter') filter?: string,
    ) {
        const limit = limitStr ? parseInt(limitStr, 10) : 50;
        const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
        return this.activityService.getActivities(limit, offset, filter);
    }

    // Optional: Endpoint to manually log activity for testing
    @Post()
    async logActivity(@Body() body: { entityId: string; entityName: string; action: string; area: string; type: string }) {
        return this.activityService.logActivity(body.entityId, body.entityName, body.action, body.area, body.type);
    }
}
