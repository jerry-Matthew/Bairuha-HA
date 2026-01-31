import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { GroupMember } from './entities/group-member.entity';
import { CreateGroupDto, UpdateGroupDto, GroupState } from './groups.types';
import { CommandsService } from '../commands/commands.service';
import { EntityState } from '../devices/entities/entity-state.entity';

@Injectable()
export class GroupsService {
    private readonly logger = new Logger(GroupsService.name);

    constructor(
        @InjectRepository(Group)
        private readonly groupRepository: Repository<Group>,
        @InjectRepository(GroupMember)
        private readonly groupMemberRepository: Repository<GroupMember>,
        @InjectRepository(EntityState)
        private readonly entityRepository: Repository<EntityState>,
        private readonly commandsService: CommandsService,
    ) { }

    async findAll(includeMembers = false): Promise<any[]> {
        const groups = await this.groupRepository.find({
            order: { name: 'ASC' },
            relations: includeMembers ? ['members', 'members.entity'] : [],
        });

        const result = [];
        for (const group of groups) {
            const groupData: any = { ...group };
            groupData.memberCount = await this.groupMemberRepository.count({ where: { groupId: group.id } });

            if (includeMembers) {
                groupData.state = await this.calculateGroupState(group.id);
            }
            result.push(groupData);
        }
        return result;
    }

    async findOne(id: string, includeMembers = false, includeState = false): Promise<any> {
        const group = await this.groupRepository.findOne({
            where: { id },
            relations: includeMembers ? ['members', 'members.entity'] : [],
        });

        if (!group) {
            throw new NotFoundException(`Group with ID ${id} not found`);
        }

        const groupData: any = { ...group };
        groupData.memberCount = await this.groupMemberRepository.count({ where: { groupId: group.id } });

        if (includeState) {
            groupData.state = await this.calculateGroupState(group.id);
        }

        return groupData;
    }

    async create(dto: CreateGroupDto): Promise<Group> {
        const group = this.groupRepository.create({
            name: dto.name,
            icon: dto.icon,
            description: dto.description,
            domain: dto.domain,
        });

        const savedGroup = await this.groupRepository.save(group);

        if (dto.entityIds && dto.entityIds.length > 0) {
            for (const entityIdStr of dto.entityIds) {
                const entity = await this.entityRepository.findOne({ where: { entityId: entityIdStr } });
                if (entity) {
                    await this.groupMemberRepository.save({
                        groupId: savedGroup.id,
                        entityId: entity.id,
                    });
                }
            }
        }

        return this.findOne(savedGroup.id, true);
    }

    async update(id: string, dto: UpdateGroupDto): Promise<Group> {
        const group = await this.groupRepository.findOne({ where: { id } });
        if (!group) throw new NotFoundException('Group not found');

        Object.assign(group, {
            name: dto.name ?? group.name,
            icon: dto.icon ?? group.icon,
            description: dto.description ?? group.description,
            domain: dto.domain ?? group.domain,
        });

        await this.groupRepository.save(group);
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        await this.groupRepository.delete(id);
    }

    async addMember(groupId: string, entityIdStr: string): Promise<void> {
        const entity = await this.entityRepository.findOne({ where: { entityId: entityIdStr } });
        if (!entity) {
            throw new NotFoundException(`Entity ${entityIdStr} not found`);
        }

        await this.groupMemberRepository.save({
            groupId,
            entityId: entity.id,
        });
    }

    async removeMember(groupId: string, entityIdStr: string): Promise<void> {
        const entity = await this.entityRepository.findOne({ where: { entityId: entityIdStr } });
        if (!entity) return;

        await this.groupMemberRepository.delete({
            groupId,
            entityId: entity.id,
        });
    }

    async getGroupMembers(groupId: string): Promise<any[]> {
        const members = await this.groupMemberRepository.find({
            where: { groupId },
            relations: ['entity'],
        });

        return members.map(m => ({
            id: m.id,
            groupId: m.groupId,
            entityId: m.entityId,
            entityEntityId: m.entity?.entityId,
            createdAt: m.createdAt,
        }));
    }

    async calculateGroupState(groupId: string): Promise<GroupState> {
        const members = await this.groupMemberRepository.find({
            where: { groupId },
            relations: ['entity'],
        });

        if (members.length === 0) {
            return {
                state: 'unknown',
                allOn: false,
                allOff: false,
                hasMixed: false,
                memberStates: []
            };
        }

        const memberStates = members.map(m => ({
            entityId: m.entity?.entityId || 'unknown',
            state: m.entity?.state || 'unknown'
        }));

        const onStates = ['on', 'open', 'home', 'active'];
        const offStates = ['off', 'closed', 'away', 'inactive'];

        const allOn = memberStates.every(m => onStates.includes(m.state));
        const allOff = memberStates.every(m => offStates.includes(m.state));
        const anyOn = memberStates.some(m => onStates.includes(m.state));
        const anyOff = memberStates.some(m => offStates.includes(m.state));

        let state: GroupState['state'] = 'unknown';
        if (allOn) state = 'on';
        else if (allOff) state = 'off';
        else if (anyOn && anyOff) state = 'mixed';
        else if (anyOn) state = 'on';
        else state = 'off';

        return {
            state,
            allOn,
            allOff,
            hasMixed: !allOn && !allOff,
            memberStates
        };
    }

    async controlGroup(groupId: string, command: string, payload: any = {}): Promise<any> {
        const members = await this.getGroupMembers(groupId);
        const results = [];

        for (const member of members) {
            if (member.entityEntityId) {
                try {
                    const result = await this.commandsService.createCommand(member.entityEntityId, command, payload);
                    results.push(result);
                } catch (e: any) {
                    results.push({
                        entityId: member.entityEntityId,
                        status: 'failed',
                        error: e.message
                    });
                }
            }
        }

        return {
            success: true,
            results
        };
    }
}
