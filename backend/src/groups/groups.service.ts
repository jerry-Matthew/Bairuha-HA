
import { Injectable, Inject, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { Group, CreateGroupDto, UpdateGroupDto, GroupMember, GroupState } from './groups.types';
import { CommandsService } from '../commands/commands.service';

@Injectable()
export class GroupsService implements OnModuleInit {
    private readonly logger = new Logger(GroupsService.name);

    constructor(
        @Inject(DATABASE_POOL) private readonly pool: Pool,
        private readonly commandsService: CommandsService,
    ) { }

    async onModuleInit() {
        await this.createTables();
    }

    private async createTables() {
        let client;
        try {
            client = await this.pool.connect();
            await client.query(`
                CREATE TABLE IF NOT EXISTS groups (
                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  name TEXT NOT NULL,
                  icon TEXT,
                  description TEXT,
                  domain TEXT,
                  created_at TIMESTAMPTZ DEFAULT now(),
                  updated_at TIMESTAMPTZ DEFAULT now(),
                  UNIQUE(name)
                );
            `);
            await client.query(`
                CREATE TABLE IF NOT EXISTS group_members (
                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
                  created_at TIMESTAMPTZ DEFAULT now(),
                  UNIQUE(group_id, entity_id)
                );
            `);

            await client.query(`CREATE INDEX IF NOT EXISTS idx_groups_domain ON groups(domain);`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_group_members_entity_id ON group_members(entity_id);`);

            this.logger.log('Groups tables initialized');
        } catch (error) {
            this.logger.error('Failed to initialize groups tables', error);
        } finally {
            if (client) client.release();
        }
    }

    async findAll(includeMembers = false): Promise<Group[]> {
        const groupsResult = await this.pool.query<Group>(
            `SELECT id, name, icon, description, domain, created_at as "createdAt", updated_at as "updatedAt" 
             FROM groups ORDER BY name ASC`
        );

        const groups = groupsResult.rows;

        // Populate member counts
        for (const group of groups) {
            const countResult = await this.pool.query(
                `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
                [group.id]
            );
            group.memberCount = parseInt(countResult.rows[0].count);

            if (includeMembers) {
                group.members = await this.getGroupMembers(group.id);
                // Also calculate aggregated state
                group.state = await this.calculateGroupState(group.id);
            }
        }

        return groups;
    }

    async findOne(id: string, includeMembers = false, includeState = false): Promise<Group> {
        const result = await this.pool.query<Group>(
            `SELECT id, name, icon, description, domain, created_at as "createdAt", updated_at as "updatedAt" 
             FROM groups WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            throw new NotFoundException(`Group with ID ${id} not found`);
        }

        const group = result.rows[0];

        const countResult = await this.pool.query(
            `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
            [group.id]
        );
        group.memberCount = parseInt(countResult.rows[0].count);

        if (includeMembers) {
            group.members = await this.getGroupMembers(group.id);
        }

        if (includeState) {
            group.state = await this.calculateGroupState(group.id);
        }

        return group;
    }

    async create(dto: CreateGroupDto): Promise<Group> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const result = await client.query<Group>(
                `INSERT INTO groups (name, icon, description, domain) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING id, name, icon, description, domain, created_at as "createdAt", updated_at as "updatedAt"`,
                [dto.name, dto.icon, dto.description, dto.domain]
            );

            const group = result.rows[0];

            if (dto.entityIds && dto.entityIds.length > 0) {
                // dto.entityIds should be UUIDs or String IDs?
                // Assuming UUIDs if internal, but API often uses string IDs.
                // Let's assume for creation via code it might be UUIDs, but via API... 
                // The frontend panel sends `selectedEntityIds` which are likely string IDs?
                // Actually the frontend create dialog didn't send members.
                // But just in case, let's treat them as string IDs and look them up.

                for (const entityIdStr of dto.entityIds) {
                    const entityRes = await client.query('SELECT id FROM entities WHERE entity_id = $1', [entityIdStr]);
                    if (entityRes.rows.length > 0) {
                        const entityUuid = entityRes.rows[0].id;
                        await client.query(
                            `INSERT INTO group_members (group_id, entity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                            [group.id, entityUuid]
                        );
                    }
                }
            }

            await client.query('COMMIT');
            return this.findOne(group.id);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async update(id: string, dto: UpdateGroupDto): Promise<Group> {
        const updates: string[] = [];
        const values: any[] = [];
        let pIdx = 1;

        if (dto.name !== undefined) { updates.push(`name = $${pIdx++}`); values.push(dto.name); }
        if (dto.icon !== undefined) { updates.push(`icon = $${pIdx++}`); values.push(dto.icon); }
        if (dto.description !== undefined) { updates.push(`description = $${pIdx++}`); values.push(dto.description); }
        if (dto.domain !== undefined) { updates.push(`domain = $${pIdx++}`); values.push(dto.domain); }

        if (updates.length > 0) {
            updates.push(`updated_at = NOW()`);
            values.push(id);
            await this.pool.query(
                `UPDATE groups SET ${updates.join(', ')} WHERE id = $${pIdx}`,
                values
            );
        }

        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        await this.pool.query(`DELETE FROM groups WHERE id = $1`, [id]);
    }

    async addMember(groupId: string, entityIdStr: string): Promise<void> {
        // Lookup UUID
        const entityRes = await this.pool.query(`SELECT id FROM entities WHERE entity_id = $1`, [entityIdStr]);
        if (entityRes.rows.length === 0) {
            throw new NotFoundException(`Entity ${entityIdStr} not found`);
        }
        const entityUuid = entityRes.rows[0].id;

        await this.pool.query(
            `INSERT INTO group_members (group_id, entity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [groupId, entityUuid]
        );
    }

    async removeMember(groupId: string, entityIdStr: string): Promise<void> {
        // Lookup UUID
        const entityRes = await this.pool.query(`SELECT id FROM entities WHERE entity_id = $1`, [entityIdStr]);
        if (entityRes.rows.length === 0) {
            // Maybe it was deleted? Just try to delete from members by joining
            return;
        }
        const entityUuid = entityRes.rows[0].id;

        await this.pool.query(
            `DELETE FROM group_members WHERE group_id = $1 AND entity_id = $2`,
            [groupId, entityUuid]
        );
    }

    async getGroupMembers(groupId: string): Promise<GroupMember[]> {
        const result = await this.pool.query<GroupMember>(
            `SELECT gm.id, gm.group_id as "groupId", gm.entity_id as "entityId", 
                    e.entity_id as "entityEntityId", gm.created_at as "createdAt"
             FROM group_members gm
             JOIN entities e ON gm.entity_id = e.id
             WHERE gm.group_id = $1`,
            [groupId]
        );
        // Note: I mapped entity UUID to "entityId" in interface, and string id to "entityEntityId".
        // But Typescript interface says entityId is string (UUID usually).
        // Let's stick to consistent naming.
        return result.rows;
    }

    async calculateGroupState(groupId: string): Promise<GroupState> {
        // Get all members and their current states directly from entities table
        const result = await this.pool.query(
            `SELECT e.entity_id, e.state 
             FROM group_members gm
             JOIN entities e ON gm.entity_id = e.id
             WHERE gm.group_id = $1`,
            [groupId]
        );

        const memberStates = result.rows.map(r => ({ entityId: r.entity_id, state: r.state }));

        if (memberStates.length === 0) {
            return {
                state: 'unknown',
                allOn: false,
                allOff: false,
                hasMixed: false,
                memberStates: []
            };
        }

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
        else if (anyOn) state = 'on'; // default to on if some are on
        else state = 'off'; // default to off

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
