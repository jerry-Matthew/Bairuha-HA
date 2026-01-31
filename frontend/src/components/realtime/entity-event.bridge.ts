/**
 * Entity Event Bridge
 * 
 * Bridges entity events from the event system to WebSocket clients
 * This is stateless glue - listens and forwards
 */

import { broadcastEntityStateChanged, getWebSocketServer } from "./websocket.server";
import type { EntityStateChangedEvent } from "@/types";

let bridgeInitialized = false;

/**
 * Initialize the event bridge
 * Sets up the bridge to forward events to WebSocket
 */
export function initializeEntityEventBridge(): void {
  if (bridgeInitialized) {
    return;
  }

  bridgeInitialized = true;
  console.log("[EntityEventBridge] Bridge initialized");
}

/**
 * Ensure bridge is initialized (lazy check)
 * This helps if API routes load before bootstrap completes
 */
function ensureBridgeInitialized(): boolean {
  if (!bridgeInitialized) {
    // Try to initialize if WebSocket server is available
    const server = getWebSocketServer();
    if (server) {
      console.log("[EntityEventBridge] Lazy initialization: WebSocket server found, initializing bridge");
      bridgeInitialized = true;
      return true;
    }
    return false;
  }
  return true;
}

/**
 * Bridge an entity state changed event to WebSocket
 * This is called from the entity events system when an event is emitted
 */
export function bridgeEntityStateChanged(event: EntityStateChangedEvent): void {
  // Try lazy initialization if not already initialized
  if (!ensureBridgeInitialized()) {
    console.warn("[EntityEventBridge] Bridge not initialized and WebSocket server not available, cannot forward event");
    return;
  }

  console.log("[EntityEventBridge] Bridging entity_state_changed to WebSocket:", {
    entityId: event.entityId,
    state: event.state,
  });

  // Forward to WebSocket clients
  broadcastEntityStateChanged({
    entityId: event.entityId,
    state: event.state,
    attributes: event.attributes,
    lastChanged: event.lastChanged,
    lastUpdated: event.lastUpdated,
  });
}

