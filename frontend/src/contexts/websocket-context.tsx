"use client";

/**
 * WebSocket Context Provider
 * 
 * Provides a single, shared WebSocket connection at the app root level.
 * This ensures the socket connects immediately when the app loads,
 * preventing missed events that occur before components mount.
 * 
 * CRITICAL: This must be mounted at the root level (in Providers or layout)
 * to ensure the socket is always connected, regardless of which page is active.
 */

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { WebSocketMessage } from "@/hooks/useWebSocket";

interface WebSocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  subscribe: (callback: (message: WebSocketMessage) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocketContext must be used within WebSocketProvider");
  }
  return context;
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const subscribersRef = useRef<Set<(message: WebSocketMessage) => void>>(new Set());

  useEffect(() => {
    // Determine WebSocket URL
    const wsUrl = typeof window !== "undefined" ? window.location.origin : "";

    console.log("[WebSocketProvider] Initializing root-level WebSocket connection to:", wsUrl);

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
      console.log("[WebSocketProvider] ✅ Connected to server, socket ID:", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", (reason: string) => {
      console.log(`[WebSocketProvider] ❌ Disconnected: ${reason}`);
      setIsConnected(false);
    });

    socket.on("connect_error", (error: Error) => {
      console.error("[WebSocketProvider] Connection error:", error);
    });

    // 🔍 CANONICAL PROOF TEST: This catches ALL events from the server
    // If you see this log, the socket is receiving events
    socket.onAny((eventName: string, ...args: any[]) => {
      const payload = args[0] || {};

      // Reconstruct message with type field
      const message: WebSocketMessage = {
        type: eventName,
        ...payload,
      };

      // Always log - this is the definitive test
      console.log("[SOCKET ON ANY]", eventName, payload);
      console.log("[WebSocketProvider] Received event:", eventName, payload);

      // Notify all subscribers
      subscribersRef.current.forEach((callback) => {
        try {
          callback(message);
        } catch (error) {
          console.error("[WebSocketProvider] Error in subscriber callback:", error);
        }
      });
    });

    // Cleanup on unmount
    return () => {
      console.log("[WebSocketProvider] Cleaning up root WebSocket connection");
      if (socket.connected) {
        socket.disconnect();
      }
      socketRef.current = null;
      setIsConnected(false);
    };
  }, []);

  // Subscribe function - allows components to listen for WebSocket messages
  const subscribe = useCallback((callback: (message: WebSocketMessage) => void) => {
    subscribersRef.current.add(callback);
    console.log("[WebSocketProvider] Subscriber added, total subscribers:", subscribersRef.current.size);

    // Return unsubscribe function
    return () => {
      subscribersRef.current.delete(callback);
      console.log("[WebSocketProvider] Subscriber removed, total subscribers:", subscribersRef.current.size);
    };
  }, []);

  const value: WebSocketContextValue = {
    socket: socketRef.current,
    isConnected,
    subscribe,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
