/**
 * Notifications Service
 * 
 * Manages notification CRUD operations and database interactions
 */

import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export interface CreateNotificationDto {
    userId?: string | null;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
    actionUrl?: string;
    actionLabel?: string;
    metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepository: Repository<Notification>,
        private readonly realtimeGateway: RealtimeGateway
    ) { }

    async onModuleInit() {
        await this.initializeWelcome();
    }

    /**
     * Initialize welcome notification if needed
     */
    private async initializeWelcome() {
        try {
            const count = await this.notificationRepository.count();
            if (count === 0) {
                await this.createNotification({
                    userId: null,
                    type: 'info',
                    title: 'Welcome to Home Assistant',
                    message: 'Your notification system is now active. You\'ll receive updates about integrations, devices, and system events here.',
                    actionUrl: '/dashboard',
                    actionLabel: 'Go to Dashboard',
                });
                this.logger.log('Created welcome notification');
            }
        } catch (error) {
            this.logger.error('Failed to initialize welcome notification:', error);
        }
    }

    /**
     * Get notifications for a user
     */
    async getNotifications(
        userId: string | null,
        options: {
            read?: boolean;
            type?: 'info' | 'success' | 'warning' | 'error';
            limit?: number;
            offset?: number;
        } = {}
    ) {
        const { read, type, limit = 50, offset = 0 } = options;

        const where: any = [];

        // Notifications for specific user or global (null userId)
        const baseConditions = userId ? [{ userId }, { userId: IsNull() }] : [{ userId: IsNull() }];

        for (const base of baseConditions) {
            const cond: any = { ...base };
            if (read !== undefined) cond.read = read;
            if (type) cond.type = type;
            where.push(cond);
        }

        const [notifications, total] = await this.notificationRepository.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });

        const unreadCount = await this.getUnreadCount(userId);

        return {
            notifications,
            unreadCount,
            total,
        };
    }

    /**
     * Get unread count for a user
     */
    async getUnreadCount(userId: string | null): Promise<number> {
        return this.notificationRepository.count({
            where: userId
                ? [
                    { userId, read: false },
                    { userId: IsNull(), read: false }
                ]
                : { userId: IsNull(), read: false }
        });
    }

    /**
     * Create a notification
     */
    async createNotification(data: CreateNotificationDto): Promise<Notification> {
        const notification = this.notificationRepository.create({
            userId: data.userId || null,
            type: data.type,
            title: data.title,
            message: data.message,
            actionUrl: data.actionUrl,
            actionLabel: data.actionLabel,
            metadata: data.metadata,
        });

        const saved = await this.notificationRepository.save(notification);

        // Emit socket event
        this.emitNotificationCreated(saved);
        this.emitUnreadCountChanged(saved.userId);

        return saved;
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string, userId: string | null): Promise<Notification> {
        const notification = await this.notificationRepository.findOne({
            where: { id: notificationId }
        });

        if (!notification) {
            throw new NotFoundException('Notification not found');
        }

        // Security check: only allow marking as read if it's the user's notification or global
        if (notification.userId && notification.userId !== userId) {
            throw new NotFoundException('Notification not found');
        }

        notification.read = true;
        notification.readAt = new Date();
        const saved = await this.notificationRepository.save(notification);

        // Emit socket events
        this.emitNotificationUpdated(saved);
        this.emitUnreadCountChanged(userId);

        return saved;
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string | null): Promise<number> {
        const result = await this.notificationRepository.update(
            userId ? { userId, read: false } : { userId: IsNull(), read: false },
            { read: true, readAt: new Date() }
        );

        this.emitUnreadCountChanged(userId);
        return result.affected || 0;
    }

    /**
     * Delete a notification
     */
    async deleteNotification(notificationId: string, userId: string | null): Promise<void> {
        const notification = await this.notificationRepository.findOne({
            where: { id: notificationId }
        });

        if (!notification) {
            throw new NotFoundException('Notification not found');
        }

        if (notification.userId && notification.userId !== userId) {
            throw new NotFoundException('Notification not found');
        }

        await this.notificationRepository.remove(notification);
        this.emitUnreadCountChanged(userId);
    }

    /**
     * Delete all notifications for a user
     */
    async deleteAllNotifications(userId: string | null): Promise<number> {
        const result = await this.notificationRepository.delete(
            userId ? { userId } : { userId: IsNull() }
        );
        this.emitUnreadCountChanged(userId);
        return result.affected || 0;
    }

    /**
     * Helper to emit notification created event
     */
    private emitNotificationCreated(notification: Notification) {
        const targetRoom = notification.userId ? `user:${notification.userId}` : 'global';
        this.realtimeGateway.server.to(targetRoom).emit('notification_created', notification);

        // If it's a global notification, also emit to all connected users?
        // Usually "global" notifications are just emitted to all
        if (!notification.userId) {
            this.realtimeGateway.server.emit('notification_created', notification);
        }
    }

    /**
     * Helper to emit notification updated event
     */
    private emitNotificationUpdated(notification: Notification) {
        const targetRoom = notification.userId ? `user:${notification.userId}` : 'global';
        this.realtimeGateway.server.to(targetRoom).emit('notification_updated', notification);

        if (!notification.userId) {
            this.realtimeGateway.server.emit('notification_updated', notification);
        }
    }

    /**
     * Helper to emit unread count changed event
     */
    private async emitUnreadCountChanged(userId: string | null) {
        if (userId) {
            const count = await this.getUnreadCount(userId);
            this.realtimeGateway.server.to(`user:${userId}`).emit('unread_count_changed', { count });
        } else {
            // For global? Maybe we don't broadcast global count changes to everyone?
            // Usually the frontend calculates count locally or polls.
        }
    }
}
