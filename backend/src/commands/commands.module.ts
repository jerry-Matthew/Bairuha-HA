import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommandsController } from './commands.controller';
import { CommandsService } from './commands.service';
import { DatabaseModule } from '../database/database.module';
import { HARestClient } from '../home-assistant/ha-rest-client.service';
import { DevicesModule } from '../devices/devices.module';
import { Command } from './entities/command.entity';
import { EntityState } from '../devices/entities/entity-state.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Command, EntityState]),
        DatabaseModule,
        DevicesModule
    ],
    controllers: [CommandsController],
    providers: [CommandsService, HARestClient],
    exports: [CommandsService],
})
export class CommandsModule { }
