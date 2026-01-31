import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { DatabaseModule } from '../database/database.module';
import { CommandsModule } from '../commands/commands.module';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { EntityState } from '../devices/entities/entity-state.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Group, GroupMember, EntityState]),
        DatabaseModule,
        CommandsModule
    ],
    controllers: [GroupsController],
    providers: [GroupsService],
    exports: [GroupsService],
})
export class GroupsModule { }
