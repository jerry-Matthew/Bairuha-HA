/**
 * Entity Event Model
 * 
 * Event system for entity state changes
 * This prepares for future WebSocket integration
 */

import type { EntityStateChangedEvent } from "@/types";

// Use process-level storage that persists across module boundaries
// This works even when Next.js API routes run in different contexts
interface ProcessWithEntityBridge {
  __entityBridgeFunction?: ((event: EntityStateChangedEvent) => void) | null;
  __historyRecorderFunction?: ((event: EntityStateChangedEvent) => void) | null;
}

// Get from process storage (works across module boundaries)
function getProcessStorage(): ProcessWithEntityBridge {
  return process as any;
}

// Local fallback (for backwards compatibility)
let bridgeEntityStateChanged: ((event: EntityStateChangedEvent) => void) | null = null;
let historyRecorderFunction: ((event: EntityStateChangedEvent) => void) | null = null;

/**
 * Get the bridge function from process storage or local fallback
 */
function getBridgeFunction(): ((event: EntityStateChangedEvent) => void) | null {
  const processStorage = getProcessStorage();
  return processStorage.__entityBridgeFunction || bridgeEntityStateChanged;
}

/**
 * Get the history recorder function from process storage or local fallback
 */
function getHistoryRecorderFunction(): ((event: EntityStateChangedEvent) => void) | null {
  const processStorage = getProcessStorage();
  return processStorage.__historyRecorderFunction || historyRecorderFunction;
}

/**
 * Set the WebSocket bridge function
 * Called during WebSocket bootstrap
 * Stores in process storage to persist across module boundaries
 */
export function setWebSocketBridge(bridgeFn: (event: EntityStateChangedEvent) => void): void {
  // Store in process storage (persists across module boundaries)
  const processStorage = getProcessStorage();
  processStorage.__entityBridgeFunction = bridgeFn;
  
  // Also store locally for backwards compatibility
  bridgeEntityStateChanged = bridgeFn;
  
  console.log("[EntityEvents] ✅ WebSocket bridge function set (stored in process storage)");
}

/**
 * Set the history recorder function
 * Called during history recorder initialization
 * Stores in process storage to persist across module boundaries
 */
export function setHistoryRecorder(recorderFn: (event: EntityStateChangedEvent) => void): void {
  // Store in process storage (persists across module boundaries)
  const processStorage = getProcessStorage();
  processStorage.__historyRecorderFunction = recorderFn;
  
  // Also store locally for backwards compatibility
  historyRecorderFunction = recorderFn;
  
  console.log("[EntityEvents] ✅ History recorder function set (stored in process storage)");
}

/**
 * Entity state changed event type
 */
export const ENTITY_STATE_CHANGED_EVENT = "entity_state_changed" as const;

/**
 * Entity State Changed Event
 * Emitted when an entity's state changes
 * This event is logged/queued for now, will be broadcast via WebSocket in the future
 */
export interface EntityStateChangedEventPayload extends EntityStateChangedEvent {
  eventType: typeof ENTITY_STATE_CHANGED_EVENT;
  timestamp: string;
}

/**
 * Event queue for entity state changes
 * In the future, this will be replaced with WebSocket broadcasting
 */
class EntityEventQueue {
  private events: EntityStateChangedEventPayload[] = [];
  private maxSize = 1000; // Keep last 1000 events for debugging

  /**
   * Add an event to the queue
   */
  add(event: EntityStateChangedEvent): void {
    const payload: EntityStateChangedEventPayload = {
      ...event,
      eventType: ENTITY_STATE_CHANGED_EVENT,
      timestamp: new Date().toISOString(),
    };

    this.events.push(payload);

    // Keep only the last maxSize events
    if (this.events.length > this.maxSize) {
      this.events = this.events.slice(-this.maxSize);
    }

    // Always log - this is the event being emitted
    console.log(`[${ENTITY_STATE_CHANGED_EVENT}]`, payload);

    // Get bridge function from process storage (works across module boundaries)
    const bridgeFn = getBridgeFunction();
    
    // Bridge to WebSocket if bridge is available
    if (bridgeFn) {
      console.log(`[EntityEvents] Bridge function available, forwarding to WebSocket`);
      bridgeFn(event);
    } else {
      console.warn(`[EntityEvents] ⚠️ Bridge function NOT set! WebSocket events will not be sent.`);
      console.warn(`[EntityEvents] Make sure bootstrapWebSocket() is called during server startup.`);
      console.warn(`[EntityEvents] Process storage check:`, {
        hasProcessBridge: !!getProcessStorage().__entityBridgeFunction,
        hasLocalBridge: !!bridgeEntityStateChanged,
      });
    }

    // Get history recorder function from process storage
    const recorderFn = getHistoryRecorderFunction();
    
    // Record to history if recorder is available
    if (recorderFn) {
      recorderFn(event);
    }

    // Get group state change handler from process storage
    const groupHandler = (process as any).__groupStateChangeHandler;
    
    // Update group states if handler is available
    if (groupHandler) {
      // Call asynchronously (don't block)
      groupHandler(event).catch((error: Error) => {
        console.error("[EntityEvents] Error in group state handler:", error);
      });
    }
  }

  /**
   * Get recent events (for debugging/monitoring)
   */
  getRecent(limit: number = 100): EntityStateChangedEventPayload[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events for a specific entity
   */
  getForEntity(entityId: string, limit: number = 100): EntityStateChangedEventPayload[] {
    return this.events
      .filter((e) => e.entityId === entityId)
      .slice(-limit);
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }
}

// Singleton event queue instance
export const entityEventQueue = new EntityEventQueue();

/**
 * Emit entity state changed event
 * This is called from the entity registry when state changes
 */
export function emitEntityStateChanged(event: EntityStateChangedEvent): void {
  entityEventQueue.add(event);
}

/**
 * Get recent entity state change events
 * Useful for activity log, debugging, etc.
 */
export function getRecentEntityEvents(limit: number = 100): EntityStateChangedEventPayload[] {
  return entityEventQueue.getRecent(limit);
}

/**
 * Get entity events for a specific entity
 */
export function getEntityEvents(entityId: string, limit: number = 100): EntityStateChangedEventPayload[] {
  return entityEventQueue.getForEntity(entityId, limit);
}

