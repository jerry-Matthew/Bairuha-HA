
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_POOL } from '../database/database.module';
import { Pool } from 'pg';
import { Entity } from './devices.types';
// import { emitEntityStateChanged } from './entity.events'; // TODO: Implement events
// import { broadcastEntitiesCreated } from '@/components/realtime/websocket.server'; // TODO: Implement websocket integration

import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EntitiesService {
    constructor(
        @Inject(DATABASE_POOL) private readonly pool: Pool,
        private readonly activityService: ActivityService,
        private readonly notificationsService: NotificationsService,
    ) { }

    private readonly DEVICE_TYPE_TO_ENTITIES: Record<string, Array<{ domain: string; entityId: string; name: string; icon?: string }>> = {
        smart_light: [
            { domain: "light", entityId: "power", name: "Power" }
        ],
        temperature_sensor: [
            { domain: "sensor", entityId: "temperature", name: "Temperature" }
        ],
        motion_sensor: [
            { domain: "binary_sensor", entityId: "motion", name: "Motion" }
        ],
        smart_switch: [
            { domain: "switch", entityId: "power", name: "Power" }
        ],
        thermostat: [
            { domain: "climate", entityId: "thermostat", name: "Thermostat" }
        ],
        door_lock: [
            { domain: "lock", entityId: "lock", name: "Lock" }
        ],
        garage_door: [
            { domain: "cover", entityId: "garage_door", name: "Garage Door" }
        ],
        camera: [
            { domain: "camera", entityId: "stream", name: "Camera Stream" }
        ],
        fan: [
            { domain: "fan", entityId: "speed", name: "Fan Speed" }
        ],
        cover: [
            { domain: "cover", entityId: "position", name: "Cover Position" }
        ],
        climate: [
            { domain: "climate", entityId: "temperature", name: "Temperature Control" }
        ],
        default: [
            { domain: "switch", entityId: "main", name: "Main" }
        ]
    };

    async createEntitiesForDevice(device: {
        id: string;
        name: string;
        integrationId?: string;
        model?: string;
        deviceType?: string;
    }): Promise<Entity[]> {
        const deviceType = device.deviceType || this.inferDeviceType(device.model || "", device.integrationId || "");
        const entityDefinitions = this.DEVICE_TYPE_TO_ENTITIES[deviceType] || this.DEVICE_TYPE_TO_ENTITIES.default;

        const createdEntities: Entity[] = [];
        const now = new Date().toISOString();

        for (const def of entityDefinitions) {
            const entityId = `${def.domain}.${this.sanitizeEntityId(device.name)}_${def.entityId}`;
            const entityName = `${device.name} ${def.name}`;

            try {
                // We use the createEntity method but with specific pre-fill
                const created = await this.createEntity({
                    deviceId: device.id,
                    entityId: entityId,
                    domain: def.domain,
                    name: entityName,
                    icon: def.icon,
                    state: "unknown",
                    attributes: {},
                    source: "internal"
                });
                createdEntities.push(created);
            } catch (e) {
                console.error(`Failed to create entity ${entityId} for device ${device.id}`, e);
            }
        }

        return createdEntities;
    }

    private inferDeviceType(model: string, integrationId: string): string {
        const modelLower = model.toLowerCase();
        const integrationLower = integrationId.toLowerCase();

        if (modelLower.includes("light") || integrationLower.includes("light")) return "smart_light";
        if (modelLower.includes("sensor") && (modelLower.includes("temp") || modelLower.includes("temperature"))) return "temperature_sensor";
        if (modelLower.includes("motion") || modelLower.includes("pir")) return "motion_sensor";
        if (modelLower.includes("switch")) return "smart_switch";
        if (modelLower.includes("thermostat")) return "thermostat";
        if (modelLower.includes("lock") || modelLower.includes("door lock")) return "door_lock";
        if (modelLower.includes("garage")) return "garage_door";

        return "default";
    }

    private sanitizeEntityId(name: string): string {
        return name.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    }

    async getEntities(deviceId?: string): Promise<Entity[]> {
        let sql = `
      SELECT 
        id,
        device_id as "deviceId",
        entity_id as "entityId",
        domain,
        name,
        icon,
        state,
        attributes,
        last_changed as "lastChanged",
        last_updated as "lastUpdated",
        created_at as "createdAt",
        ha_entity_id as "haEntityId",
        source
      FROM entities
    `;

        const params: any[] = [];

        if (deviceId) {
            sql += ` WHERE device_id = $1`;
            params.push(deviceId);
        }

        sql += ` ORDER BY created_at DESC`;

        const result = await this.pool.query(sql, params);
        return result.rows.map(this.mapRowToEntity);
    }

    async getEntityById(id: string): Promise<Entity | null> {
        const result = await this.pool.query(
            `SELECT 
        id,
        device_id as "deviceId",
        entity_id as "entityId",
        domain,
        name,
        icon,
        state,
        attributes,
        last_changed as "lastChanged",
        last_updated as "lastUpdated",
        created_at as "createdAt",
        ha_entity_id as "haEntityId",
        source
      FROM entities
      WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) return null;
        return this.mapRowToEntity(result.rows[0]);
    }

    async getEntityByEntityId(entityId: string): Promise<Entity | null> {
        const result = await this.pool.query(
            `SELECT * FROM entities WHERE entity_id = $1`, // Use * for brevity if schema matches or explicit cols
            [entityId]
        );
        // Let's stick to explicit cols to map aliases correctly
        const explicitResult = await this.pool.query(
            `SELECT 
        id,
        device_id as "deviceId",
        entity_id as "entityId",
        domain,
        name,
        icon,
        state,
        attributes,
        last_changed as "lastChanged",
        last_updated as "lastUpdated",
        created_at as "createdAt",
        ha_entity_id as "haEntityId",
        source
      FROM entities
      WHERE entity_id = $1`,
            [entityId]
        );

        if (explicitResult.rows.length === 0) return null;
        return this.mapRowToEntity(explicitResult.rows[0]);
    }

    async createEntity(entityData: Partial<Entity> & { deviceId: string; entityId: string; domain: string }): Promise<Entity> {
        const now = new Date().toISOString();
        const result = await this.pool.query(
            `INSERT INTO entities (
            device_id, entity_id, domain, name, icon, state, attributes, 
            last_changed, last_updated, created_at, source, ha_entity_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id`,
            [
                entityData.deviceId,
                entityData.entityId,
                entityData.domain,
                entityData.name || null,
                entityData.icon || null,
                entityData.state || 'unknown',
                JSON.stringify(entityData.attributes || {}),
                now,
                now,
                now,
                entityData.source || 'internal',
                entityData.haEntityId || null
            ]
        );

        const created = await this.getEntityById(result.rows[0].id);
        if (!created) throw new Error("Failed to create entity");
        return created;
    }

    async updateEntityState(id: string, state: string, attributes?: Record<string, any>): Promise<Entity> {
        const now = new Date().toISOString();
        const current = await this.getEntityById(id);
        if (!current) throw new NotFoundException("Entity not found");

        const newLastChanged = current.state !== state ? now : (current.lastChanged || now);
        const attributesJson = attributes ? JSON.stringify(attributes) : JSON.stringify(current.attributes);

        await this.pool.query(
            `UPDATE entities 
         SET state = $1, 
             attributes = $2::jsonb,
             last_changed = $3,
             last_updated = $4
         WHERE id = $5`,
            [state, attributesJson, newLastChanged, now, id]
        );

        const updated = await this.getEntityById(id);
        if (!updated) throw new Error("Failed to update entity");

        // Log activity if state changed
        console.log(`[EntitiesService] State change detected: ${current.state} -> ${state}`);
        if (current.state !== state) {
            // Filter out noisy sensor updates (voltage, current, power, energy, etc.)
            const entityId = updated.entityId.toLowerCase();
            const isNoisySensor = entityId.includes('voltage') ||
                entityId.includes('current') ||
                entityId.includes('power') ||
                entityId.includes('energy') ||
                entityId.includes('battery') ||
                entityId.includes('signal') ||
                entityId.includes('rssi') ||
                entityId.includes('link_quality');

            if (!isNoisySensor) {
                console.log(`[EntitiesService] Logging activity for entity: ${updated.entityId}`);
                this.activityService.logActivity(
                    updated.entityId,
                    updated.name || updated.entityId,
                    `Changed to ${state}`,
                    'Unknown', // TODO: Fetch area from device
                    'state_change'
                ).then(() => {
                    console.log(`[EntitiesService] Activity logged successfully for ${updated.entityId}`);
                }).catch(err => console.error('Failed to log activity', err));
            } else {
                console.log(`[EntitiesService] Skipped noisy sensor activity: ${updated.entityId}`);
            }

            // Create notification for device going offline/unavailable
            const newStateLower = state.toLowerCase();
            const oldStateLower = current.state.toLowerCase();

            if ((newStateLower === 'unavailable' || newStateLower === 'offline') &&
                oldStateLower !== 'unavailable' && oldStateLower !== 'offline') {
                // Device just went offline
                this.notificationsService.createNotification({
                    userId: null,
                    type: 'warning',
                    title: 'Device Offline',
                    message: `${updated.name || updated.entityId} is no longer responding`,
                    actionUrl: `/devices`,
                    actionLabel: 'View Devices',
                }).catch(err => console.error('Failed to create offline notification', err));
            } else if ((oldStateLower === 'unavailable' || oldStateLower === 'offline') &&
                newStateLower !== 'unavailable' && newStateLower !== 'offline') {
                // Device came back online
                this.notificationsService.createNotification({
                    userId: null,
                    type: 'success',
                    title: 'Device Back Online',
                    message: `${updated.name || updated.entityId} is now responding`,
                    actionUrl: `/devices`,
                    actionLabel: 'View Devices',
                }).catch(err => console.error('Failed to create online notification', err));
            }
        } else {
            console.log(`[EntitiesService] No state change, skipping activity log`);
        }

        return updated;
    }

    async deleteEntitiesByDevice(deviceId: string): Promise<void> {
        await this.pool.query('DELETE FROM entities WHERE device_id = $1', [deviceId]);
    }

    private mapRowToEntity(row: any): Entity {
        return {
            ...row,
            attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : (row.attributes || {}),
            source: row.source || 'internal'
        };
    }
}
