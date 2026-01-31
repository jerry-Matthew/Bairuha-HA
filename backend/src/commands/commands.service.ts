import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Command as CommandEntity } from './entities/command.entity';
import { EntityState } from '../devices/entities/entity-state.entity';
import { HARestClient, HARestClientError } from '../home-assistant/ha-rest-client.service';
import { EntitiesService } from '../devices/entities.service';

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
    private readonly logger = new Logger(CommandsService.name);

    constructor(
        @InjectRepository(CommandEntity)
        private readonly commandRepository: Repository<CommandEntity>,
        @InjectRepository(EntityState)
        private readonly entityRepository: Repository<EntityState>,
        private readonly haRestClient: HARestClient,
        private readonly entitiesService: EntitiesService
    ) { }

    async createCommand(entityId: string, command: string, payload: Record<string, any>) {
        // Look up entity by entity_id string (e.g., "switch.patio_light_power")
        const entity = await this.entityRepository.findOne({
            where: { entityId: entityId }
        });

        if (!entity) {
            throw new NotFoundException('Entity not found');
        }

        // Create command record with status 'pending'
        const commandRecord = this.commandRepository.create({
            entityId: entity.id,
            command,
            payload,
            status: 'pending',
        });

        const savedCommand = await this.commandRepository.save(commandRecord);

        // Execute command via Home Assistant service call if entity has haEntityId
        let executionResult = {
            queued: false,
            success: false,
            error: null as string | null
        };

        if (entity.haEntityId && (entity.source === 'homeassistant' || entity.source === 'ha')) {
            try {
                const domain = entity.haEntityId.split('.')[0];
                const service = mapCommandToHAService(domain, command);

                const serviceData: Record<string, any> = {
                    entity_id: entity.haEntityId,
                    ...payload
                };

                await this.haRestClient.callService(domain, service, serviceData);
                executionResult.success = true;
                this.logger.log(`Successfully executed HA service call for ${entity.haEntityId}: ${domain}.${service}`);
            } catch (error) {
                this.logger.error('Failed to execute command via HA:', error);

                if (error instanceof HARestClientError && error.isRetryable) {
                    executionResult.queued = true;
                    executionResult.error = 'Home Assistant is offline, command queued';
                } else {
                    executionResult.error = error instanceof Error ? error.message : 'Unknown error';
                }
            }
        } else {
            // For internal entities, update the entity state directly
            try {
                const newState = command === 'turn_on' ? 'on' : command === 'turn_off' ? 'off' : command;
                await this.entitiesService.updateEntityState(entity.id, newState, payload);
                executionResult.success = true;
                this.logger.log(`Updated internal entity ${entity.entityId} to state: ${newState}`);
            } catch (error) {
                this.logger.error('Failed to update internal entity state:', error);
                executionResult.error = error instanceof Error ? error.message : 'Unknown error';
            }
        }

        // Update command status if needed
        if (executionResult.success) {
            await this.commandRepository.update(savedCommand.id, { status: 'executed' });
        } else if (executionResult.queued) {
            await this.commandRepository.update(savedCommand.id, { status: 'queued' });
        }

        return {
            status: executionResult.queued ? 'queued' : (executionResult.success ? 'executed' : 'accepted'),
            commandId: savedCommand.id,
            entityId: entity.entityId,
            queued: executionResult.queued,
            success: executionResult.success,
            error: executionResult.error,
        };
    }
}
