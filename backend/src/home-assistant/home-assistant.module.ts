import { Module } from '@nestjs/common';
import { HARestClient } from './ha-rest-client.service';

@Module({
    providers: [HARestClient],
    exports: [HARestClient],
})
export class HomeAssistantModule { }
