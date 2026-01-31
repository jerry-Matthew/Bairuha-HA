import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Area } from '../areas/entities/area.entity';

@Injectable()
export class AreasService {
    constructor(
        @InjectRepository(Area)
        private readonly areaRepository: Repository<Area>,
    ) { }

    async getAllAreas(): Promise<Area[]> {
        return this.areaRepository.find({ order: { name: 'ASC' } });
    }

    async getAreaById(id: string): Promise<Area | null> {
        return this.areaRepository.findOne({ where: { id } });
    }

    async getAreaByName(name: string): Promise<Area | null> {
        return this.areaRepository.findOne({
            where: { name: ILike(name) },
        });
    }

    async createArea(area: { name: string; icon?: string }): Promise<Area> {
        const newArea = this.areaRepository.create({
            name: area.name,
            icon: area.icon,
        });
        return this.areaRepository.save(newArea);
    }

    async updateArea(id: string, updates: { name?: string; icon?: string }): Promise<Area> {
        await this.areaRepository.update(id, updates);
        const updated = await this.getAreaById(id);
        if (!updated) {
            throw new NotFoundException('Area not found');
        }
        return updated;
    }

    async deleteArea(id: string): Promise<void> {
        await this.areaRepository.delete(id);
    }
}
