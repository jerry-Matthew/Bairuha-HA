import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityState } from './entities/entity-state.entity';
import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EntitiesService {
    constructor(
        @InjectRepository(EntityState)
        private readonly entityRepository: Repository<EntityState>,
        private readonly activityService: ActivityService,
        private readonly notificationsService: NotificationsService,
    ) { }

    private readonly DEVICE_TYPE_TO_ENTITIES: Record<string, Array<{ domain: string; entityId: string; name: string; icon?: string }>> = {
        smart_light: [{ domain: "light", entityId: "power", name: "Power" }],
        temperature_sensor: [{ domain: "sensor", entityId: "temperature", name: "Temperature" }],
        motion_sensor: [{ domain: "binary_sensor", entityId: "motion", name: "Motion" }],
        smart_switch: [{ domain: "switch", entityId: "power", name: "Power" }],
        thermostat: [{ domain: "climate", entityId: "thermostat", name: "Thermostat" }],
        door_lock: [{ domain: "lock", entityId: "lock", name: "Lock" }],
        garage_door: [{ domain: "cover", entityId: "garage_door", name: "Garage Door" }],
        camera: [{ domain: "camera", entityId: "stream", name: "Camera Stream" }],
        fan: [{ domain: "fan", entityId: "speed", name: "Fan Speed" }],
        cover: [{ domain: "cover", entityId: "position", name: "Cover Position" }],
        climate: [{ domain: "climate", entityId: "temperature", name: "Temperature Control" }],
        default: [{ domain: "switch", entityId: "main", name: "Main" }]
    };

    async createEntitiesForDevice(device: {
        id: string;
        name: string;
        integrationId?: string;
        model?: string;
        deviceType?: string;
    }): Promise<EntityState[]> {
        const deviceType = device.deviceType || this.inferDeviceType(device.model || "", device.integrationId || "");
        const entityDefinitions = this.DEVICE_TYPE_TO_ENTITIES[deviceType] || this.DEVICE_TYPE_TO_ENTITIES.default;

        const createdEntities: EntityState[] = [];

        for (const def of entityDefinitions) {
            const entityId = `${def.domain}.${this.sanitizeEntityId(device.name)}_${def.entityId}`;
            const entityName = `${device.name} ${def.name}`;

            try {
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

    async getEntities(deviceId?: string): Promise<EntityState[]> {
        return this.entityRepository.find({
            where: deviceId ? { deviceId } : {},
            order: { createdAt: 'DESC' },
            relations: ['device']
        });
    }

    async getEntityById(id: string): Promise<EntityState | null> {
        return this.entityRepository.findOne({ where: { id }, relations: ['device'] });
    }

    async getEntityByEntityId(entityId: string): Promise<EntityState | null> {
        return this.entityRepository.findOne({ where: { entityId }, relations: ['device'] });
    }

    async createEntity(entityData: Partial<EntityState> & { deviceId: string; entityId: string; domain: string }): Promise<EntityState> {
        const entity = this.entityRepository.create({
            ...entityData,
            state: entityData.state || 'unknown',
            attributes: entityData.attributes || {},
            source: entityData.source || 'internal',
        });
        return this.entityRepository.save(entity);
    }

    async updateEntityState(id: string, state: string, attributes?: Record<string, any>): Promise<EntityState> {
        const current = await this.getEntityById(id);
        if (!current) throw new NotFoundException("Entity not found");

        const oldState = current.state;
        const now = new Date();

        const updates: Partial<EntityState> = {
            state,
            lastUpdated: now,
        };

        if (attributes) {
            updates.attributes = attributes;
        }

        if (oldState !== state) {
            updates.lastChanged = now;
        }

        await this.entityRepository.update(id, updates);
        const updated = await this.getEntityById(id);
        if (!updated) throw new Error("Failed to update entity");

        if (oldState !== state) {
            this.handleStateChange(current, updated);
        }

        return updated;
    }

    private handleStateChange(oldEntity: EntityState, newEntity: EntityState) {
        const entityId = newEntity.entityId.toLowerCase();
        const isNoisySensor = entityId.includes('voltage') ||
            entityId.includes('current') ||
            entityId.includes('power') ||
            entityId.includes('energy') ||
            entityId.includes('battery') ||
            entityId.includes('signal') ||
            entityId.includes('rssi') ||
            entityId.includes('link_quality');

        if (!isNoisySensor) {
            this.activityService.logActivity(
                newEntity.entityId,
                newEntity.name || newEntity.entityId,
                `Changed to ${newEntity.state}`,
                newEntity.device?.areaId || 'Unknown',
                'state_change'
            ).catch(err => console.error('Failed to log activity', err));
        }

        // Offline/Online notifications
        const newStateLower = newEntity.state.toLowerCase();
        const oldStateLower = oldEntity.state.toLowerCase();

        if ((newStateLower === 'unavailable' || newStateLower === 'offline') &&
            oldStateLower !== 'unavailable' && oldStateLower !== 'offline') {
            this.notificationsService.createNotification({
                userId: null,
                type: 'warning',
                title: 'Device Offline',
                message: `${newEntity.name || newEntity.entityId} is no longer responding`,
                actionUrl: `/devices`,
                actionLabel: 'View Devices',
            }).catch(err => console.error('Failed to create offline notification', err));
        } else if ((oldStateLower === 'unavailable' || oldStateLower === 'offline') &&
            newStateLower !== 'unavailable' && newStateLower !== 'offline') {
            this.notificationsService.createNotification({
                userId: null,
                type: 'success',
                title: 'Device Back Online',
                message: `${newEntity.name || newEntity.entityId} is now responding`,
                actionUrl: `/devices`,
                actionLabel: 'View Devices',
            }).catch(err => console.error('Failed to create online notification', err));
        }
    }

    async deleteEntitiesByDevice(deviceId: string): Promise<void> {
        await this.entityRepository.delete({ deviceId });
    }
}
