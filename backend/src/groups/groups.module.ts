
import { Module } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { DatabaseModule } from '../database/database.module';
import { CommandsModule } from '../commands/commands.module';

@Module({
    imports: [DatabaseModule, CommandsModule],
    controllers: [GroupsController],
    providers: [GroupsService],
    exports: [GroupsService],
})
export class GroupsModule { }
