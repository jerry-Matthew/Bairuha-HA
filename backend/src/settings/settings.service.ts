import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';

@Injectable()
export class SettingsService {
    constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) { }

    async getSetting<T>(key: string): Promise<T | null> {
        const result = await this.pool.query(
            'SELECT value FROM system_settings WHERE key = $1',
            [key],
        );

        if (result.rows.length > 0) {
            try {
                return JSON.parse(result.rows[0].value) as T;
            } catch (e) {
                return result.rows[0].value as T;
            }
        }
        return null;
    }

    async saveSetting(key: string, value: any): Promise<void> {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

        await this.pool.query(
            `INSERT INTO system_settings (key, value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE 
       SET value = $2, updated_at = CURRENT_TIMESTAMP`,
            [key, stringValue],
        );
    }

    async getAllSettings(): Promise<Record<string, any>> {
        const result = await this.pool.query('SELECT key, value FROM system_settings');
        const settings: Record<string, any> = {};

        for (const row of result.rows) {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch {
                settings[row.key] = row.value;
            }
        }

        return settings;
    }
}
