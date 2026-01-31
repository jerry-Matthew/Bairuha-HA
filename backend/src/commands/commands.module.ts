import { Module } from '@nestjs/common';
import { CommandsController } from './commands.controller';
import { CommandsService } from './commands.service';
import { DatabaseModule } from '../database/database.module';
import { HARestClient } from '../home-assistant/ha-rest-client.service';
import { DevicesModule } from '../devices/devices.module';

@Module({
    imports: [DatabaseModule, DevicesModule],
    controllers: [CommandsController],
    providers: [CommandsService, HARestClient],
    exports: [CommandsService],
})
export class CommandsModule { }
