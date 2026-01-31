/**
 * Home Assistant WebSocket Client
 * 
 * Connects to Home Assistant's WebSocket API, authenticates, and subscribes
 * to state_changed events. Converts HA events to Bairuha format and updates
 * entities in the registry, which automatically triggers the event pipeline.
 */

import WebSocket from "ws";
import { getConfigEntryByIntegration } from "@/components/globalAdd/server/config-entry.registry";
import { getEntityByHAEntityId, updateEntityState } from "@/components/globalAdd/server/entity.registry";
import { HAEntityState } from "./rest-client";
import { handleHAEntityUpdate } from "./entity-update-handler";

/**
 * Home Assistant state_changed event structure
 */
export interface HAStateChangedEvent {
  event_type: "state_changed";
  data: {
    entity_id: string;
    old_state: HAEntityState | null;
    new_state: HAEntityState;
  };
}

/**
 * Home Assistant WebSocket message structure
 */
export interface HAWebSocketMessage {
  id?: number;
  type: string;
  [key: string]: any;
}

/**
 * Home Assistant WebSocket authentication result
 */
export interface HAWebSocketAuthResult {
  type: "auth_ok" | "auth_invalid" | "auth_required";
  message?: string;
  ha_version?: string;
}

/**
 * Connection state type
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Home Assistant WebSocket Client
 * 
 * Handles connection, authentication, event subscription, and reconnection
 */
export class HAWebSocketClient {
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private baseUrl: string = '';
  private accessToken: string = '';
  private subscriptionId: number | null = null;
  private messageId: number = 1;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthMonitorTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private lastPongTime: number = 0;
  private stateChangedCallbacks: Array<(event: HAStateChangedEvent) => void> = [];
  private pendingAuth: { resolve: (value: boolean) => void; reject: (error: Error) => void } | null = null;

  constructor() {
    // Client initialized, but not connected yet
  }

