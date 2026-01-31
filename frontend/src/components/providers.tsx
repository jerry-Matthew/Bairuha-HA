"use client";

import { Provider } from "react-redux";
import { useEffect } from "react";
import { store } from "@/store/store";
import { ThemeWrapper } from "./theme-wrapper";
import { AuthProvider } from "@/contexts/auth-context";
import { WebSocketProvider } from "@/contexts/websocket-context";
import { updateSettings } from "@/store/slices/settings-slice";

export function Providers({ children }: { children: React.ReactNode }) {
  // Sync darkMode from localStorage after mount to prevent hydration mismatch
  // This runs after the initial render, so server and client render the same HTML first
  useEffect(() => {
    try {
      const storedDarkMode = localStorage.getItem("darkMode");
      if (storedDarkMode !== null) {
        const darkMode = storedDarkMode === "true";
        store.dispatch(updateSettings({ darkMode }));
      }
    } catch (error) {
      console.error("Failed to load darkMode from localStorage:", error);
    }
  }, []);

  return (
    <Provider store={store}>
      <AuthProvider>
        {/* WebSocket connection at root level - ensures socket connects immediately on app load */}
        <WebSocketProvider>
          <ThemeWrapper>{children}</ThemeWrapper>
        </WebSocketProvider>
      </AuthProvider>
    </Provider>
  );
}

