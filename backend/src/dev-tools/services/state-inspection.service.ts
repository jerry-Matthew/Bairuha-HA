import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityState } from '../../devices/entities/entity-state.entity';

export interface EntityFilters {
    domain?: string;
    deviceId?: string;
    state?: string;
    source?: 'ha' | 'internal' | 'hybrid' | string;
    limit?: number;
    offset?: number;
}

export interface EntityStats {
    total: number;
    byDomain: Record<string, number>;
    bySource: Record<string, number>;
    byState: Record<string, number>;
}

@Injectable()
export class StateInspectionService {
    constructor(
        @InjectRepository(EntityState)
        private readonly entityRepository: Repository<EntityState>
    ) { }

    async getEntities(filters: EntityFilters) {
        const qb = this.entityRepository.createQueryBuilder('e');

        if (filters.domain) {
            qb.andWhere('e.domain = :domain', { domain: filters.domain });
        }

        if (filters.deviceId) {
            qb.andWhere('e.device_id = :deviceId', { deviceId: filters.deviceId });
        }

        if (filters.state) {
            qb.andWhere('e.state = :state', { state: filters.state });
        }

        if (filters.source) {
            qb.andWhere('e.source = :source', { source: filters.source });
        }

        const total = await qb.getCount();

        const limit = filters.limit || 100;
        const offset = filters.offset || 0;

        qb.orderBy('e.created_at', 'DESC')
            .limit(limit)
            .offset(offset);

        const entities = await qb.getMany();

        return { entities, total };
    }

    async getEntity(entityId: string) {
        return this.entityRepository.findOne({
            where: { entityId }
        });
    }

    async getEntityStats(): Promise<EntityStats> {
        const total = await this.entityRepository.count();

        // Get counts by domain
        const domainCounts = await this.entityRepository
            .createQueryBuilder('e')
            .select('e.domain', 'domain')
            .addSelect('COUNT(*)', 'count')
            .groupBy('e.domain')
            .getRawMany();

        const byDomain: Record<string, number> = {};
        domainCounts.forEach(row => {
            byDomain[row.domain] = parseInt(row.count, 10);
        });

        // Get counts by source
        const sourceCounts = await this.entityRepository
            .createQueryBuilder('e')
            .select('e.source', 'source')
            .addSelect('COUNT(*)', 'count')
            .groupBy('e.source')
            .getRawMany();

        const bySource: Record<string, number> = {};
        sourceCounts.forEach(row => {
            bySource[row.source || 'internal'] = parseInt(row.count, 10);
        });

        // Get counts by state
        const stateCounts = await this.entityRepository
            .createQueryBuilder('e')
            .select('e.state', 'state')
            .addSelect('COUNT(*)', 'count')
            .groupBy('e.state')
            .orderBy('count', 'DESC')
            .limit(20)
            .getRawMany();

        const byState: Record<string, number> = {};
        stateCounts.forEach(row => {
            byState[row.state] = parseInt(row.count, 10);
        });

        return {
            total,
            byDomain,
            bySource,
            byState,
        };
    }
}
