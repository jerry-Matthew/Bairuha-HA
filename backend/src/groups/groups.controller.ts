
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto } from './groups.types';

@Controller('groups')
export class GroupsController {
    constructor(private readonly groupsService: GroupsService) { }

    @Get()
    async findAll(@Query('includeMembers') includeMembers: string) {
        const groups = await this.groupsService.findAll(includeMembers === 'true');
        return { groups };
    }

    @Post()
    async create(@Body() createGroupDto: CreateGroupDto) {
        try {
            const group = await this.groupsService.create(createGroupDto);
            return { group };
        } catch (error: any) {
            if (error.code === '23505') { // Unique violation
                throw new HttpException('A group with this name already exists', HttpStatus.CONFLICT);
            }
            throw error;
        }
    }

    @Get(':id')
    async findOne(
        @Param('id') id: string,
        @Query('includeMembers') includeMembers: string,
        @Query('includeState') includeState: string
    ) {
        const group = await this.groupsService.findOne(id, includeMembers === 'true', includeState === 'true');
        return { group };
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
        try {
            const group = await this.groupsService.update(id, updateGroupDto);
            return { group };
        } catch (error: any) {
            if (error.code === '23505') {
                throw new HttpException('A group with this name already exists', HttpStatus.CONFLICT);
            }
            throw error;
        }
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        await this.groupsService.remove(id);
        return { success: true };
    }

    @Post(':id/control')
    async control(@Param('id') id: string, @Body() body: { command: string; payload?: any }) {
        if (!body.command) {
            throw new HttpException('Command is required', HttpStatus.BAD_REQUEST);
        }
        const result = await this.groupsService.controlGroup(id, body.command, body.payload);
        return result;
    }

    @Post(':id/members')
    async addMember(@Param('id') id: string, @Body() body: { entityId: string }) {
        if (!body.entityId) {
            throw new HttpException('entityId is required', HttpStatus.BAD_REQUEST);
        }
        await this.groupsService.addMember(id, body.entityId);
        return { success: true };
    }

    @Delete(':id/members/:entityId')
    async removeMember(@Param('id') id: string, @Param('entityId') entityId: string) {
        await this.groupsService.removeMember(id, entityId);
        return { success: true };
    }
}
