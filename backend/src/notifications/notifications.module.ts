/**
 * Notifications Module
 * 
 * Handles user notifications with real-time updates via WebSocket
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { Notification } from './entities/notification.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Notification]),
        forwardRef(() => RealtimeModule)
    ],
    controllers: [NotificationsController],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
