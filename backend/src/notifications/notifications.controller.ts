/**
 * Notifications Controller
 * 
 * API endpoints for notification management
 */

import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Query,
    Body,
    UseGuards,
    Request,
    NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    /**
     * Get notifications for the authenticated user
     * GET /api/notifications?read=false&type=info&limit=50&offset=0
     */
    @Get()
    async getNotifications(
        @Request() req: any,
        @Query('read') read?: string,
        @Query('type') type?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string
    ) {
        // For now, use a default user ID since we don't have auth middleware
        // In production, get this from req.user after JWT authentication
        const userId = req.user?.id || null;

        const options = {
            read: read !== undefined ? read === 'true' : undefined,
            type: type as any,
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0,
        };

        return await this.notificationsService.getNotifications(userId, options);
    }

    /**
     * Get unread notification count
     * GET /api/notifications/unread/count
     */
    @Get('unread/count')
    async getUnreadCount(@Request() req: any) {
        const userId = req.user?.id || null;
        const count = await this.notificationsService.getUnreadCount(userId);
        return { count };
    }

    /**
     * Mark notification as read
     * PATCH /api/notifications/:id
     */
    @Patch(':id')
    async markAsRead(
        @Param('id') id: string,
        @Request() req: any,
        @Body() body: { read: boolean }
    ) {
        const userId = req.user?.id || null;

        if (body.read) {
            const notification = await this.notificationsService.markAsRead(id, userId);
            return { notification };
        }

        throw new NotFoundException('Invalid operation');
    }

    /**
     * Mark all notifications as read
     * POST /api/notifications/mark-all-read
     */
    @Post('mark-all-read')
    async markAllAsRead(@Request() req: any) {
        const userId = req.user?.id || null;
        const count = await this.notificationsService.markAllAsRead(userId);
        return { success: true, count };
    }

    /**
     * Delete notification
     * DELETE /api/notifications/:id
     */
    @Delete(':id')
    async deleteNotification(@Param('id') id: string, @Request() req: any) {
        const userId = req.user?.id || null;
        await this.notificationsService.deleteNotification(id, userId);
        return { success: true };
    }

    /**
     * Create a notification (for testing)
     * POST /api/notifications
     */
    @Post()
    async createNotification(@Request() req: any, @Body() body: any) {
        const userId = req.user?.id || null;

        const notification = await this.notificationsService.createNotification({
            userId: body.userId || userId,
            type: body.type || 'info',
            title: body.title,
            message: body.message,
            actionUrl: body.actionUrl,
            actionLabel: body.actionLabel,
            metadata: body.metadata,
        });

        return { notification };
    }
}
