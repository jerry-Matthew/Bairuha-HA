import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HacsController } from './hacs.controller';
import { HacsService } from './hacs.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { HacsExtension } from './entities/hacs-extension.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([HacsExtension]),
        NotificationsModule
    ],
    controllers: [HacsController],
    providers: [HacsService],
})
export class HacsModule { }
