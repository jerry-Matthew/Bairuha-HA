import { Module, forwardRef } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { HomeAssistantService } from './home-assistant.service';
import { ActivityModule } from '../activity/activity.module';

@Module({
    imports: [forwardRef(() => ActivityModule)],
    providers: [RealtimeGateway, HomeAssistantService],
    exports: [RealtimeGateway, HomeAssistantService],
})
export class RealtimeModule { }
