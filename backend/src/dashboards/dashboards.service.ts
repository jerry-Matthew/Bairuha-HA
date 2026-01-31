
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';

export interface Dashboard {
    id: string;
    title: string;
    icon?: string;
    url_path: string;
    order: number;
    created_at?: Date;
    updated_at?: Date;
    cards?: DashboardCard[];
}

export interface DashboardCard {
    id: string;
    dashboard_id: string;
    type: string;
    config: Record<string, any>;
    order: number;
    width: number;
}

@Injectable()
export class DashboardsService {
    constructor(@Inject(DATABASE_POOL) private pool: Pool) { }

    async findAll(): Promise<Dashboard[]> {
        const { rows } = await this.pool.query(
            `SELECT * FROM dashboards ORDER BY "order" ASC`
        );
        return rows;
    }

    async findOne(id: string): Promise<Dashboard> {
        const { rows } = await this.pool.query(
            `SELECT * FROM dashboards WHERE id = $1`,
            [id]
        );
        if (!rows[0]) {
            throw new NotFoundException(`Dashboard with ID ${id} not found`);
        }
        const dashboard = rows[0];
        dashboard.cards = await this.getDashboardCards(id);
        return dashboard;
    }

    async create(data: Partial<Dashboard>): Promise<Dashboard> {
        // Get max order
        const { rows: orderRows } = await this.pool.query(
            `SELECT COALESCE(MAX("order"), -1) as max_order FROM dashboards`
        );
        const nextOrder = (orderRows[0]?.max_order ?? -1) + 1;

        const { rows } = await this.pool.query(
            `INSERT INTO dashboards (title, icon, url_path, "order")
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [data.title, data.icon, data.url_path, nextOrder]
        );
        return rows[0];
    }

    async update(id: string, data: Partial<Dashboard>): Promise<Dashboard> {
        const updates: string[] = [];
        const values: any[] = [id];
        let paramIndex = 2;

        if (data.title !== undefined) {
            updates.push(`title = $${paramIndex++}`);
            values.push(data.title);
        }
        if (data.icon !== undefined) {
            updates.push(`icon = $${paramIndex++}`);
            values.push(data.icon);
        }
        if (data.url_path !== undefined) {
            updates.push(`url_path = $${paramIndex++}`);
            values.push(data.url_path);
        }

        if (updates.length === 0) return this.findOne(id);

        updates.push(`updated_at = NOW()`);

        const { rows } = await this.pool.query(
            `UPDATE dashboards 
       SET ${updates.join(', ')}
       WHERE id = $1
       RETURNING *`,
            values
        );

        if (!rows[0]) {
            throw new NotFoundException(`Dashboard with ID ${id} not found`);
        }
        return rows[0];
    }

    async remove(id: string): Promise<void> {
        const { rowCount } = await this.pool.query(
            `DELETE FROM dashboards WHERE id = $1`,
            [id]
        );
        if (rowCount === 0) {
            throw new NotFoundException(`Dashboard with ID ${id} not found`);
        }
    }

    // --- Cards ---

    async getDashboardCards(dashboardId: string): Promise<DashboardCard[]> {
        const { rows } = await this.pool.query(
            `SELECT * FROM dashboard_cards WHERE dashboard_id = $1 ORDER BY "order" ASC`,
            [dashboardId]
        );
        return rows;
    }

    async addCard(dashboardId: string, data: Partial<DashboardCard>): Promise<DashboardCard> {
        const { rows: orderRows } = await this.pool.query(
            `SELECT COALESCE(MAX("order"), -1) as max_order FROM dashboard_cards WHERE dashboard_id = $1`,
            [dashboardId]
        );
        const nextOrder = (orderRows[0]?.max_order ?? -1) + 1;

        const { rows } = await this.pool.query(
            `INSERT INTO dashboard_cards (dashboard_id, type, config, "order", width)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [dashboardId, data.type, data.config || {}, nextOrder, data.width || 1]
        );
        return rows[0];
    }

    async updateCard(id: string, data: Partial<DashboardCard>): Promise<DashboardCard> {
        const updates: string[] = [];
        const values: any[] = [id];
        let paramIndex = 2;

        if (data.config !== undefined) {
            updates.push(`config = $${paramIndex++}`);
            values.push(data.config);
        }
        if (data.width !== undefined) {
            updates.push(`width = $${paramIndex++}`);
            values.push(data.width);
        }
        if (data.type !== undefined) {
            updates.push(`type = $${paramIndex++}`);
            values.push(data.type);
        }

        if (updates.length === 0) {
            const { rows } = await this.pool.query(`SELECT * FROM dashboard_cards WHERE id = $1`, [id]);
            return rows[0];
        }

        updates.push(`updated_at = NOW()`);

        const { rows } = await this.pool.query(
            `UPDATE dashboard_cards 
       SET ${updates.join(', ')}
       WHERE id = $1
       RETURNING *`,
            values
        );

        if (!rows[0]) {
            throw new NotFoundException(`Card with ID ${id} not found`);
        }
        return rows[0];
    }

    async deleteCard(id: string): Promise<void> {
        const { rowCount } = await this.pool.query(
            `DELETE FROM dashboard_cards WHERE id = $1`,
            [id]
        );
        if (rowCount === 0) {
            throw new NotFoundException(`Card with ID ${id} not found`);
        }
    }

    async reorderCards(dashboardId: string, cardIds: string[]): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            for (let i = 0; i < cardIds.length; i++) {
                await client.query(
                    `UPDATE dashboard_cards SET "order" = $1 WHERE id = $2 AND dashboard_id = $3`,
                    [i, cardIds[i], dashboardId]
                );
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
}
