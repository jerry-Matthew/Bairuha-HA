/**
 * Group Registry
 * 
 * Backend-owned registry for managing groups
 * Groups organize entities into logical collections
 */

import { query } from "@/lib/db";
import { Entity, getEntityById, getEntityByEntityId } from "./entity.registry";
import { emitGroupStateChanged } from "./group.events";

export interface Group {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  domain?: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number; // Computed field
  aggregatedState?: GroupState; // Computed field
}

export interface GroupMember {
  id: string;
  groupId: string;
  entityId: string;
  entity?: Entity; // Optional: populated when fetching with members
}

export interface GroupState {
  state: 'on' | 'off' | 'mixed' | 'unavailable' | 'unknown';
  allOn: boolean;
  allOff: boolean;
  hasMixed: boolean;
  memberStates: Array<{ entityId: string; state: string }>;
}

/**
 * Calculate aggregated group state from member entities
 */
async function calculateGroupState(members: Array<{ entity: Entity }>): Promise<GroupState> {
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
    entityId: m.entity.entityId,
    state: m.entity.state
  }));

  // Filter out unavailable entities for state calculation
  const availableStates = memberStates
    .filter(m => m.state !== 'unavailable' && m.state !== 'unknown')
    .map(m => m.state.toLowerCase());

  if (availableStates.length === 0) {
    return {
      state: 'unavailable',
      allOn: false,
      allOff: false,
      hasMixed: false,
      memberStates
    };
  }

  // Check if all are "on" (or equivalent)
  const allOn = availableStates.every(s => s === 'on' || s === 'open' || s === 'locked');
  const allOff = availableStates.every(s => s === 'off' || s === 'closed' || s === 'unlocked');

  let state: 'on' | 'off' | 'mixed' | 'unavailable' | 'unknown';
  if (allOn) {
    state = 'on';
  } else if (allOff) {
    state = 'off';
  } else {
    state = 'mixed';
  }

  return {
    state,
    allOn,
    allOff,
    hasMixed: !allOn && !allOff,
    memberStates
  };
}

/**
 * Get all groups
 */
export async function getAllGroups(includeMembers: boolean = false): Promise<Group[]> {
  const groups = await query<Group>(
    `SELECT 
      id,
      name,
      icon,
      description,
      domain,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM groups
    ORDER BY name ASC`
  );

  if (includeMembers) {
    for (const group of groups) {
      const members = await getGroupMembers(group.id);
      group.memberCount = members.length;
      if (members.length > 0) {
        const membersWithEntities = await Promise.all(
          members.map(async (member) => {
            const entity = await getEntityById(member.entityId);
            return { entity: entity! };
          })
        );
        group.aggregatedState = await calculateGroupState(membersWithEntities);
      }
    }
  } else {
    // Just get member count
    for (const group of groups) {
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
        [group.id]
      );
      group.memberCount = parseInt(countResult[0]?.count || '0', 10);
    }
  }

  return groups;
}

/**
 * Get group by ID
 */
export async function getGroupById(groupId: string, includeMembers: boolean = false): Promise<Group | null> {
  const rows = await query<Group>(
    `SELECT 
      id,
      name,
      icon,
      description,
      domain,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM groups
    WHERE id = $1`,
    [groupId]
  );

  if (rows.length === 0) {
    return null;
  }

  const group = rows[0];

  // Get member count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
    [groupId]
  );
  group.memberCount = parseInt(countResult[0]?.count || '0', 10);

  if (includeMembers) {
    const members = await getGroupMembers(groupId);
    if (members.length > 0) {
      const membersWithEntities = await Promise.all(
        members.map(async (member) => {
          const entity = await getEntityById(member.entityId);
          return { entity: entity! };
        })
      );
      group.aggregatedState = await calculateGroupState(membersWithEntities);
    }
  }

  return group;
}

/**
 * Get groups by domain
 */
export async function getGroupsByDomain(domain: string): Promise<Group[]> {
  const groups = await query<Group>(
    `SELECT 
      id,
      name,
      icon,
      description,
      domain,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM groups
    WHERE domain = $1
    ORDER BY name ASC`,
    [domain]
  );

  // Get member counts
  for (const group of groups) {
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
      [group.id]
    );
    group.memberCount = parseInt(countResult[0]?.count || '0', 10);
  }

  return groups;
}

/**
 * Create a new group
 */
export async function createGroup(data: {
  name: string;
  icon?: string;
  description?: string;
  domain?: string;
  entityIds?: string[]; // Optional: add members during creation
}): Promise<Group> {
  // Start transaction
  const result = await query<Group>(
    `INSERT INTO groups (name, icon, description, domain)
     VALUES ($1, $2, $3, $4)
     RETURNING 
       id,
       name,
       icon,
       description,
       domain,
       created_at as "createdAt",
       updated_at as "updatedAt"`,
    [data.name, data.icon || null, data.description || null, data.domain || null]
  );

  const group = result[0];

  // Add members if provided
  if (data.entityIds && data.entityIds.length > 0) {
    for (const entityIdString of data.entityIds) {
      // Get entity by entity_id string (e.g., "light.living_room")
      const entity = await getEntityByEntityId(entityIdString);
      if (entity) {
        await addEntityToGroup(group.id, entity.id);
      }
    }
  }

  group.memberCount = 0;
  if (data.entityIds) {
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
      [group.id]
    );
    group.memberCount = parseInt(countResult[0]?.count || '0', 10);
  }

  return group;
}

