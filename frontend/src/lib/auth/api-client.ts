/**
 * Frontend Authentication API Client
 * Handles all auth-related API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name?: string | null;
    is_active: boolean;
    created_at: string;
  };
  accessToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
    is_active: boolean;
    created_at: string;
  };
}

export interface AuthError {
  error: string;
}

class AuthAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL || "";
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

    // Note: Access token is managed in React context, not localStorage
    // For authenticated requests to other endpoints, pass token via options.headers

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Include cookies for refresh token
    });

    if (!response.ok) {
      const error: AuthError = await response.json().catch(() => ({
        error: "An error occurred",
      }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    // Store access token in memory (not localStorage for security)
    // We'll use a React context for this
    return response;
  }

  /**
   * Refresh access token
   */
  async refresh(): Promise<RefreshResponse> {
    return this.request<RefreshResponse>("/auth/refresh", {
      method: "POST",
    });
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await this.request("/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn("Logout API error:", error);
    }
  }
}

export const authAPI = new AuthAPI();

