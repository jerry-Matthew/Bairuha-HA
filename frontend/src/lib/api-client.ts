/**
 * General API Client
 * For making authenticated requests to other endpoints
 * Use this for non-auth API calls that require authentication
 */

import { authAPI } from "./auth/api-client";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export class APIClient {
  private baseUrl: string;
  private getAccessToken: (() => string | null) | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Set function to get current access token
   * This should be called from the auth context
   */
  setTokenGetter(getter: () => string | null) {
    this.getAccessToken = getter;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add access token if available
    if (this.getAccessToken) {
      const token = this.getAccessToken();
      if (token) {
        (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token might be expired, try to refresh
        // This would be handled by the auth context
        throw new Error("Unauthorized");
      }

      const error = await response.json().catch(() => ({
        error: "An error occurred",
      }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new APIClient();

