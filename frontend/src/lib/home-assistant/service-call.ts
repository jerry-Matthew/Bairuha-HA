/**
 * Home Assistant Service Call Service
 * 
 * Maps Bairuha UI commands to Home Assistant service calls and executes them via HA REST API.
 * Enforces architecture principle: commands never mutate entity state directly.
 * Only HA's state_changed events update entity state (handled by Task 29 WebSocket client).
 * 
 * Command Flow:
 * UI → Command Registry → Service Call Service → HA REST API → HA executes → 
 * HA emits state_changed → WebSocket Client → Entity Registry updates
 */

import { createHARestClient, HARestClientError, HAServiceResponse } from "./rest-client";
import { getCommandById, Command } from "@/components/globalAdd/server/command.registry";
import { getEntityById, Entity } from "@/components/globalAdd/server/entity.registry";

/**
 * Custom error class for service call errors
 */
export class HAServiceCallError extends Error {
  constructor(
    message: string,
    public commandId?: string,
    public queued: boolean = false,
    public originalError?: Error
  ) {
    super(message);
    this.name = "HAServiceCallError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HAServiceCallError);
    }
  }
}

/**
 * Home Assistant service call structure
 */
export interface HAServiceCall {
  domain: string;
  service: string;
  serviceData: Record<string, any>;
}

/**
 * Service call execution result
 */
export interface ServiceCallResult {
  success: boolean;
  commandId?: string;
  haResponse?: HAServiceResponse;
  error?: string;
  queued?: boolean;
  executionTime?: number;
}

/**
 * Queued command structure
 */
export interface QueuedCommand {
  commandId: string;
  entityId: string;
  command: string;
  payload: Record<string, any>;
  timestamp: number;
}

/**
 * Extract domain from HA entity ID
 * e.g., "light.living_room" → "light"
 */
function extractDomainFromHAEntityId(haEntityId: string | undefined): string {
  if (!haEntityId) {
    throw new HAServiceCallError(`Invalid HA entity ID: entity ID is undefined`);
  }
  const parts = haEntityId.split('.');
  if (parts.length < 2) {
    throw new HAServiceCallError(`Invalid HA entity ID format: ${haEntityId}`);
  }
  return parts[0];
}

/**
 * Map Bairuha command to Home Assistant service name
 */
function mapCommandToHAService(domain: string, command: string): string {
  // Domain-specific mappings
  const domainMappings: Record<string, Record<string, string>> = {
    light: {
      'turn_on': 'turn_on',
      'turn_off': 'turn_off',
      'toggle': 'toggle',
      'set_brightness': 'set_brightness',
      'set_color': 'set_color',
      'set_color_temp': 'set_color_temp',
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
      'set_hvac_mode': 'set_hvac_mode',
    },
    cover: {
      'open': 'open_cover',
      'close': 'close_cover',
      'stop': 'stop_cover',
      'set_position': 'set_cover_position',
    },
    fan: {
      'turn_on': 'turn_on',
      'turn_off': 'turn_off',
      'set_speed': 'set_speed',
    },
    lock: {
      'lock': 'lock',
      'unlock': 'unlock',
    },
  };

  // Standard mappings (fallback)
  const standardMappings: Record<string, string> = {
    'turn_on': 'turn_on',
    'turn_off': 'turn_off',
    'toggle': 'toggle',
    'set_value': 'set_value',
  };

  // Check domain-specific first
  if (domainMappings[domain]?.[command]) {
    return domainMappings[domain][command];
  }

  // Check standard mappings
  if (standardMappings[command]) {
    return standardMappings[command];
  }

  // Default: use command as-is (for custom services)
  return command;
}

/**
 * Build service data payload for HA service call
 */
function buildServiceData(entity: Entity, command: string, payload?: Record<string, any>): Record<string, any> {
  const serviceData: Record<string, any> = {
    entity_id: entity.haEntityId, // Always include entity_id
  };

  // Merge payload into service data
  if (payload) {
    Object.assign(serviceData, payload);
  }

  return serviceData;
}

/**
 * Home Assistant Service Call Service
 * 
 * Maps Bairuha commands to HA service calls and executes them.
 * Handles command queuing when HA is offline.
 */
