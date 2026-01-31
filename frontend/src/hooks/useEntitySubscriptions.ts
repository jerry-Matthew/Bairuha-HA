/**
 * Entity Subscription Hook
 * 
 * Responsibilities:
 * - Subscribe to WebSocket (via root-level context)
 * - Filter entity_state_changed events
 * - Dispatch Redux updates to entity slice
 * 
 * Entity logic ONLY.
 * 
 * CRITICAL: Uses root-level WebSocket context to ensure connection is always active.
 */

import { useEffect, useCallback } from "react";
import { useWebSocketContext } from "@/contexts/websocket-context";
import { useAppDispatch } from "@/store/hooks";
import { updateEntityByEntityId, addEntities } from "@/store/slices/entities-slice";
import type { Entity } from "@/types";
import type { WebSocketMessage } from "./useWebSocket";

/**
 * Event contract (LOCKED)
 * Frontend must ONLY process events of this shape:
 */
interface EntityStateChangedEvent {
  type: "entity_state_changed";
  entity_id: string;
  state: string;
  attributes?: Record<string, any>;
  last_changed: string;
}

/**
 * Transform server event to required format
 * Server emits: { entityId, state, attributes, lastChanged, updatedAt }
 * Required format: { type, entity_id, state, attributes, last_changed }
 */
function transformServerEvent(message: WebSocketMessage): EntityStateChangedEvent | null {
  // Only process entity_state_changed events
  if (message.type !== "entity_state_changed") {
    if (import.meta.env.DEV) {
      console.log("[EntitySubscriptions] Ignoring non-entity event:", message.type);
    }
    return null;
  }

  // Server format: { entityId, state, attributes, lastChanged, updatedAt }
  // Transform to required format: { type, entity_id, state, attributes, last_changed }
  const serverPayload = message as any;

  // Extract entity_id from entityId (server format)
  // If entityId is not present, try entity_id directly
  const entityId = serverPayload.entityId || serverPayload.entity_id;

  if (!entityId || !serverPayload.state) {
    console.warn("[EntitySubscriptions] Invalid event format - missing entityId or state:", {
      entityId,
      state: serverPayload.state,
      fullMessage: message,
    });
    return null;
  }

  const transformed = {
    type: "entity_state_changed" as const,
    entity_id: entityId,
    state: serverPayload.state,
    attributes: serverPayload.attributes || {},
    // Use lastChanged if present, otherwise use updatedAt, otherwise use current time
    last_changed: serverPayload.lastChanged || serverPayload.updatedAt || new Date().toISOString(),
  };

  if (import.meta.env.DEV) {
    console.log("[EntitySubscriptions] Transformed event:", transformed);
  }

  return transformed;
}

/**
 * Entity subscription hook
 * Automatically subscribes to entity state changes and updates Redux
 * Uses root-level WebSocket context to ensure connection is always active
 */
export function useEntitySubscriptions() {
  const dispatch = useAppDispatch();
  const { isConnected, subscribe } = useWebSocketContext();

  // Stabilize callbacks with useCallback to prevent unnecessary re-subscriptions
  const handleMessage = useCallback((message: WebSocketMessage) => {
    // Debug: Log all received messages
    console.log("[EntitySubscriptions] Received WebSocket message:", {
      type: message.type,
      fullMessage: message,
    });

    // Handle entity_state_changed events
    if (message.type === "entity_state_changed") {
      console.log("[EntitySubscriptions] Processing entity_state_changed event");

      const event = transformServerEvent(message);

      if (!event) {
        console.warn("[EntitySubscriptions] Failed to transform event, ignoring");
        return;
      }

      // Dispatch Redux update by entityId (e.g., "light.living_room")
      // The entity_id in the event matches the entityId field in Entity
      const updatePayload = {
        entityId: event.entity_id,
        updates: {
          state: event.state,
          attributes: event.attributes,
          lastChanged: event.last_changed,
          lastUpdated: event.last_changed, // Update lastUpdated as well
        },
      };

      console.log("[EntitySubscriptions] Dispatching Redux update:", updatePayload);
      console.log("[Redux] updateEntityByEntityId called");

      dispatch(updateEntityByEntityId(updatePayload));

      console.log("[EntitySubscriptions] Redux update dispatched for entity:", event.entity_id, "new state:", event.state);
      return;
    }

    // Handle entities_created events
    if (message.type === "entities_created") {
      const payload = message as any;

      if (!payload.entities || !Array.isArray(payload.entities)) {
        console.warn("[EntitySubscriptions] Invalid entities_created event format:", message);
        return;
      }

      // Transform server entities to Entity format
      const newEntities: Entity[] = payload.entities.map((e: any) => ({
        id: e.id,
        deviceId: e.deviceId,
        entityId: e.entityId,
        domain: e.domain,
        name: e.name,
        icon: e.icon,
        state: e.state,
        attributes: e.attributes || {},
        lastChanged: e.lastChanged,
        lastUpdated: e.lastUpdated,
        createdAt: e.createdAt,
      }));

      console.log("[EntitySubscriptions] Dispatching addEntities:", {
        count: newEntities.length,
        entityIds: newEntities.map(e => e.entityId),
      });

      dispatch(addEntities(newEntities));

      console.log("[EntitySubscriptions] New entities added to Redux");
      return;
    }

    // Ignore other event types
    console.log("[EntitySubscriptions] Ignoring event type:", message.type);
  }, [dispatch]);

  // Subscribe to WebSocket messages using the root-level context
  useEffect(() => {
    if (!isConnected) {
      console.log("[EntitySubscriptions] WebSocket not connected yet, waiting...");
      return;
    }

    console.log("[EntitySubscriptions] WebSocket connected, subscribing to entity updates");

    const unsubscribe = subscribe(handleMessage);

    return () => {
      console.log("[EntitySubscriptions] Unsubscribing from WebSocket");
      unsubscribe();
    };
  }, [isConnected, subscribe, handleMessage]);

  // Return connection status for debugging
  return {
    isConnected,
  };
}

