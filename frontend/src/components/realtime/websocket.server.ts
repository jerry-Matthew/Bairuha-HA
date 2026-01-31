/**
 * WebSocket Server
 * 
 * Stateless WebSocket server for broadcasting entity state changes
 * This is infrastructure only - no business logic
 */

import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";

// Use process-level storage that persists across module boundaries
// This works even when Next.js API routes run in different contexts
interface ProcessWithWebSocket {
  __websocketServer?: SocketIOServer | null;
  __httpServer?: HTTPServer | null;
}

let io: SocketIOServer | null = null;
let httpServerInstance: HTTPServer | null = null;

// Get from process storage (works across module boundaries)
function getProcessStorage(): ProcessWithWebSocket {
  return process as any;
}

// Initialize from process storage if available
const processStorage = getProcessStorage();
if (processStorage.__websocketServer) {
  io = processStorage.__websocketServer;
}
if (processStorage.__httpServer) {
  httpServerInstance = processStorage.__httpServer;
}

/**
 * Initialize WebSocket server
 * Attaches Socket.IO to the HTTP server
 */
export function initializeWebSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  // Store HTTP server reference for potential re-initialization
  httpServerInstance = httpServer;

  // Store in process storage (persists across module boundaries)
  const processStorage = getProcessStorage();
  processStorage.__httpServer = httpServer;

  io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: "*", // In production, restrict this
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Store in process storage (persists across module boundaries)
  processStorage.__websocketServer = io;

  // Handle client connections
  io.on("connection", (socket: Socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Join user-specific room for targeted notifications
    socket.on("join_user_room", (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`[WebSocket] Client ${socket.id} joined user room: user:${userId}`);
    });

    // Handle disconnection
    socket.on("disconnect", (reason: string) => {
      console.log(`[WebSocket] Client disconnected: ${socket.id} (reason: ${reason})`);
    });

    // Handle errors
    socket.on("error", (error: Error) => {
      console.error(`[WebSocket] Error for client ${socket.id}:`, error);
    });
  });

  console.log("[WebSocket] Server initialized");
  return io;
}

/**
 * Get the WebSocket server instance
 * Returns null if not initialized
 */
export function getWebSocketServer(): SocketIOServer | null {
  // Check process storage first (works across module boundaries)
  const processStorage = getProcessStorage();
  if (processStorage.__websocketServer) {
    return processStorage.__websocketServer;
  }
  return io;
}

/**
 * Broadcast entity state changed event to all connected clients
 */
export function broadcastEntityStateChanged(payload: {
  entityId: string;
  state: string;
  attributes: Record<string, any>;
  lastChanged: string;
  lastUpdated: string;
}): void {
  // Get server from process storage (works across module boundaries)
  const server = getWebSocketServer();

  if (!server) {
    console.warn("[WebSocket] Server not initialized, cannot broadcast entity_state_changed");
    return;
  }

  const eventPayload = {
    entityId: payload.entityId,
    state: payload.state,
    attributes: payload.attributes,
    lastChanged: payload.lastChanged,
    updatedAt: payload.lastUpdated,
  };

  // Always log - this is critical for debugging
  console.log(`[WebSocket] Broadcasting entity_state_changed:`, eventPayload);
  console.log(`[WebSocket] Connected clients:`, server.sockets.sockets.size);

  server.emit("entity_state_changed", eventPayload);

  console.log(`[WebSocket] ✅ Event emitted to ${server.sockets.sockets.size} client(s)`);
}

/**
 * Broadcast entities created event to all connected clients
 * Used when new entities are created (e.g., when a device is registered)
 */
