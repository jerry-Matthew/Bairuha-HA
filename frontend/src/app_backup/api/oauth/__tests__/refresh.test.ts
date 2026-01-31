/**
 * OAuth Refresh API Tests
 */

// Mock Next.js server
jest.mock("next/server", () => ({
  NextRequest: class NextRequest {
    url: string;
    headers: Headers;
    nextUrl: URL;
    
    constructor(url: string, init?: any) {
      this.url = url;
      this.headers = new Headers(init?.headers || {});
      this.nextUrl = new URL(url, "http://localhost");
      if (init?.body) {
        (this as any).body = init.body;
      }
    }
    
    async json() {
      return JSON.parse((this as any).body || "{}");
    }
  },
  NextResponse: class NextResponse {
    body: any;
    status: number;
    headers: Headers;
    
    constructor(body?: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Headers(init?.headers || {});
    }
    
    async json() {
      return this.body;
    }
    
    static json(body: any, init?: any) {
      return new NextResponse(body, init);
    }
  },
}));

import { POST } from "../refresh/route";
import { NextRequest } from "next/server";
import { getConfigEntryById } from "@/components/globalAdd/server/config-entry.registry";
import { getFlowConfig } from "@/lib/config-flow/flow-type-resolver";
import { refreshAccessToken } from "@/lib/oauth/oauth-service";
import { getTokens, updateTokens, areTokensExpired } from "@/lib/oauth/oauth-token-storage";

jest.mock("@/components/globalAdd/server/config-entry.registry");
jest.mock("@/lib/config-flow/flow-type-resolver");
jest.mock("@/lib/oauth/oauth-service");
jest.mock("@/lib/oauth/oauth-token-storage");

const mockGetConfigEntryById = getConfigEntryById as jest.MockedFunction<typeof getConfigEntryById>;
const mockGetFlowConfig = getFlowConfig as jest.MockedFunction<typeof getFlowConfig>;
const mockRefreshAccessToken = refreshAccessToken as jest.MockedFunction<typeof refreshAccessToken>;
const mockGetTokens = getTokens as jest.MockedFunction<typeof getTokens>;
const mockUpdateTokens = updateTokens as jest.MockedFunction<typeof updateTokens>;
const mockAreTokensExpired = areTokensExpired as jest.MockedFunction<typeof areTokensExpired>;

describe("POST /api/oauth/refresh", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refreshes tokens successfully", async () => {
    const configEntryId = "config_entry_123";
    const configEntry = {
      id: configEntryId,
      integrationDomain: "google",
      title: "Google OAuth",
      data: { oauth_provider: "google" },
      status: "loaded" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const oldTokens = {
      access_token: "old_access_token",
      refresh_token: "refresh_token_123",
      expires_at: Date.now() - 1000, // Expired
    };

    const newTokens = {
      access_token: "new_access_token",
      refresh_token: "refresh_token_123",
      expires_in: 3600,
      token_type: "Bearer",
      expires_at: Date.now() + 3600 * 1000,
    };

    mockGetConfigEntryById.mockResolvedValue(configEntry);
    mockGetTokens.mockResolvedValue(oldTokens);
    mockAreTokensExpired.mockReturnValue(true);
    mockGetFlowConfig.mockResolvedValue({ oauth_provider: "google" });
    mockRefreshAccessToken.mockResolvedValue(newTokens);
    mockUpdateTokens.mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:3000/api/oauth/refresh", {
      method: "POST",
      body: JSON.stringify({ configEntryId }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tokens).toEqual(newTokens);
    expect(data.message).toContain("refreshed successfully");
    expect(mockRefreshAccessToken).toHaveBeenCalledWith("google", "refresh_token_123", expect.any(Object));
    expect(mockUpdateTokens).toHaveBeenCalledWith(configEntryId, newTokens);
  });

  it("returns existing tokens when not expired", async () => {
    const configEntryId = "config_entry_123";
    const configEntry = {
      id: configEntryId,
      integrationDomain: "google",
      title: "Google OAuth",
      data: { oauth_provider: "google" },
      status: "loaded" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const tokens = {
      access_token: "valid_access_token",
      refresh_token: "refresh_token_123",
      expires_at: Date.now() + 10 * 60 * 1000, // Valid for 10 more minutes
    };

    mockGetConfigEntryById.mockResolvedValue(configEntry);
    mockGetTokens.mockResolvedValue(tokens);
    mockAreTokensExpired.mockReturnValue(false);

    const request = new NextRequest("http://localhost:3000/api/oauth/refresh", {
      method: "POST",
      body: JSON.stringify({ configEntryId }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tokens).toEqual(tokens);
    expect(data.message).toContain("still valid");
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  });

  it("returns 400 when configEntryId is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/oauth/refresh", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("configEntryId required");
  });

  it("returns 404 when config entry not found", async () => {
    mockGetConfigEntryById.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/oauth/refresh", {
      method: "POST",
      body: JSON.stringify({ configEntryId: "nonexistent" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("Config entry not found");
  });

  it("returns 404 when no tokens found", async () => {
    const configEntry = {
      id: "config_entry_123",
      integrationDomain: "google",
      title: "Google OAuth",
      data: { oauth_provider: "google" },
      status: "loaded" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockGetConfigEntryById.mockResolvedValue(configEntry);
    mockGetTokens.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/oauth/refresh", {
      method: "POST",
      body: JSON.stringify({ configEntryId: "config_entry_123" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("No tokens found");
  });

  it("returns 400 when no refresh token available", async () => {
    const configEntry = {
      id: "config_entry_123",
      integrationDomain: "google",
      title: "Google OAuth",
      data: { oauth_provider: "google" },
      status: "loaded" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const tokens = {
      access_token: "access_token_123",
      // No refresh_token
    };

    mockGetConfigEntryById.mockResolvedValue(configEntry);
    mockGetTokens.mockResolvedValue(tokens);

    const request = new NextRequest("http://localhost:3000/api/oauth/refresh", {
      method: "POST",
      body: JSON.stringify({ configEntryId: "config_entry_123" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("No refresh token available");
  });
});