/**
 * Update group metadata
 */
export async function updateGroup(groupId: string, data: {
  name?: string;
  icon?: string;
  description?: string;
  domain?: string;
}): Promise<Group> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.icon !== undefined) {
    updates.push(`icon = $${paramIndex++}`);
    values.push(data.icon);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.domain !== undefined) {
    updates.push(`domain = $${paramIndex++}`);
    values.push(data.domain);
  }

  if (updates.length === 0) {
    // No updates, just return existing group
    const group = await getGroupById(groupId);
    if (!group) {
      throw new Error(`Group not found: ${groupId}`);
    }
    return group;
  }

  values.push(groupId);

  const result = await query<Group>(
    `UPDATE groups
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING 
       id,
       name,
       icon,
       description,
       domain,
       created_at as "createdAt",
       updated_at as "updatedAt"`,
    values
  );

  if (result.length === 0) {
    throw new Error(`Group not found: ${groupId}`);
  }

  const group = result[0];
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
    [groupId]
  );
  group.memberCount = parseInt(countResult[0]?.count || '0', 10);

  return group;
}

/**
 * Delete a group
 */
export async function deleteGroup(groupId: string): Promise<void> {
  // Cascade delete will handle group_members
  await query(
    `DELETE FROM groups WHERE id = $1`,
    [groupId]
  );
}

/**
 * Add entity to group
 */
export async function addEntityToGroup(groupId: string, entityId: string): Promise<void> {
  // Verify group exists
  const group = await getGroupById(groupId);
  if (!group) {
    throw new Error(`Group not found: ${groupId}`);
  }

  // Verify entity exists
  const entity = await getEntityById(entityId);
  if (!entity) {
    throw new Error(`Entity not found: ${entityId}`);
  }

  // Add member (UNIQUE constraint will prevent duplicates)
  try {
    await query(
      `INSERT INTO group_members (group_id, entity_id)
       VALUES ($1, $2)`,
      [groupId, entityId]
    );
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      // Already a member, ignore
      return;
    }
    throw error;
  }

  // Recalculate and emit group state
  await recalculateAndEmitGroupState(groupId);
}

/**
 * Remove entity from group
 */
export async function removeEntityFromGroup(groupId: string, entityId: string): Promise<void> {
  await query(
    `DELETE FROM group_members WHERE group_id = $1 AND entity_id = $2`,
    [groupId, entityId]
  );

  // Recalculate and emit group state
  await recalculateAndEmitGroupState(groupId);
}

/**
 * Get all members of a group
 */
export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const members = await query<GroupMember>(
    `SELECT 
      id,
      group_id as "groupId",
      entity_id as "entityId",
      created_at as "createdAt"
    FROM group_members
    WHERE group_id = $1
    ORDER BY created_at ASC`,
    [groupId]
  );

  return members;
}

/**
 * Get group members with entity details
 */
export async function getGroupMembersWithEntities(groupId: string): Promise<Array<{ member: GroupMember; entity: Entity }>> {
  const members = await getGroupMembers(groupId);
  const result = [];

  for (const member of members) {
    const entity = await getEntityById(member.entityId);
    if (entity) {
      result.push({ member, entity });
    }
  }

  return result;
}

/**
 * Calculate aggregated state for a group
 */
export async function getGroupState(groupId: string): Promise<GroupState> {
  const membersWithEntities = await getGroupMembersWithEntities(groupId);
  return calculateGroupState(membersWithEntities.map(m => ({ entity: m.entity })));
}

/**
 * Get groups that contain a specific entity
 * @param entityId - Can be either entity UUID (database ID) or entity_id string (e.g., "sensor.temperature")
 */
export async function getGroupsForEntity(entityId: string): Promise<Group[]> {
  // First, try to get the entity to determine if entityId is a UUID or entity_id string
  let entityUuid: string;
  
  // Check if it's a UUID format (UUIDs are 36 characters with hyphens)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entityId);
  
  if (isUuid) {
    // It's already a UUID, use it directly
    entityUuid = entityId;
  } else {
    // It's an entity_id string, look up the entity to get its UUID
    const entity = await getEntityByEntityId(entityId);
    if (!entity) {
      // Entity not found, return empty array
      return [];
    }
    entityUuid = entity.id;
  }
  
  const groups = await query<Group>(
    `SELECT 
      g.id,
      g.name,
      g.icon,
      g.description,
      g.domain,
      g.created_at as "createdAt",
      g.updated_at as "updatedAt"
    FROM groups g
    INNER JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.entity_id = $1
    ORDER BY g.name ASC`,
    [entityUuid]
  );

  // Get member counts
  for (const group of groups) {
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
      [group.id]
    );
    group.memberCount = parseInt(countResult[0]?.count || '0', 10);
  }

  return groups;
}

/**
 * Recalculate group state and emit event
 */
async function recalculateAndEmitGroupState(groupId: string): Promise<void> {
  const group = await getGroupById(groupId);
  if (!group) {
    return;
  }

  const state = await getGroupState(groupId);

  emitGroupStateChanged({
    groupId: group.id,
    groupName: group.name,
    state,
    timestamp: new Date().toISOString()
  });
}
