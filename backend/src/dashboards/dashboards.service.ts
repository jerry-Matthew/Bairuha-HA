import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dashboard as DashboardEntity } from './entities/dashboard.entity';
import { DashboardCard as DashboardCardEntity } from './entities/dashboard-card.entity';

@Injectable()
export class DashboardsService {
    constructor(
        @InjectRepository(DashboardEntity)
        private readonly dashboardRepository: Repository<DashboardEntity>,
        @InjectRepository(DashboardCardEntity)
        private readonly cardRepository: Repository<DashboardCardEntity>,
    ) { }

    async findAll(): Promise<DashboardEntity[]> {
        return this.dashboardRepository.find({
            order: { order: 'ASC' },
        });
    }

    async findOne(id: string): Promise<DashboardEntity> {
        const dashboard = await this.dashboardRepository.findOne({
            where: { id },
            relations: ['cards'],
            order: {
                cards: { order: 'ASC' },
            },
        });

        if (!dashboard) {
            throw new NotFoundException(`Dashboard with ID ${id} not found`);
        }

        return dashboard;
    }

    async create(data: Partial<DashboardEntity>): Promise<DashboardEntity> {
        const maxOrderResult = await this.dashboardRepository
            .createQueryBuilder('dashboard')
            .select('MAX(dashboard.order)', 'max')
            .getRawOne();

        const nextOrder = (maxOrderResult?.max ?? -1) + 1;

        const dashboard = this.dashboardRepository.create({
            ...data,
            order: nextOrder,
        });

        return this.dashboardRepository.save(dashboard);
    }

    async update(id: string, data: Partial<DashboardEntity>): Promise<DashboardEntity> {
        const dashboard = await this.dashboardRepository.findOne({ where: { id } });
        if (!dashboard) {
            throw new NotFoundException(`Dashboard with ID ${id} not found`);
        }

        Object.assign(dashboard, data);
        return this.dashboardRepository.save(dashboard);
    }

    async remove(id: string): Promise<void> {
        const result = await this.dashboardRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Dashboard with ID ${id} not found`);
        }
    }

    // --- Cards ---

    async getDashboardCards(dashboardId: string): Promise<DashboardCardEntity[]> {
        return this.cardRepository.find({
            where: { dashboardId },
            order: { order: 'ASC' },
        });
    }

    async addCard(dashboardId: string, data: Partial<DashboardCardEntity>): Promise<DashboardCardEntity> {
        const maxOrderResult = await this.cardRepository
            .createQueryBuilder('card')
            .where('card.dashboard_id = :dashboardId', { dashboardId })
            .select('MAX(card.order)', 'max')
            .getRawOne();

        const nextOrder = (maxOrderResult?.max ?? -1) + 1;

        const card = this.cardRepository.create({
            ...data,
            dashboardId,
            order: nextOrder,
            config: data.config || {},
            width: data.width || 1,
        });

        return this.cardRepository.save(card);
    }

    async updateCard(id: string, data: Partial<DashboardCardEntity>): Promise<DashboardCardEntity> {
        const card = await this.cardRepository.findOne({ where: { id } });
        if (!card) {
            throw new NotFoundException(`Card with ID ${id} not found`);
        }

        Object.assign(card, data);
        return this.cardRepository.save(card);
    }

    async deleteCard(id: string): Promise<void> {
        const result = await this.cardRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Card with ID ${id} not found`);
        }
    }

    async reorderCards(dashboardId: string, cardIds: string[]): Promise<void> {
        // Perform updates in a batch or sequential
        for (let i = 0; i < cardIds.length; i++) {
            await this.cardRepository.update(
                { id: cardIds[i], dashboardId },
                { order: i }
            );
        }
    }
}
