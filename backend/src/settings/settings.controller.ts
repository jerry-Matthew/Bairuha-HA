import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    async getAllSettings() {
        return this.settingsService.getAllSettings();
    }

    @Get(':key')
    async getSetting(@Param('key') key: string) {
        return this.settingsService.getSetting(key);
    }

    @Put(':key')
    async updateSetting(@Param('key') key: string, @Body() body: { value: any }) {
        await this.settingsService.saveSetting(key, body.value);
        return { success: true, key, value: body.value };
    }
}
