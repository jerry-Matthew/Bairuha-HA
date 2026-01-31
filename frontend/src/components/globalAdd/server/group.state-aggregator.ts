/**
 * Group State Aggregator
 * 
 * Listens to entity state changes and recalculates group states
 */

import { EntityStateChangedEvent, emitEntityStateChanged } from "./entity.events";
import { getGroupsForEntity, getGroupState, getGroupById } from "./group.registry";
import { emitGroupStateChanged } from "./group.events";

// Use process-level storage to track if aggregator is initialized
interface ProcessWithGroupAggregator {
  __groupAggregatorInitialized?: boolean;
}

function getProcessStorage(): ProcessWithGroupAggregator {
  return process as any;
}

/**
 * Handle entity state change and update affected groups
 */
async function handleEntityStateChange(event: EntityStateChangedEvent): Promise<void> {
  try {
    // Find all groups that contain this entity
    const groups = await getGroupsForEntity(event.entityId);

    // Recalculate state for each affected group
    for (const group of groups) {
      const state = await getGroupState(group.id);
      
      // Emit group state changed event
      emitGroupStateChanged({
        groupId: group.id,
        groupName: group.name,
        state,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("[GroupStateAggregator] Error handling entity state change:", error);
  }
}

/**
 * Initialize group state aggregator
 * Hooks into entity state changed events
 */
export function initializeGroupStateAggregator(): void {
  const processStorage = getProcessStorage();
  
  if (processStorage.__groupAggregatorInitialized) {
    console.log("[GroupStateAggregator] Already initialized");
    return;
  }

  // Hook into entity state changed events
  // We need to intercept emitEntityStateChanged calls
  // Since we can't directly modify the entity.events module, we'll use a different approach:
  // We'll set up a listener that gets called from entity.events.ts
  
  // Store handler in process storage so entity.events can call it
  (process as any).__groupStateChangeHandler = handleEntityStateChange;
  
  processStorage.__groupAggregatorInitialized = true;
  console.log("[GroupStateAggregator] ✅ Initialized - listening to entity state changes");
}

/**
 * Get the handler function (called from entity.events.ts)
 */
export function getGroupStateChangeHandler(): ((event: EntityStateChangedEvent) => Promise<void>) | null {
  return (process as any).__groupStateChangeHandler || null;
}
