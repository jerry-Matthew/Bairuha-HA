import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DevicesController, AreasController, EntitiesController } from './devices.controller';
import { DeviceFlowsController } from './device-flows.controller';
import { DevicesService } from './devices.service';
import { DeviceFlowsService } from './device-flows.service';
import { AreasService } from './areas.service';
import { EntitiesService } from './entities.service';

@Module({
    imports: [DatabaseModule, ActivityModule, NotificationsModule],
    controllers: [DevicesController, AreasController, EntitiesController, DeviceFlowsController],
    providers: [DevicesService, AreasService, EntitiesService, DeviceFlowsService],
    exports: [DevicesService, AreasService, EntitiesService, DeviceFlowsService],
})
export class DevicesModule { }
