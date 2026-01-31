/**
 * WebSocket Bootstrap
 * 
 * Initializes WebSocket server and event bridge
 * This is called from the custom server file
 */

import type { Server as HTTPServer } from "http";
import { initializeWebSocketServer } from "./websocket.server";
import { initializeEntityEventBridge, bridgeEntityStateChanged } from "./entity-event.bridge";
import { setWebSocketBridge } from "../globalAdd/server/entity.events";
import { initializeHAWebSocket } from "@/lib/home-assistant/websocket-client";
import { initializeStateHistoryRecorder } from "@/lib/history/state-history-recorder";
import { initializeGroupStateAggregator } from "../globalAdd/server/group.state-aggregator";
import { setGroupWebSocketBridge } from "../globalAdd/server/group.events";
import { broadcastGroupStateChanged } from "./websocket.server";

/**
 * Bootstrap WebSocket server and event bridge
 * This should be called when the HTTP server starts
 */
export function bootstrapWebSocket(httpServer: HTTPServer): void {
  // Initialize WebSocket server
  initializeWebSocketServer(httpServer);

  // Initialize event bridge
  initializeEntityEventBridge();

  // Connect the bridge to the entity event system
  setWebSocketBridge(bridgeEntityStateChanged);

  console.log("[WebSocketBootstrap] WebSocket server and event bridge initialized");

  // Initialize state history recorder
  initializeStateHistoryRecorder();

  // Initialize group state aggregator
  initializeGroupStateAggregator();

  // Connect group WebSocket bridge
  setGroupWebSocketBridge((event) => {
    broadcastGroupStateChanged({
      groupId: event.groupId,
      groupName: event.groupName,
      state: event.state,
      timestamp: event.timestamp
    });
  });

  // Initialize Home Assistant WebSocket client (async, don't block)
  initializeHAWebSocket().catch((error) => {
    console.error("[WebSocketBootstrap] Failed to initialize HA WebSocket client:", error);
    // Don't throw - allow server to start even if HA is unreachable
  });
}

