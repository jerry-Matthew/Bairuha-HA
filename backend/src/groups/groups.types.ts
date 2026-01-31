
export interface Group {
    id: string;
    name: string;
    icon?: string;
    description?: string;
    domain?: string;
    createdAt: string;
    updatedAt: string;
    memberCount?: number;
    members?: GroupMember[];
    state?: GroupState;
}

export interface GroupMember {
    id: string;
    groupId: string;
    entityId: string; // The UUID of the entity
    entityEntityId?: string; // The "switch.xxxx" string ID, joined
    createdAt: string;
}

export class CreateGroupDto {
    name: string;
    icon?: string;
    description?: string;
    domain?: string;
    entityIds?: string[]; // Array of entity UUIDs
}

export class UpdateGroupDto {
    name?: string;
    icon?: string;
    description?: string;
    domain?: string;
}

export interface GroupState {
    state: 'on' | 'off' | 'mixed' | 'unavailable' | 'unknown';
    allOn: boolean;
    allOff: boolean;
    hasMixed: boolean;
    memberStates: Array<{ entityId: string; state: string }>;
}
