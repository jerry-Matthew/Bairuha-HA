import { Injectable, Inject, OnModuleInit, Logger, forwardRef } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { NotificationsService } from '../notifications/notifications.service';

export interface ActivityLog {
    id: string;
    entity_id: string;
    entity_name: string;
    action: string;
    area: string;
    type: string;
    timestamp: Date;
}

@Injectable()
export class ActivityService implements OnModuleInit {
    private readonly logger = new Logger(ActivityService.name);

    constructor(
        @Inject(DATABASE_POOL) private readonly pool: Pool,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notificationsService: NotificationsService,
    ) { }

    async onModuleInit() {
        await this.createTable();
    }

    private async createTable() {
        const query = `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_id TEXT NOT NULL,
        entity_name TEXT NOT NULL,
        action TEXT NOT NULL,
        area TEXT,
        type TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
        try {
            this.logger.log(`Connecting to database: ${process.env.DB_NAME} on ${process.env.DB_HOST}`);
            await this.pool.query(query);
            this.logger.log('Ensured activity_logs table exists');

            const count = await this.pool.query('SELECT COUNT(*) FROM activity_logs');
            this.logger.log(`Active activity_logs count: ${count.rows[0].count}`);
            if (parseInt(count.rows[0].count) === 0) {
                this.logger.log('Activity log is empty');
            }
        } catch (error: any) {
            this.logger.error(`Failed to create activity_logs table: ${error.message}`);
        }
    }

    async getActivities(limit: number = 50, offset: number = 0, filter?: string) {
        try {
            let query = 'SELECT * FROM activity_logs';
            const params: any[] = [];

            if (filter && filter !== 'all') {
                query += ' WHERE type = $1';
                params.push(filter);
            }

            query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(limit, offset);

            const result = await this.pool.query(query, params);

            // Get total count for pagination
            let countQuery = 'SELECT COUNT(*) FROM activity_logs';
            const countParams: any[] = [];
            if (filter && filter !== 'all') {
                countQuery += ' WHERE type = $1';
                countParams.push(filter);
            }
            const countResult = await this.pool.query(countQuery, countParams);

            const responseData = {
                data: result.rows,
                total: parseInt(countResult.rows[0].count),
                limit,
                offset
            };
            this.logger.log(`Returning ${responseData.data.length} activities`);
            return responseData;
        } catch (error: any) {
            this.logger.error(`Failed to fetch activities: ${error.message}`);
            throw error;
        }
    }

    async logActivity(entityId: string, entityName: string, action: string, area: string, type: string) {
        const query = `
      INSERT INTO activity_logs (entity_id, entity_name, action, area, type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
        const result = await this.pool.query(query, [entityId, entityName, action, area, type]);

        // Create notification for error-type activities
        if (type === 'error' || type === 'critical') {
            this.notificationsService.createNotification({
                userId: null,
                type: 'error',
                title: type === 'critical' ? 'Critical Error' : 'System Error',
                message: `${entityName}: ${action}`,
                actionUrl: '/activity',
                actionLabel: 'View Activity',
            }).catch(err => this.logger.error('Failed to create error notification', err));
        }

        return result.rows[0];
    }
}
