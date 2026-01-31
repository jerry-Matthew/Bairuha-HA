
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { RealtimeGateway } from '../../realtime/realtime.gateway';

export interface EventTriggerParams {
    eventType: string;
    eventData: Record<string, any>;
    metadata?: Record<string, any>;
}

@Injectable()
export class EventTriggerService {
    constructor(
        @Inject(forwardRef(() => RealtimeGateway))
        private realtimeGateway: RealtimeGateway
    ) { }

    async triggerEvent(params: EventTriggerParams) {
        const emittedAt = new Date().toISOString();

        // In NestJS gateway, we can emit events.
        if (params.eventType === 'entity_state_changed') {
            if (!params.eventData.entity_id) {
                throw new Error("Missing required field: entity_id");
            }

            // Broadcast via gateway
            this.realtimeGateway.broadcastEntityStateChanged({
                entityId: params.eventData.entity_id,
                state: params.eventData.new_state?.state || 'unknown',
                attributes: params.eventData.new_state?.attributes || {},
                lastChanged: emittedAt,
                lastUpdated: emittedAt,
            });
        } else {
            // Emit generic event if supported by gateway
            this.realtimeGateway.server.emit(params.eventType, {
                ...params.eventData,
                metadata: {
                    ...params.metadata,
                    isTestEvent: true,
                    triggeredBy: 'dev-tools',
                    emittedAt,
                },
            });
        }

        return {
            success: true,
            event: {
                eventType: params.eventType,
                eventData: params.eventData,
            },
            emittedAt,
        };
    }
}
