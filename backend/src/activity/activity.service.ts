import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ActivityService {
    private readonly logger = new Logger(ActivityService.name);

    constructor(
        @InjectRepository(ActivityLog)
        private readonly activityRepository: Repository<ActivityLog>,
        @Inject(forwardRef(() => NotificationsService))
        private readonly notificationsService: NotificationsService,
    ) { }

    async getActivities(limit: number = 50, offset: number = 0, filter?: string) {
        try {
            const where = filter && filter !== 'all' ? { type: filter } : {};

            const [data, total] = await this.activityRepository.findAndCount({
                where,
                order: { timestamp: 'DESC' },
                take: limit,
                skip: offset,
            });

            return {
                data,
                total,
                limit,
                offset,
            };
        } catch (error: any) {
            this.logger.error(`Failed to fetch activities: ${error.message}`);
            throw error;
        }
    }

    async logActivity(entityId: string, entityName: string, action: string, area: string, type: string) {
        const activity = this.activityRepository.create({
            entityId,
            entityName,
            action,
            area,
            type,
        });

        const saved = await this.activityRepository.save(activity);

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

        return saved;
    }
}
