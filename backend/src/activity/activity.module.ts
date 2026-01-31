import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityLog } from './entities/activity-log.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([ActivityLog]),
        DatabaseModule,
        forwardRef(() => NotificationsModule)
    ],
    controllers: [ActivityController],
    providers: [ActivityService],
    exports: [ActivityService],
})
export class ActivityModule { }
