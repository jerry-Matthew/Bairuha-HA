import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { EntitiesService } from './entities.service';

@Injectable()
export class DevicesService {
    constructor(
        @InjectRepository(Device)
        private readonly deviceRepository: Repository<Device>,
        private readonly entitiesService: EntitiesService,
    ) { }

    async getAllDevices(): Promise<Device[]> {
        return this.deviceRepository.find({
            order: { createdAt: 'DESC' },
            relations: ['area', 'entities']
        });
    }

    async getDeviceById(id: string): Promise<Device | null> {
        return this.deviceRepository.findOne({
            where: { id },
            relations: ['area', 'entities']
        });
    }

    async registerDevice(deviceData: {
        name: string;
        integrationId: string;
        integrationName: string;
        model?: string;
        manufacturer?: string;
        areaId?: string;
        deviceType?: string;
    }): Promise<Device> {
        const device = this.deviceRepository.create({
            name: deviceData.name,
            integrationId: deviceData.integrationId,
            integrationName: deviceData.integrationName,
            model: deviceData.model,
            manufacturer: deviceData.manufacturer,
            areaId: deviceData.areaId,
        });

        const savedDevice = await this.deviceRepository.save(device);

        try {
            await this.entitiesService.createEntitiesForDevice({
                id: savedDevice.id,
                name: savedDevice.name,
                integrationId: savedDevice.integrationId,
                model: savedDevice.model,
                deviceType: deviceData.deviceType
            });
        } catch (e) {
            console.error("Entity creation failed, rolling back device", e);
            await this.deviceRepository.delete(savedDevice.id);
            throw new Error(`Failed to create entities for device`);
        }

        const created = await this.getDeviceById(savedDevice.id);
        if (!created) {
            throw new Error("Failed to create device");
        }
        return created;
    }

    async updateDevice(id: string, updates: Partial<Device>): Promise<Device> {
        await this.deviceRepository.update(id, updates);
        const updated = await this.getDeviceById(id);
        if (!updated) {
            throw new NotFoundException("Device not found");
        }
        return updated;
    }

    async deleteDevice(id: string): Promise<void> {
        await this.deviceRepository.delete(id);
    }
}
