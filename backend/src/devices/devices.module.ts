import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../database/database.module';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DevicesController, AreasController, EntitiesController } from './devices.controller';
import { DeviceFlowsController } from './device-flows.controller';
import { DevicesService } from './devices.service';
import { DeviceFlowsService } from './device-flows.service';
import { AreasService } from './areas.service';
import { EntitiesService } from './entities.service';
import { Device } from './entities/device.entity';
import { EntityState } from './entities/entity-state.entity';
import { Area } from '../areas/entities/area.entity';
import { ConfigFlow } from './entities/config-flow.entity';
import { IntegrationCatalog } from '../integrations/entities/integration-catalog.entity';
import { ConfigSchemaService } from './integration-config-schemas';

@Module({
    imports: [
        DatabaseModule,
        ActivityModule,
        NotificationsModule,
        TypeOrmModule.forFeature([Device, Area, EntityState, ConfigFlow, IntegrationCatalog]),
    ],
    controllers: [DevicesController, AreasController, EntitiesController, DeviceFlowsController],
    providers: [DevicesService, AreasService, EntitiesService, DeviceFlowsService, ConfigSchemaService],
    exports: [DevicesService, AreasService, EntitiesService, DeviceFlowsService, ConfigSchemaService],
})
export class DevicesModule { }
