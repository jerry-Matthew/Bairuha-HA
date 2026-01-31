
import { Module } from '@nestjs/common';
import { DevToolsController } from './dev-tools.controller';
import { StateInspectionService } from './services/state-inspection.service';
import { ServiceCallService } from './services/service-call.service';
import { TemplateTesterService } from './services/template-tester.service';
import { EventTriggerService } from './services/event-trigger.service';
import { YamlValidatorService } from './services/yaml-validator.service';
import { StatisticsService } from './services/statistics.service';
import { DatabaseModule } from '../database/database.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
    imports: [DatabaseModule, RealtimeModule],
    controllers: [DevToolsController],
    providers: [
        StateInspectionService,
        ServiceCallService,
        TemplateTesterService,
        EventTriggerService,
        YamlValidatorService,
        StatisticsService
    ],
})
export class DevToolsModule { }