  /**
   * Connect to Home Assistant WebSocket API
   */
  async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      console.log("[HAWebSocket] Already connected or connecting");
      return;
    }

    this.connectionState = 'connecting';
    console.log("[HAWebSocket] Connecting to Home Assistant...");

    try {
      // Get credentials
      const configEntry = await getConfigEntryByIntegration("homeassistant");
      if (!configEntry) {
        throw new Error("Home Assistant integration not configured");
      }

      const { base_url, access_token } = configEntry.data;
      if (!base_url || !access_token) {
        throw new Error("Home Assistant credentials missing");
      }

      this.baseUrl = base_url.replace(/\/$/, ''); // Remove trailing slash
      this.accessToken = access_token;

      // Determine WebSocket URL (ws:// or wss://)
      const wsUrl = this.baseUrl.replace(/^http/, 'ws') + '/api/websocket';
      console.log(`[HAWebSocket] Connecting to ${wsUrl.replace(/\/\/.*@/, '//***@')}`); // Hide token in logs

      // Create WebSocket connection
      this.ws = new WebSocket(wsUrl);

      // Set up event handlers
      this.ws.on('open', () => {
        console.log("[HAWebSocket] WebSocket connection opened");
        this.handleOpen();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error: Error) => {
        console.error("[HAWebSocket] WebSocket error:", error);
        this.handleError(error);
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        console.log(`[HAWebSocket] WebSocket closed: ${code} ${reason.toString()}`);
        this.handleClose(code, reason);
      });

    } catch (error: any) {
      console.error("[HAWebSocket] Connection error:", error);
      this.connectionState = 'error';
      throw error;
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    // Connection opened, now authenticate
    this.authenticate();
  }

  /**
   * Authenticate with Home Assistant
   */
  private async authenticate(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not open"));
        return;
      }

      this.pendingAuth = { resolve, reject };

      // Send auth message
      const authMessage = {
        type: "auth",
        access_token: this.accessToken,
      };

      console.log("[HAWebSocket] Sending authentication...");
      this.ws.send(JSON.stringify(authMessage));

      // Set timeout for auth response (5 seconds)
      setTimeout(() => {
        if (this.pendingAuth) {
          this.pendingAuth = null;
          reject(new Error("Authentication timeout"));
        }
      }, 5000);
    });
  }

  /**
   * Subscribe to state_changed events
   */
  private async subscribeToStateChanged(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not open"));
        return;
      }

      const subscribeId = this.messageId++;
      const subscribeMessage = {
        id: subscribeId,
        type: "subscribe_events",
        event_type: "state_changed",
      };

      console.log("[HAWebSocket] Subscribing to state_changed events...");
      this.ws.send(JSON.stringify(subscribeMessage));

      // Store subscription ID (we'll resolve when we get the result)
      // For now, assume success and resolve immediately
      // In a more robust implementation, we'd wait for the subscription result
      setTimeout(() => {
        this.subscriptionId = subscribeId;
        resolve(subscribeId);
      }, 100);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message: HAWebSocketMessage = JSON.parse(data.toString());
      
      // Route message based on type
      switch (message.type) {
        case 'auth_required':
          // This should happen first, but we already sent auth
          console.log("[HAWebSocket] Auth required (expected)");
          break;

        case 'auth_ok':
          this.handleAuthOk(message);
          break;

        case 'auth_invalid':
          this.handleAuthInvalid(message);
          break;

        case 'event':
          this.handleEvent(message);
          break;

        case 'pong':
          this.handlePong(message);
          break;

        case 'ping':
          this.handlePing(message);
          break;

        case 'result':
          // Handle subscription result
          if (message.success && message.id === this.subscriptionId) {
            console.log("[HAWebSocket] Successfully subscribed to state_changed events");
          }
          break;

        default:
          console.log(`[HAWebSocket] Unhandled message type: ${message.type}`);
      }
    } catch (error: any) {
      console.error("[HAWebSocket] Error parsing message:", error);
    }
  }

  /**
   * Handle authentication success
   */
  private handleAuthOk(message: HAWebSocketMessage): void {
    console.log("[HAWebSocket] ✅ Authentication successful");
    
    if (this.pendingAuth) {
      this.pendingAuth.resolve(true);
      this.pendingAuth = null;
    }

    // Reset reconnect attempts on successful connection
    this.reconnectAttempts = 0;

    // Subscribe to state_changed events
    this.subscribeToStateChanged().then(() => {
      this.connectionState = 'connected';
      console.log("[HAWebSocket] ✅ Connected and subscribed to state_changed events");
      
      // Start health monitoring
      this.startHealthMonitoring();
    }).catch((error) => {
      console.error("[HAWebSocket] Failed to subscribe:", error);
      this.connectionState = 'error';
    });
  }

  /**
   * Handle authentication failure
   */
  private handleAuthInvalid(message: HAWebSocketMessage): void {
    const error = new Error(message.message || "Authentication failed");
    console.error("[HAWebSocket] ❌ Authentication failed:", error.message);
    
    this.connectionState = 'error';
    
    if (this.pendingAuth) {
      this.pendingAuth.reject(error);
      this.pendingAuth = null;
    }

    // Close connection
    if (this.ws) {
      this.ws.close();
    }
  }

  /**
   * Handle state_changed events
   */
  private handleEvent(message: HAWebSocketMessage): void {
    if (message.event?.event_type === 'state_changed') {
      const event: HAStateChangedEvent = message.event;
      this.handleStateChangedEvent(event);
    }
  }

  /**
   * Process state_changed event and update entity
   * Uses entity update handler for conflict detection and resolution
   */
  private async handleStateChangedEvent(event: HAStateChangedEvent): Promise<void> {
    try {
      const newState = event.data.new_state;
      const oldState = event.data.old_state;

      // Use entity update handler which handles conflicts, renames, domain changes, etc.
      const updatedEntity = await handleHAEntityUpdate(newState, oldState || undefined);

      if (!updatedEntity) {
        // This is expected for new entities - they need to be synced manually
        // Only log as debug to avoid confusion
        console.log(`[HAWebSocket] Entity ${newState.entity_id} not yet in database (will be synced on next sync operation)`);
        return;
      }

      console.log(`[HAWebSocket] ✅ Updated entity ${updatedEntity.entityId}: ${newState.state}`);

      // Call registered callbacks
      this.stateChangedCallbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error("[HAWebSocket] Error in state changed callback:", error);
        }
      });

    } catch (error: any) {
      console.error(`[HAWebSocket] Error processing state_changed event:`, error);
      // Don't throw - continue processing other events
    }
  }

  /**
   * Handle ping message (respond with pong)
   */
  private handlePing(message: HAWebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const pongMessage = {
      id: message.id,
      type: "pong",
    };

    this.ws.send(JSON.stringify(pongMessage));
  }

  /**
   * Handle pong message (update last pong time)
   */
  private handlePong(message: HAWebSocketMessage): void {
    this.lastPongTime = Date.now();
    // Health monitoring will check this
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(error: Error): void {
    console.error("[HAWebSocket] WebSocket error:", error);
    this.connectionState = 'error';
    
    // Trigger reconnection
    this.scheduleReconnect();
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(code: number, reason: Buffer): void {
    this.connectionState = 'disconnected';
    this.subscriptionId = null;
    this.stopHealthMonitoring();

    // If not a normal closure, schedule reconnection
    if (code !== 1000) {
      console.log(`[HAWebSocket] Connection closed unexpectedly (code: ${code}), will reconnect...`);
      this.scheduleReconnect();
    } else {
      console.log("[HAWebSocket] Connection closed normally");
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[HAWebSocket] Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      this.connectionState = 'error';
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`[HAWebSocket] Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.reconnect();
      } catch (error) {
        console.error("[HAWebSocket] Reconnection failed:", error);
        this.scheduleReconnect(); // Try again
      }
    }, delay);
  }

  /**
   * Reconnect to Home Assistant
   */
  private async reconnect(): Promise<void> {
    console.log("[HAWebSocket] Attempting to reconnect...");
    
    // Clean up existing connection
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    // Reset state
    this.subscriptionId = null;
    this.lastPongTime = 0;

    // Connect again
    await this.connect();
  }

  /**
   * Start health monitoring (ping/pong)
   */
  private startHealthMonitoring(): void {
    this.stopHealthMonitoring(); // Clear any existing timers

    this.lastPongTime = Date.now();

    // Send ping every 30 seconds
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const pingId = this.messageId++;
        const pingMessage = {
          id: pingId,
          type: "ping",
        };

        this.ws.send(JSON.stringify(pingMessage));
      }
    }, 30000);

    // Check health every 5 seconds
    this.healthMonitorTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceLastPong = now - this.lastPongTime;

      // If no pong received in 60 seconds, consider connection stale
      if (timeSinceLastPong > 60000 && this.lastPongTime > 0) {
        console.warn("[HAWebSocket] Health check failed: No pong received in 60 seconds");
        this.scheduleReconnect();
      }
    }, 5000);
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }

    if (this.healthMonitorTimer) {
      clearInterval(this.healthMonitorTimer);
      this.healthMonitorTimer = null;
    }
  }

  /**
   * Disconnect from Home Assistant
   */
  async disconnect(): Promise<void> {
    console.log("[HAWebSocket] Disconnecting...");

    this.stopHealthMonitoring();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.connectionState = 'disconnected';
    this.subscriptionId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && 
           this.ws !== null && 
           this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Register callback for state changed events
   */
  onStateChanged(callback: (event: HAStateChangedEvent) => void): void {
    this.stateChangedCallbacks.push(callback);
  }
}

// Singleton instance
let haWebSocketClient: HAWebSocketClient | null = null;

/**
 * Get the singleton HA WebSocket client instance
 */
export function getHAWebSocketClient(): HAWebSocketClient {
  if (!haWebSocketClient) {
    haWebSocketClient = new HAWebSocketClient();
  }
  return haWebSocketClient;
}

/**
 * Initialize and connect HA WebSocket client
 * Called during server startup
 */
export async function initializeHAWebSocket(): Promise<void> {
  const client = getHAWebSocketClient();
  if (!client.isConnected()) {
    try {
      await client.connect();
      console.log("[HAWebSocket] ✅ Initialized and connected");
    } catch (error: any) {
      console.error("[HAWebSocket] ❌ Failed to initialize:", error.message);
      // Don't throw - allow server to start even if HA is unreachable
    }
  }
}
