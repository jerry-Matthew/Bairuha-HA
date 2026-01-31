
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_POOL } from '../database/database.module';
import { Pool } from 'pg';
import { Device } from './devices.types';
import { EntitiesService } from './entities.service';

@Injectable()
export class DevicesService {
    constructor(
        @Inject(DATABASE_POOL) private readonly pool: Pool,
        private readonly entitiesService: EntitiesService,
    ) { }

    async getAllDevices(): Promise<Device[]> {
        const result = await this.pool.query<Device>(
            `SELECT id, name, integration_id as "integrationId", integration_name as "integrationName",
              model, manufacturer, area_id as "areaId", created_at, updated_at
       FROM devices
       ORDER BY created_at DESC`
        );
        return result.rows;
    }

    async getDeviceById(id: string): Promise<Device | null> {
        const result = await this.pool.query<Device>(
            `SELECT id, name, integration_id as "integrationId", integration_name as "integrationName",
              model, manufacturer, area_id as "areaId", created_at, updated_at
       FROM devices
       WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    async registerDevice(device: Omit<Device, "id" | "created_at" | "updated_at"> & { deviceType?: string }): Promise<Device> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        // Start transaction
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                `INSERT INTO devices (id, name, integration_id, integration_name, model, manufacturer, area_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    id,
                    device.name,
                    device.integrationId,
                    device.integrationName,
                    device.model || null,
                    device.manufacturer || null,
                    device.areaId || null,
                    now,
                    now,
                ]
            );

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        // We could do this in the transaction but EntitiesService uses the pool directly.
        // Ideally EntitiesService should accept a client or transaction manager.
        // For now, we'll do best effort.

        // Create entities
        try {
            await this.entitiesService.createEntitiesForDevice({
                id,
                name: device.name,
                integrationId: device.integrationId,
                model: device.model,
                deviceType: device.deviceType
            });
        } catch (e) {
            // Log error but don't fail device creation entirely? 
            // Legacy code rolled back device creation.
            // Since I'm not in transaction across services easily here without more refactoring,
            // I will just perform a delete if entity creation fails.
            console.error("Entity creation failed, rolling back device", e);
            await this.deleteDevice(id);
            throw new Error(`Failed to create entities for device`);
        }

        const created = await this.getDeviceById(id);
        if (!created) {
            throw new Error("Failed to create device");
        }
        return created;
    }

    async updateDevice(id: string, updates: Partial<Device>): Promise<Device> {
        const updatesList: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.name !== undefined) {
            updatesList.push(`name = $${paramIndex++}`);
            values.push(updates.name);
        }
        if (updates.areaId !== undefined) {
            updatesList.push(`area_id = $${paramIndex++}`);
            values.push(updates.areaId);
        }
        if (updates.model !== undefined) {
            updatesList.push(`model = $${paramIndex++}`);
            values.push(updates.model);
        }
        if (updates.manufacturer !== undefined) {
            updatesList.push(`manufacturer = $${paramIndex++}`);
            values.push(updates.manufacturer);
        }

        if (updatesList.length === 0) {
            const dev = await this.getDeviceById(id);
            if (!dev) throw new NotFoundException('Device not found');
            return dev;
        }

        updatesList.push(`updated_at = $${paramIndex++}`);
        values.push(new Date().toISOString());
        values.push(id);

        await this.pool.query(
            `UPDATE devices SET ${updatesList.join(", ")} WHERE id = $${paramIndex}`,
            values
        );

        const updated = await this.getDeviceById(id);
        if (!updated) {
            throw new NotFoundException("Device not found");
        }
        return updated;
    }

    async deleteDevice(id: string): Promise<void> {
        // Cascade delete handles entities, but let's be safe
        // Actually DB constraint SET cascade deletion usually
        await this.pool.query("DELETE FROM devices WHERE id = $1", [id]);
    }
}
