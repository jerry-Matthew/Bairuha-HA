/**
 * Notifications Service
 * 
 * Manages notification CRUD operations and database interactions
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export interface Notification {
    id: string;
    user_id: string | null;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
    action_url?: string;
    action_label?: string;
    read: boolean;
    created_at: string;
    read_at?: string | null;
    metadata?: Record<string, any>;
}

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
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);
    private pool: Pool;

    constructor(private readonly realtimeGateway: RealtimeGateway) {
        this.pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'home_assistant_ldb',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
        });

        this.initializeTable();
    }

    /**
     * Initialize notifications table
     */
    private async initializeTable() {
        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        type VARCHAR(20) NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
        title VARCHAR(255) NOT NULL,
        message TEXT,
        action_url TEXT,
        action_label VARCHAR(100),
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP,
        metadata JSONB
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    `;

        try {
            await this.pool.query(createTableQuery);
            this.logger.log('Notifications table initialized');

            // Create a welcome notification if table is empty
            const countResult = await this.pool.query('SELECT COUNT(*) as count FROM notifications');
            const count = parseInt(countResult.rows[0]?.count || '0');

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
            this.logger.error('Failed to initialize notifications table:', error);
        }
    }

    /**
     * Get notifications for a user
     */
    async getNotifications(
        userId: string | null,
        options: {
            read?: boolean;
            type?: string;
            limit?: number;
            offset?: number;
        } = {}
    ) {
        const { read, type, limit = 50, offset = 0 } = options;

        let query = `
      SELECT 
        id,
        user_id,
        type,
        title,
        message,
        action_url,
        action_label,
        read,
        created_at,
        read_at,
        metadata
      FROM notifications
      WHERE user_id = $1 OR user_id IS NULL
    `;

        const params: any[] = [userId];
        let paramIndex = 2;

        if (read !== undefined) {
            query += ` AND read = $${paramIndex}`;
            params.push(read);
            paramIndex++;
        }

        if (type) {
            query += ` AND type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await this.pool.query(query, params);

        // Get unread count
        const unreadCountResult = await this.pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE (user_id = $1 OR user_id IS NULL) AND read = FALSE',
            [userId]
        );

        return {
            notifications: result.rows.map(row => this.transformKeys(row)),
            unreadCount: parseInt(unreadCountResult.rows[0]?.count || '0'),
            total: result.rowCount || 0,
        };
    }

    /**
     * Get unread count for a user
     */
    async getUnreadCount(userId: string | null): Promise<number> {
        const result = await this.pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE (user_id = $1 OR user_id IS NULL) AND read = FALSE',
            [userId]
        );

        return parseInt(result.rows[0]?.count || '0');
    }

    /**
     * Create a notification
     */
    async createNotification(data: CreateNotificationDto): Promise<Notification> {
        const query = `
      INSERT INTO notifications (user_id, type, title, message, action_url, action_label, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

        const result = await this.pool.query(query, [
            data.userId || null,
            data.type,
            data.title,
            data.message || null,
            data.actionUrl || null,
            data.actionLabel || null,
            data.metadata ? JSON.stringify(data.metadata) : null,
        ]);

        const notification = result.rows[0];

        // Emit socket event
        this.emitNotificationCreated(notification);

        return this.transformKeys(notification);
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string, userId: string | null): Promise<Notification> {
        const query = `
      UPDATE notifications
      SET read = TRUE, read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
      RETURNING *
    `;

        const result = await this.pool.query(query, [notificationId, userId]);

        if (result.rowCount === 0) {
            throw new NotFoundException('Notification not found');
        }

        const notification = result.rows[0];

        // Emit socket event
        this.emitNotificationUpdated(notification);
        this.emitUnreadCountChanged(userId);

        return this.transformKeys(notification);
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string | null): Promise<number> {
        const query = `
      UPDATE notifications
      SET read = TRUE, read_at = CURRENT_TIMESTAMP
      WHERE (user_id = $1 OR user_id IS NULL) AND read = FALSE
    `;

        const result = await this.pool.query(query, [userId]);
        return result.rowCount || 0;
    }

    /**
     * Delete a notification
     */
    async deleteNotification(notificationId: string, userId: string | null): Promise<void> {
        const query = `
      DELETE FROM notifications
      WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
    `;

        const result = await this.pool.query(query, [notificationId, userId]);

        if (result.rowCount === 0) {
            throw new NotFoundException('Notification not found');
        }

        this.emitUnreadCountChanged(userId);
    }

    /**
     * Delete all notifications for a user
     */
    async deleteAllNotifications(userId: string | null): Promise<number> {
        const query = `
      DELETE FROM notifications
      WHERE user_id = $1
    `;

        const result = await this.pool.query(query, [userId]);
        return result.rowCount || 0;
    }

    /**
     * Helper to emit notification created event
     */
    private emitNotificationCreated(notification: Notification) {
        if (notification.user_id) {
            this.realtimeGateway.server.to(`user:${notification.user_id}`).emit('notification_created', this.transformKeys(notification));
        }
    }

    /**
     * Helper to emit notification updated event
     */
    private emitNotificationUpdated(notification: Notification) {
        if (notification.user_id) {
            this.realtimeGateway.server.to(`user:${notification.user_id}`).emit('notification_updated', this.transformKeys(notification));
        }
    }

    /**
     * Helper to emit unread count changed event
     */
    private async emitUnreadCountChanged(userId: string | null) {
        if (userId) {
            const count = await this.getUnreadCount(userId);
            this.realtimeGateway.server.to(`user:${userId}`).emit('unread_count_changed', { count });
        }
    }

    /**
     * Helper to transform keys from snake_case to camelCase
     */
    private transformKeys(notification: any): any {
        return {
            id: notification.id,
            userId: notification.user_id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            actionUrl: notification.action_url,
            actionLabel: notification.action_label,
            read: notification.read,
            createdAt: notification.created_at,
            readAt: notification.read_at,
            metadata: notification.metadata,
        };
    }
}
