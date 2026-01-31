/**
 * Event Trigger Service
 * 
 * Provides capabilities to emit test events for testing automations
 * and event handlers in developer tools.
 */

import { getWebSocketServer } from "@/components/realtime/websocket.server";
import { broadcastEntityStateChanged } from "@/components/realtime/websocket.server";

export interface EventTriggerParams {
  eventType: string;
  eventData: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface EventTriggerResult {
  success: boolean;
  event: {
    eventType: string;
    eventData: Record<string, any>;
    metadata?: Record<string, any>;
  };
  emittedAt: string;
  subscribers: number;
}

export interface EventTypeDefinition {
  type: string;
  description: string;
  requiredFields: string[];
  example: any;
}

/**
 * Event Trigger Service
 */
export class EventTrigger {
  /**
   * Emit a test event
   */
  async triggerEvent(params: EventTriggerParams): Promise<EventTriggerResult> {
    const emittedAt = new Date().toISOString();
    const server = getWebSocketServer();
    const subscribers = server ? server.sockets.sockets.size : 0;

    try {
      // Handle different event types
      if (params.eventType === 'entity_state_changed') {
        // Validate required fields
        if (!params.eventData.entity_id) {
          throw new Error("Missing required field: entity_id");
        }
        if (!params.eventData.old_state && !params.eventData.new_state) {
          throw new Error("Missing required fields: old_state or new_state");
        }

        // Emit entity state changed event
        broadcastEntityStateChanged({
          entityId: params.eventData.entity_id,
          state: params.eventData.new_state?.state || params.eventData.old_state?.state || 'unknown',
          attributes: params.eventData.new_state?.attributes || params.eventData.old_state?.attributes || {},
          lastChanged: emittedAt,
          lastUpdated: emittedAt,
        });
      } else {
        // Emit generic event
        if (server) {
          server.emit(params.eventType, {
            ...params.eventData,
            metadata: {
              ...params.metadata,
              isTestEvent: true,
              triggeredBy: 'dev-tools',
              emittedAt,
            },
          });
        } else {
          throw new Error("WebSocket server not initialized");
        }
      }

      return {
        success: true,
        event: {
          eventType: params.eventType,
          eventData: params.eventData,
          metadata: {
            ...params.metadata,
            isTestEvent: true,
            triggeredBy: 'dev-tools',
          },
        },
        emittedAt,
        subscribers,
      };
    } catch (error: any) {
      throw new Error(`Failed to trigger event: ${error.message}`);
    }
  }

  /**
   * Get available event types
   */
  getAvailableEventTypes(): EventTypeDefinition[] {
    return [
      {
        type: 'entity_state_changed',
        description: 'Entity state change event',
        requiredFields: ['entity_id', 'old_state', 'new_state'],
        example: {
          entity_id: 'light.living_room',
          old_state: {
            state: 'off',
            attributes: {},
          },
          new_state: {
            state: 'on',
            attributes: {
              brightness: 255,
            },
          },
        },
      },
      {
        type: 'automation_triggered',
        description: 'Automation trigger event',
        requiredFields: ['automation_id', 'trigger'],
        example: {
          automation_id: 'uuid',
          trigger: 'state',
          context: {},
        },
      },
      {
        type: 'device_connected',
        description: 'Device connection event',
        requiredFields: ['device_id'],
        example: {
          device_id: 'uuid',
          device_name: 'Living Room Light',
        },
      },
      {
        type: 'device_disconnected',
        description: 'Device disconnection event',
        requiredFields: ['device_id'],
        example: {
          device_id: 'uuid',
          device_name: 'Living Room Light',
        },
      },
    ];
  }
}

/**
 * Singleton instance
 */
let eventTrigger: EventTrigger | null = null;

/**
 * Get or create singleton instance
 */
export function getEventTrigger(): EventTrigger {
  if (!eventTrigger) {
    eventTrigger = new EventTrigger();
  }
  return eventTrigger;
}
