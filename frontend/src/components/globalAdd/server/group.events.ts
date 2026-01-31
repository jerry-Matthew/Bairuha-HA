/**
 * Group Event Model
 * 
 * Event system for group state changes
 * Similar to entity events but for groups
 */

import { broadcastGroupStateChanged } from "@/components/realtime/websocket.server";

// Use process-level storage that persists across module boundaries
interface ProcessWithGroupBridge {
  __groupBridgeFunction?: ((event: GroupStateChangedEvent) => void) | null;
}

// Get from process storage (works across module boundaries)
function getProcessStorage(): ProcessWithGroupBridge {
  return process as any;
}

// Local fallback
let bridgeGroupStateChanged: ((event: GroupStateChangedEvent) => void) | null = null;

/**
 * Get the bridge function from process storage or local fallback
 */
function getBridgeFunction(): ((event: GroupStateChangedEvent) => void) | null {
  const processStorage = getProcessStorage();
  return processStorage.__groupBridgeFunction || bridgeGroupStateChanged;
}

/**
 * Set the WebSocket bridge function
 * Called during WebSocket bootstrap
 */
export function setGroupWebSocketBridge(bridgeFn: (event: GroupStateChangedEvent) => void): void {
  const processStorage = getProcessStorage();
  processStorage.__groupBridgeFunction = bridgeFn;
  bridgeGroupStateChanged = bridgeFn;
  console.log("[GroupEvents] ✅ WebSocket bridge function set");
}

/**
 * Group state changed event type
 */
export const GROUP_STATE_CHANGED_EVENT = "group_state_changed" as const;

/**
 * Group State Changed Event
 */
export interface GroupStateChangedEvent {
  groupId: string;
  groupName: string;
  state: {
    state: 'on' | 'off' | 'mixed' | 'unavailable' | 'unknown';
    allOn: boolean;
    allOff: boolean;
    hasMixed: boolean;
    memberStates: Array<{ entityId: string; state: string }>;
  };
  timestamp: string;
}

/**
 * Event queue for group state changes
 */
class GroupEventQueue {
  private events: GroupStateChangedEvent[] = [];
  private maxSize = 1000;

  /**
   * Add an event to the queue
   */
  add(event: GroupStateChangedEvent): void {
    this.events.push(event);

    // Keep only the last maxSize events
    if (this.events.length > this.maxSize) {
      this.events = this.events.slice(-this.maxSize);
    }

    console.log(`[${GROUP_STATE_CHANGED_EVENT}]`, event);

    // Get bridge function from process storage
    const bridgeFn = getBridgeFunction();
    
    // Bridge to WebSocket if bridge is available
    if (bridgeFn) {
      bridgeFn(event);
    } else {
      // Fallback: directly broadcast via WebSocket server
      broadcastGroupStateChanged({
        groupId: event.groupId,
        groupName: event.groupName,
        state: event.state,
        timestamp: event.timestamp
      });
    }
  }

  /**
   * Get recent events
   */
  getRecent(limit: number = 100): GroupStateChangedEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events for a specific group
   */
  getForGroup(groupId: string, limit: number = 100): GroupStateChangedEvent[] {
    return this.events
      .filter((e) => e.groupId === groupId)
      .slice(-limit);
  }
}

// Singleton event queue instance
export const groupEventQueue = new GroupEventQueue();

/**
 * Emit group state changed event
 */
export function emitGroupStateChanged(event: GroupStateChangedEvent): void {
  groupEventQueue.add(event);
}

/**
 * Get recent group state change events
 */
export function getRecentGroupEvents(limit: number = 100): GroupStateChangedEvent[] {
  return groupEventQueue.getRecent(limit);
}

/**
 * Get group events for a specific group
 */
export function getGroupEvents(groupId: string, limit: number = 100): GroupStateChangedEvent[] {
  return groupEventQueue.getForGroup(groupId, limit);
}
