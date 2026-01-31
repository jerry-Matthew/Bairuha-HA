
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_POOL } from '../database/database.module';
import { Pool } from 'pg';
import { Area } from './devices.types';

@Injectable()
export class AreasService {
    constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) { }

    async getAllAreas(): Promise<Area[]> {
        const result = await this.pool.query<Area>(
            `SELECT id, name, icon, created_at, updated_at
       FROM areas
       ORDER BY name ASC`
        );
        return result.rows;
    }

    async getAreaById(id: string): Promise<Area | null> {
        const result = await this.pool.query<Area>(
            `SELECT id, name, icon, created_at, updated_at
       FROM areas
       WHERE id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    async getAreaByName(name: string): Promise<Area | null> {
        const result = await this.pool.query<Area>(
            `SELECT id, name, icon, created_at, updated_at
       FROM areas
       WHERE LOWER(name) = LOWER($1)`,
            [name]
        );
        return result.rows[0] || null;
    }

    async createArea(area: { name: string; icon?: string }): Promise<Area> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await this.pool.query(
            `INSERT INTO areas (id, name, icon, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)`,
            [id, area.name, area.icon || null, now, now]
        );

        const created = await this.getAreaById(id);
        if (!created) {
            throw new Error('Failed to create area');
        }
        return created;
    }

    async updateArea(id: string, updates: { name?: string; icon?: string }): Promise<Area> {
        const updatesList: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (updates.name !== undefined) {
            updatesList.push(`name = $${paramIndex++}`);
            values.push(updates.name);
        }
        if (updates.icon !== undefined) {
            updatesList.push(`icon = $${paramIndex++}`);
            values.push(updates.icon);
        }

        if (updatesList.length === 0) {
            const area = await this.getAreaById(id);
            if (!area) throw new NotFoundException('Area not found');
            return area;
        }

        updatesList.push(`updated_at = $${paramIndex++}`);
        values.push(new Date().toISOString());
        values.push(id);

        await this.pool.query(
            `UPDATE areas SET ${updatesList.join(", ")} WHERE id = $${paramIndex}`,
            values
        );

        const updated = await this.getAreaById(id);
        if (!updated) {
            throw new NotFoundException('Area not found');
        }
        return updated;
    }

    async deleteArea(id: string): Promise<void> {
        await this.pool.query('DELETE FROM areas WHERE id = $1', [id]);
    }
}
