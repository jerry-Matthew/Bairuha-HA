import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { HARestClient, HARestClientError } from '../home-assistant/ha-rest-client.service';
import { EntitiesService } from '../devices/entities.service';

export interface Command {
    id: string;
    entity_id: string;
    command: string;
    payload: Record<string, any>;
    status: string;
    created_at: Date;
}

/**
 * Map Bairuha command to Home Assistant service name
 */
function mapCommandToHAService(domain: string, command: string): string {
    const domainMappings: Record<string, Record<string, string>> = {
        light: {
            'turn_on': 'turn_on',
            'turn_off': 'turn_off',
            'toggle': 'toggle',
        },
        switch: {
            'turn_on': 'turn_on',
            'turn_off': 'turn_off',
            'toggle': 'toggle',
        },
        climate: {
            'turn_on': 'turn_on',
            'turn_off': 'turn_off',
            'set_temperature': 'set_temperature',
        },
        cover: {
            'open': 'open_cover',
            'close': 'close_cover',
            'stop': 'stop_cover',
        },
    };

    const standardMappings: Record<string, string> = {
        'turn_on': 'turn_on',
        'turn_off': 'turn_off',
        'toggle': 'toggle',
    };

    if (domainMappings[domain]?.[command]) {
        return domainMappings[domain][command];
    }

    if (standardMappings[command]) {
        return standardMappings[command];
    }

    return command;
}

@Injectable()
export class CommandsService {
    constructor(
        @Inject(DATABASE_POOL) private readonly pool: Pool,
        private readonly haRestClient: HARestClient,
        private readonly entitiesService: EntitiesService
    ) { }

    async createCommand(entityId: string, command: string, payload: Record<string, any>) {
        // Look up entity by entity_id string (e.g., "switch.patio_light_power")
        const entityResult = await this.pool.query(
            `SELECT id, entity_id as "entityId", source, ha_entity_id as "haEntityId", domain FROM entities WHERE entity_id = $1`,
            [entityId]
        );

        if (entityResult.rows.length === 0) {
            throw new NotFoundException('Entity not found');
        }

        const entity = entityResult.rows[0];

        // Create command record with status 'pending'
        const commandResult = await this.pool.query(
            `INSERT INTO commands (entity_id, command, payload, status, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING id, entity_id as "entityId", command, payload, status, created_at as "createdAt"`,
            [entity.id, command, JSON.stringify(payload), 'pending']
        );

        const commandRecord = commandResult.rows[0];

        // Execute command via Home Assistant service call if entity has ha_entity_id
        let executionResult = {
            queued: false,
            success: false,
            error: null as string | null
        };

        if (entity.haEntityId && (entity.source === 'homeassistant' || entity.source === 'ha')) {
            try {
                // Extract domain from ha_entity_id (e.g., "switch.living_room" -> "switch")
                const domain = entity.haEntityId.split('.')[0];
                const service = mapCommandToHAService(domain, command);

                // Build service data
                const serviceData: Record<string, any> = {
                    entity_id: entity.haEntityId,
                    ...payload
                };

                // Call Home Assistant service
                await this.haRestClient.callService(domain, service, serviceData);

                executionResult.success = true;
                console.log(`[Commands] Successfully executed HA service call for ${entity.haEntityId}: ${domain}.${service}`);
            } catch (error) {
                console.error('Failed to execute command via HA:', error);

                if (error instanceof HARestClientError && error.isRetryable) {
                    executionResult.queued = true;
                    executionResult.error = 'Home Assistant is offline, command queued';
                } else {
                    executionResult.error = error instanceof Error ? error.message : 'Unknown error';
                }
            }
        } else {
            // For internal entities, update the entity state directly
            // This will trigger activity logging
            try {
                const newState = command === 'turn_on' ? 'on' : command === 'turn_off' ? 'off' : command;
                await this.entitiesService.updateEntityState(entity.id, newState, payload);
                executionResult.success = true;
                console.log(`[Commands] Updated internal entity ${entity.entityId} to state: ${newState}`);
            } catch (error) {
                console.error('Failed to update internal entity state:', error);
                executionResult.error = error instanceof Error ? error.message : 'Unknown error';
            }
        }

        // Return result with command ID
        return {
            status: executionResult.queued ? 'queued' : (executionResult.success ? 'executed' : 'accepted'),
            commandId: commandRecord.id,
            entityId: entity.entityId, // Return entity_id string, not UUID
            queued: executionResult.queued,
            success: executionResult.success,
            error: executionResult.error,
        };
    }
}