export function broadcastEntitiesCreated(payload: {
  entities: Array<{
    id: string;
    deviceId: string;
    entityId: string;
    domain: string;
    name?: string;
    icon?: string;
    state: string;
    attributes: Record<string, any>;
    lastChanged?: string;
    lastUpdated: string;
    createdAt: string;
  }>;
}): void {
  // Try to get the server instance
  let server = getWebSocketServer();

  if ((import.meta.env || {}).NODE_ENV === "development") {
    const processStorage = getProcessStorage();
    console.log("[WebSocket] broadcastEntitiesCreated called:", {
      hasServer: !!server,
      hasLocalIo: !!io,
      hasProcessIo: !!processStorage.__websocketServer,
      hasHttpServer: !!httpServerInstance,
      hasProcessHttpServer: !!processStorage.__httpServer,
    });
  }

  // If server is not initialized, try to get HTTP server and initialize
  if (!server) {
    // Check process storage for HTTP server (works across module boundaries)
    const processStorage = getProcessStorage();
    const httpServer = processStorage.__httpServer || httpServerInstance;

    if (httpServer) {
      console.log("[WebSocket] Server not initialized, attempting to initialize from stored HTTP server...");
      server = initializeWebSocketServer(httpServer);
    } else {
      console.warn("[WebSocket] No HTTP server available for initialization");
      console.warn("[WebSocket] Process storage:", {
        hasProcessHttpServer: !!processStorage.__httpServer,
        hasLocalHttpServer: !!httpServerInstance,
      });
    }
  }

  if (!server) {
    console.warn("[WebSocket] Server not initialized, cannot broadcast entities_created");
    console.warn("[WebSocket] This usually means the custom server hasn't started yet or API routes are running in a different context");
    // In development, we can still log what would have been sent
    if ((import.meta.env || {}).NODE_ENV === "development") {
      console.log("[WebSocket] Would have broadcasted entities_created:", {
        entityCount: payload.entities.length,
        entityIds: payload.entities.map(e => e.entityId),
      });
    }
    return;
  }

  server.emit("entities_created", payload);

  if ((import.meta.env || {}).NODE_ENV === "development") {
    console.log(`[WebSocket] Broadcasted entities_created:`, {
      entityCount: payload.entities.length,
      entityIds: payload.entities.map(e => e.entityId),
      connectedClients: server.sockets.sockets.size,
    });
  }
}

/**
 * Broadcast group state changed event to all connected clients
 */
export function broadcastGroupStateChanged(payload: {
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
}): void {
  // Get server from process storage (works across module boundaries)
  const server = getWebSocketServer();

  if (!server) {
    console.warn("[WebSocket] Server not initialized, cannot broadcast group_state_changed");
    return;
  }

  console.log(`[WebSocket] Broadcasting group_state_changed:`, payload);

  server.emit("group_state_changed", payload);

  console.log(`[WebSocket] ✅ Group state event emitted to ${server.sockets.sockets.size} client(s)`);
}

/**
 * Broadcast notification created event to all connected clients
 * If userId is provided, only broadcast to that specific user
 * If userId is null, broadcast to all users (broadcast notification)
 */
export function broadcastNotificationCreated(payload: {
  notification: {
    id: string;
    userId: string | null;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
    actionUrl?: string;
    actionLabel?: string;
    read: boolean;
    createdAt: string;
    readAt?: string | null;
    metadata?: Record<string, any>;
  };
  targetUserId?: string | null; // null = broadcast to all
}): void {
  const server = getWebSocketServer();

  if (!server) {
    console.warn("[WebSocket] Server not initialized, cannot broadcast notification_created");
    return;
  }

  // If user-specific notification, emit to specific user's room
  // If broadcast, emit to all clients
  if (payload.targetUserId) {
    server.to(`user:${payload.targetUserId}`).emit("notification_created", payload.notification);
  } else {
    // Broadcast to all clients
    server.emit("notification_created", payload.notification);
  }

  console.log(`[WebSocket] ✅ Notification event emitted`, {
    notificationId: payload.notification.id,
    targetUserId: payload.targetUserId || "all",
    connectedClients: server.sockets.sockets.size,
  });
}

/**
 * Broadcast notification updated event (e.g., marked as read)
 */
export function broadcastNotificationUpdated(payload: {
  notification: {
    id: string;
    userId: string | null;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
    actionUrl?: string;
    actionLabel?: string;
    read: boolean;
    createdAt: string;
    readAt?: string | null;
    metadata?: Record<string, any>;
  };
  targetUserId: string;
}): void {
  const server = getWebSocketServer();

  if (!server) {
    console.warn("[WebSocket] Server not initialized, cannot broadcast notification_updated");
    return;
  }

  server.to(`user:${payload.targetUserId}`).emit("notification_updated", payload.notification);

  console.log(`[WebSocket] ✅ Notification updated event emitted to user:${payload.targetUserId}`);
}

/**
 * Broadcast unread count change
 */
export function broadcastUnreadCountChanged(payload: {
  userId: string;
  count: number;
}): void {
  const server = getWebSocketServer();

  if (!server) {
    console.warn("[WebSocket] Server not initialized, cannot broadcast unread_count_changed");
    return;
  }

  server.to(`user:${payload.userId}`).emit("unread_count_changed", { count: payload.count });

  console.log(`[WebSocket] ✅ Unread count changed event emitted to user:${payload.userId} (count: ${payload.count})`);
}

/**
 * Get connected client count
 */
export function getConnectedClientCount(): number {
  if (!io) {
    return 0;
  }
  return io.sockets.sockets.size;
}