export class HAServiceCallService {
  private commandQueue: Map<string, QueuedCommand> = new Map();
  private readonly MAX_QUEUE_SIZE = 1000;
  private haOnlineCache: { result: boolean; timestamp: number } | null = null;
  private readonly HA_ONLINE_CACHE_TTL = 30000; // 30 seconds
  private restClient = createHARestClient();

  /**
   * Check if Home Assistant is online
   * Caches result for 30 seconds to avoid excessive checks
   */
  async isHAOnline(): Promise<boolean> {
    // Check cache
    if (this.haOnlineCache && Date.now() - this.haOnlineCache.timestamp < this.HA_ONLINE_CACHE_TTL) {
      return this.haOnlineCache.result;
    }

    // Test connection by trying to get states
    try {
      await this.restClient.getStates();
      this.haOnlineCache = { result: true, timestamp: Date.now() };
      return true;
    } catch (error) {
      this.haOnlineCache = { result: false, timestamp: Date.now() };
      return false;
    }
  }

  /**
   * Validate entity can be controlled via Home Assistant
   */
  private validateEntityCanBeControlled(entity: Entity): void {
    if (!entity.haEntityId) {
      throw new HAServiceCallError(
        `Entity ${entity.entityId} cannot be controlled via Home Assistant: missing ha_entity_id`
      );
    }

    if (entity.source !== 'ha' && entity.source !== 'hybrid') {
      throw new HAServiceCallError(
        `Entity ${entity.entityId} cannot be controlled via Home Assistant: source is '${entity.source}', must be 'ha' or 'hybrid'`
      );
    }
  }

  /**
   * Map Bairuha command to Home Assistant service call
   */
  private mapCommandToHAService(entity: Entity, command: string, payload?: Record<string, any>): HAServiceCall {
    if (!entity.haEntityId) {
      throw new HAServiceCallError(`Entity ${entity.entityId} has no ha_entity_id`);
    }

    const domain = extractDomainFromHAEntityId(entity.haEntityId);
    const service = mapCommandToHAService(domain, command);
    const serviceData = buildServiceData(entity, command, payload);

    return {
      domain,
      service,
      serviceData,
    };
  }

  /**
   * Queue command for later execution when HA is offline
   */
  private async queueCommand(commandId: string, entityId: string, command: string, payload: Record<string, any>): Promise<void> {
    // Check queue size limit
    if (this.commandQueue.size >= this.MAX_QUEUE_SIZE) {
      // Remove oldest command (FIFO)
      const oldestKey = this.commandQueue.keys().next().value;
      if (oldestKey) {
        this.commandQueue.delete(oldestKey);
      }
    }

    this.commandQueue.set(commandId, {
      commandId,
      entityId,
      command,
      payload,
      timestamp: Date.now(),
    });

    console.log(`Command ${commandId} queued (HA offline). Queue size: ${this.commandQueue.size}`);
  }

