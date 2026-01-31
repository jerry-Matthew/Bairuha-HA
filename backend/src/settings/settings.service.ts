import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';

@Injectable()
export class SettingsService {
    constructor(
        @InjectRepository(SystemSetting)
        private readonly settingsRepository: Repository<SystemSetting>,
    ) { }

    async getSetting<T>(key: string): Promise<T | null> {
        const setting = await this.settingsRepository.findOne({ where: { key } });

        if (setting) {
            try {
                return JSON.parse(setting.value) as T;
            } catch (e) {
                return setting.value as any as T;
            }
        }
        return null;
    }

    async saveSetting(key: string, value: any): Promise<void> {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

        await this.settingsRepository.save({
            key,
            value: stringValue,
        });
    }

    async getAllSettings(): Promise<Record<string, any>> {
        const results = await this.settingsRepository.find();
        const settings: Record<string, any> = {};

        for (const row of results) {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch {
                settings[row.key] = row.value;
            }
        }

        return settings;
    }
}
