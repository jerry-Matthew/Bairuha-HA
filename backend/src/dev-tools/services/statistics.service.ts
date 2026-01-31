import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityState } from '../../devices/entities/entity-state.entity';
import { ActivityLog } from '../../activity/entities/activity-log.entity';

@Injectable()
export class StatisticsService {
    private readonly logger = new Logger(StatisticsService.name);

    constructor(
        @InjectRepository(EntityState)
        private readonly entityRepository: Repository<EntityState>,
        @InjectRepository(ActivityLog)
        private readonly activityRepository: Repository<ActivityLog>,
    ) { }

    async getEntityStatistics(filters: any) {
        // Basic implementation using activity logs
        const [activities, total] = await this.activityRepository.findAndCount({
            order: { timestamp: 'DESC' },
            take: 100,
        });

        return {
            statistics: activities,
            total,
            timeRange: {
                start: activities.length > 0 ? activities[activities.length - 1].timestamp : new Date(),
                end: activities.length > 0 ? activities[0].timestamp : new Date()
            }
        };
    }

    async getSummaryStatistics(timeRange?: string) {
        const totalEntities = await this.entityRepository.count();
        const totalStateChanges = await this.activityRepository.count();

        const mostActiveResult = await this.activityRepository
            .createQueryBuilder('a')
            .select('a.entity_name', 'name')
            .addSelect('COUNT(*)', 'count')
            .groupBy('a.entity_name')
            .orderBy('count', 'DESC')
            .getRawOne();

        const mostActiveDomainResult = await this.activityRepository
            .createQueryBuilder('a')
            .select('a.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .groupBy('a.type')
            .orderBy('count', 'DESC')
            .getRawOne();

        return {
            totalEntities,
            totalStateChanges,
            mostActiveEntity: mostActiveResult?.name || 'N/A',
            mostActiveDomain: mostActiveDomainResult?.type || 'N/A',
            averageStateChangesPerEntity: totalEntities > 0 ? totalStateChanges / totalEntities : 0,
            timeRange: { start: new Date().toISOString(), end: new Date().toISOString() }
        };
    }
}
