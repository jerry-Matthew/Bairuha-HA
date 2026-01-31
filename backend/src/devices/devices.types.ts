
export interface Device {
    id: string;
    name: string;
    integrationId: string;
    integrationName: string;
    model?: string;
    manufacturer?: string;
    areaId?: string;
    created_at: string;
    updated_at: string;
}

export interface Area {
    id: string;
    name: string;
    icon?: string;
    created_at: string;
    updated_at: string;
}

export interface Entity {
    id: string;
    deviceId: string;
    entityId: string;
    domain: string;
    name?: string;
    icon?: string;
    state: string;
    attributes: Record<string, any>;
    lastChanged?: string;
    lastUpdated: string;
    createdAt: string;
    haEntityId?: string;
    source: 'ha' | 'internal' | 'hybrid';
}
