/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */

"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authAPI } from "@/lib/auth/api-client";
import type { LoginRequest } from "@/lib/auth/api-client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUser, clearUser } from "@/store/slices/user-slice";
import { capitalizeName } from "@/lib/utils";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token refresh interval (refresh 1 minute before expiry)
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const reduxUser = useAppSelector((state) => state.user.user);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isRefreshingRef = React.useRef(false);
  const refreshIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = React.useRef(false);

  /**
   * Handle token refresh with debouncing
   * Prevents multiple simultaneous refresh calls
   * Restores user data from API response to maintain session on reload
   */
  const handleTokenRefresh = useCallback(async () => {
    // Prevent multiple simultaneous refresh calls using ref
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    try {
      const response = await authAPI.refresh();
      setAccessToken(response.accessToken);

      // Restore user data in Redux from API response
      // This ensures session persists on page reload
      const user: User = {
        id: response.user.id,
        email: response.user.email,
        name: capitalizeName(response.user.name || response.user.email.split("@")[0]),
        role: "user" as const,
        memberSince: response.user.created_at,
        lastLogin: new Date().toISOString(),
      };

      dispatch(setUser(user));

      return response.accessToken;
    } catch (error) {
      // Refresh failed, clear auth state
      // This is expected if user is not logged in or token expired
      setAccessToken(null);
      dispatch(clearUser());
      // Clear interval on failure
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      // Don't throw error - silently handle to prevent Next.js error overlay
      // The error is expected when user is not authenticated
      return null;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [dispatch]);

  // Initialize auth state on mount (only once)
  useEffect(() => {
    // Prevent multiple initializations (React Strict Mode in dev)
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    const initializeAuth = async () => {
      try {
        await handleTokenRefresh();
      } catch (error) {
        // No valid session, user needs to login
        // This is expected if user is not logged in
        // Silently handle this - don't throw or log to prevent Next.js error overlay
        setAccessToken(null);
        dispatch(clearUser());
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [handleTokenRefresh, dispatch]);

  // Set up token refresh interval when we have an access token
  useEffect(() => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    // Only set up interval if we have an access token
    if (accessToken) {
      // Set up new interval for token refresh
      refreshIntervalRef.current = setInterval(() => {
        // handleTokenRefresh already handles errors silently
        handleTokenRefresh();
      }, TOKEN_REFRESH_INTERVAL);

      // Cleanup on unmount or when accessToken changes
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
  }, [accessToken, handleTokenRefresh]);

  /**
   * Login
   */
  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(credentials);

      // Store access token
      setAccessToken(response.accessToken);

      // Update user in Redux
      const user: User = {
        id: response.user.id,
        email: response.user.email,
        name: capitalizeName(response.user.name || response.user.email.split("@")[0]), // Use name from API or fallback to email prefix, always capitalized
        role: "user" as const,
        memberSince: response.user.created_at,
        lastLogin: new Date().toISOString(),
      };

      dispatch(setUser(user));
    } catch (error: any) {
      setAccessToken(null);
      dispatch(clearUser());
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout
   * Industry-standard logout implementation:
   * - Revokes refresh token in database
   * - Clears all authentication state
   * - Stops token refresh interval
   * - Handles errors gracefully
   * - Prevents information leakage
   */
  const logout = async () => {
    try {
      // Stop token refresh interval immediately
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      // Clear auth state immediately (optimistic update)
      // This prevents any further API calls with the old token
      setAccessToken(null);
      dispatch(clearUser());

      // Attempt to revoke token on server
      // Continue even if this fails (cookies will still be cleared)
      try {
        await authAPI.logout();
      } catch (error) {
        // Log but don't throw - we've already cleared local state
        // This ensures user is logged out even if server call fails
        console.warn("Logout API call failed (non-critical):", error);
      }
    } catch (error) {
      // Ensure state is cleared even on unexpected errors
      console.error("Unexpected logout error:", error);
      setAccessToken(null);
      dispatch(clearUser());
    } finally {
      // Ensure loading state is reset
      setIsLoading(false);

      // Double-check interval is cleared
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }
  };

  /**
   * Manual token refresh
   */
  const refreshToken = async () => {
    await handleTokenRefresh();
  };

  const value: AuthContextType = {
    user: reduxUser,
    accessToken,
    isLoading,
    isAuthenticated: !!accessToken && !!reduxUser,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use authentication context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

