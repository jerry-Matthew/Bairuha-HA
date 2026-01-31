import { Module } from '@nestjs/common';
import { HacsController } from './hacs.controller';
import { HacsService } from './hacs.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [NotificationsModule],
    controllers: [HacsController],
    providers: [HacsService],
})
export class HacsModule { }
