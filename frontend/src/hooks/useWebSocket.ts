/**
 * WebSocket Core Hook
 * 
 * Responsibilities:
 * - Open WebSocket connection
 * - Parse JSON messages
 * - Forward messages to callback
 * - Clean up on unmount
 * 
 * No Redux. No domain logic.
 */

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export interface WebSocketMessage {
  [key: string]: any;
}

export interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Core WebSocket hook
 * Manages Socket.IO connection lifecycle
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onMessage, onConnect, onDisconnect, onError } = options;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Determine WebSocket URL
    // In browser, use current origin; Socket.IO will handle the path
    const wsUrl = typeof window !== "undefined" ? window.location.origin : "";

    console.log("[WebSocket] Setting up connection to:", wsUrl);

    // Create Socket.IO client connection
    const socket = io(wsUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on("connect", () => {
      console.log("[WebSocket] Connected to server, socket ID:", socket.id);
      onConnect?.();
    });

    socket.on("disconnect", (reason: string) => {
      console.log(`[WebSocket] Disconnected: ${reason}`);
      onDisconnect?.();
    });

    socket.on("connect_error", (error: Error) => {
      console.error("[WebSocket] Connection error:", error);
      onError?.(error);
    });

    // Generic message handler - CRITICAL: This catches ALL events from the server
    // Socket.IO passes event name and payload separately
    // We reconstruct a message object with type and payload merged
    socket.onAny((eventName: string, ...args: any[]) => {
      // args[0] is the payload object from the server
      const payload = args[0] || {};

      // Reconstruct message with type field
      const message: WebSocketMessage = {
        type: eventName,
        ...payload,
      };

      // 🔍 CANONICAL PROOF TEST LOGGING - Always log, not just in development
      // This is the definitive test: if you see this log, the socket is receiving events
      console.log("[SOCKET ON ANY]", eventName, payload);
      console.log("[WebSocket] Received event:", eventName, payload);
      console.log("[WebSocket] Reconstructed message:", message);

      if (onMessage) {
        onMessage(message);
      }
    });

    // Cleanup on unmount
    return () => {
      console.log("[WebSocket] Cleaning up connection");
      if (socket.connected) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [onMessage, onConnect, onDisconnect, onError]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected ?? false,
  };
}

