/**
 * Notifications Module
 * 
 * Handles user notifications with real-time updates via WebSocket
 */

import { Module, forwardRef } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
    imports: [forwardRef(() => RealtimeModule)],
    controllers: [NotificationsController],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
