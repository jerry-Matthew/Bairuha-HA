import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { DatabaseModule } from '../database/database.module';
import { SystemSetting } from './entities/system-setting.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([SystemSetting]),
        DatabaseModule
    ],
    controllers: [SettingsController],
    providers: [SettingsService],
    exports: [SettingsService],
})
export class SettingsModule { }