  /**
   * Process all queued commands when HA comes back online
   */
  async processQueuedCommands(): Promise<void> {
    if (this.commandQueue.size === 0) {
      return;
    }

    const isOnline = await this.isHAOnline();
    if (!isOnline) {
      console.log("HA is still offline, skipping queue processing");
      return;
    }

    console.log(`Processing ${this.commandQueue.size} queued commands...`);

    const commandsToProcess = Array.from(this.commandQueue.values());
    const processed: string[] = [];
    const errors: Array<{ commandId: string; error: string }> = [];

    for (const queuedCommand of commandsToProcess) {
      try {
        const result = await this.executeCommandForEntity(
          queuedCommand.entityId,
          queuedCommand.command,
          queuedCommand.payload
        );

        if (result.success) {
          processed.push(queuedCommand.commandId);
          this.commandQueue.delete(queuedCommand.commandId);
        } else {
          errors.push({
            commandId: queuedCommand.commandId,
            error: result.error || "Unknown error",
          });
          // Keep failed commands in queue for retry
        }
      } catch (error) {
        errors.push({
          commandId: queuedCommand.commandId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        // Keep failed commands in queue for retry
      }
    }

    console.log(`Processed ${processed.length} commands, ${errors.length} errors`);
  }

  /**
   * Execute command for entity (bypasses command registry)
   * Useful for automation engine (Task 38)
   */
  async executeCommandForEntity(
    entityId: string,
    command: string,
    payload?: Record<string, any>
  ): Promise<ServiceCallResult> {
    const startTime = Date.now();

    try {
      // Get entity by UUID
      const entity = await getEntityById(entityId);
      if (!entity) {
        return {
          success: false,
          error: `Entity not found: ${entityId}`,
        };
      }

      // Validate entity can be controlled
      this.validateEntityCanBeControlled(entity);

      // Map command to HA service call
      const haServiceCall = this.mapCommandToHAService(entity, command, payload);

      // Check if HA is online
      const isOnline = await this.isHAOnline();
      if (!isOnline) {
        // Queue command (but we don't have commandId here, so we can't queue it properly)
        // This method is for direct execution, so we'll throw an error instead
        return {
          success: false,
          error: "Home Assistant is offline",
          queued: false, // Can't queue without commandId
        };
      }

      // Execute service call
      const haResponse = await this.restClient.callService(
        haServiceCall.domain,
        haServiceCall.service,
        haServiceCall.serviceData
      );

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        haResponse,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof HAServiceCallError) {
        return {
          success: false,
          error: error.message,
          executionTime,
        };
      }

      if (error instanceof HARestClientError) {
        // Check if error is retryable (network error, HA offline)
        if (error.isRetryable) {
          return {
            success: false,
            error: error.message,
            queued: false, // Can't queue without commandId
            executionTime,
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTime,
      };
    }
  }

  /**
   * Execute command by command ID (from command registry)
   * Main entry point for command execution
   */
  async executeCommand(commandId: string): Promise<ServiceCallResult> {
    const startTime = Date.now();

    try {
      // Get command from registry
      const command = await getCommandById(commandId);
      if (!command) {
        return {
          success: false,
          commandId,
          error: `Command not found: ${commandId}`,
        };
      }

      // Get entity by UUID
      const entity = await getEntityById(command.entityId);
      if (!entity) {
        return {
          success: false,
          commandId,
          error: `Entity not found for command: ${command.entityId}`,
        };
      }

      // Validate entity can be controlled
      try {
        this.validateEntityCanBeControlled(entity);
      } catch (validationError) {
        return {
          success: false,
          commandId,
          error: validationError instanceof Error ? validationError.message : "Entity validation failed",
        };
      }

      // Map command to HA service call
      let haServiceCall: HAServiceCall;
      try {
        haServiceCall = this.mapCommandToHAService(entity, command.command, command.payload);
      } catch (mappingError) {
        return {
          success: false,
          commandId,
          error: mappingError instanceof Error ? mappingError.message : "Command mapping failed",
        };
      }

      // Check if HA is online
      const isOnline = await this.isHAOnline();
      if (!isOnline) {
        // Queue command for later execution
        await this.queueCommand(commandId, command.entityId, command.command, command.payload);
        return {
          success: false,
          commandId,
          error: "Home Assistant is offline, command queued",
          queued: true,
        };
      }

      // Execute service call
      try {
        const haResponse = await this.restClient.callService(
          haServiceCall.domain,
          haServiceCall.service,
          haServiceCall.serviceData
        );

        const executionTime = Date.now() - startTime;

        return {
          success: true,
          commandId,
          haResponse,
          executionTime,
        };
      } catch (serviceError) {
        // Check if error is retryable (network error, HA offline)
        if (serviceError instanceof HARestClientError && serviceError.isRetryable) {
          // Queue command for later execution
          await this.queueCommand(commandId, command.entityId, command.command, command.payload);
          return {
            success: false,
            commandId,
            error: serviceError.message,
            queued: true,
          };
        }

        // Non-retryable error
        const executionTime = Date.now() - startTime;
        return {
          success: false,
          commandId,
          error: serviceError instanceof Error ? serviceError.message : "Service call failed",
          executionTime,
        };
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        commandId,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTime,
      };
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.commandQueue.size;
  }

  /**
   * Clear command queue (for testing)
   */
  clearQueue(): void {
    this.commandQueue.clear();
  }

  /**
   * Clear HA online cache (for testing)
   */
  clearHAOnlineCache(): void {
    this.haOnlineCache = null;
  }
}

/**
 * Singleton instance
 */
let haServiceCallService: HAServiceCallService | null = null;

/**
 * Get or create singleton instance
 */
export function getHAServiceCallService(): HAServiceCallService {
  if (!haServiceCallService) {
    haServiceCallService = new HAServiceCallService();
  }
  return haServiceCallService;
}

/**
 * Create a new service instance (for testing)
 */
export function createHAServiceCallService(): HAServiceCallService {
  return new HAServiceCallService();
}
