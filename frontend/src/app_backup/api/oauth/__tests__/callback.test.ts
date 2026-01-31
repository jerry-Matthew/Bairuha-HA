/**
 * OAuth Callback API Tests
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
    
    static redirect(url: string, init?: any) {
      const response = new NextResponse(null, { status: 307, ...init });
      response.headers.set("location", url);
      return response;
    }
  },
}));

import { GET } from "../callback/route";
import { NextRequest } from "next/server";
import { getFlowById, updateFlow } from "@/components/addDevice/server/config-flow.registry";
import { getFlowConfig } from "@/lib/config-flow/flow-type-resolver";
import { exchangeAuthorizationCode, validateState } from "@/lib/oauth/oauth-service";
import { storeTokens } from "@/lib/oauth/oauth-token-storage";
import { createConfigEntry } from "@/components/globalAdd/server/config-entry.registry";

jest.mock("@/components/addDevice/server/config-flow.registry");
jest.mock("@/lib/config-flow/flow-type-resolver");
jest.mock("@/lib/oauth/oauth-service");
jest.mock("@/lib/oauth/oauth-token-storage");
jest.mock("@/components/globalAdd/server/config-entry.registry");

const mockGetFlowById = getFlowById as jest.MockedFunction<typeof getFlowById>;
const mockUpdateFlow = updateFlow as jest.MockedFunction<typeof updateFlow>;
const mockGetFlowConfig = getFlowConfig as jest.MockedFunction<typeof getFlowConfig>;
const mockExchangeAuthorizationCode = exchangeAuthorizationCode as jest.MockedFunction<typeof exchangeAuthorizationCode>;
const mockValidateState = validateState as jest.MockedFunction<typeof validateState>;
const mockStoreTokens = storeTokens as jest.MockedFunction<typeof storeTokens>;
const mockCreateConfigEntry = createConfigEntry as jest.MockedFunction<typeof createConfigEntry>;

describe("GET /api/oauth/callback", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_BASE_URL: "http://localhost:3000",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("handles OAuth callback successfully", async () => {
    const flowId = "flow_123";
    const state = "state_123";
    const code = "auth_code_123";

    const flow = {
      id: flowId,
      userId: null,
      integrationDomain: "google",
      step: "oauth_authorize" as const,
      data: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const flowConfig = {
      oauth_provider: "google",
      scopes: ["openid", "email"],
    };

    const oauthState = {
      flowId,
      providerId: "google",
      redirectUri: "http://localhost:3000/api/oauth/callback",
      nonce: "nonce_123",
      timestamp: Date.now(),
    };

    const tokens = {
      access_token: "access_token_123",
      refresh_token: "refresh_token_123",
      expires_in: 3600,
      token_type: "Bearer",
    };

    const configEntry = {
      id: "config_entry_123",
      integrationDomain: "google",
      title: "google OAuth",
      data: { oauth_provider: "google" },
      status: "loaded" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockValidateState.mockReturnValue(oauthState);
    mockGetFlowById.mockResolvedValue(flow);
    mockGetFlowConfig.mockResolvedValue(flowConfig);
    mockExchangeAuthorizationCode.mockResolvedValue(tokens);
    mockCreateConfigEntry.mockResolvedValue(configEntry);
    mockStoreTokens.mockResolvedValue(undefined);
    mockUpdateFlow.mockResolvedValue(flow);

    const request = new NextRequest(
      `http://localhost:3000/api/oauth/callback?code=${code}&state=${state}`
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(mockExchangeAuthorizationCode).toHaveBeenCalledWith(
      "google",
      code,
      oauthState.redirectUri,
      state,
      flowConfig
    );
    expect(mockStoreTokens).toHaveBeenCalledWith(configEntry.id, tokens);
    expect(mockUpdateFlow).toHaveBeenCalled();
  });

  it("handles OAuth error from provider", async () => {
    const error = "access_denied";
    const errorDescription = "User denied access";

    const request = new NextRequest(
      `http://localhost:3000/api/oauth/callback?error=${error}&error_description=${encodeURIComponent(errorDescription)}`
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    const location = response.headers.get("location");
    expect(location).toContain("oauth_error=access_denied");
  });

  it("handles missing code or state", async () => {
    const request = new NextRequest("http://localhost:3000/api/oauth/callback");

    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("oauth_error=missing_parameters");
  });

  it("handles invalid state", async () => {
    mockValidateState.mockReturnValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/oauth/callback?code=auth_code&state=invalid_state"
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("oauth_error=invalid_state");
  });

  it("handles flow not found", async () => {
    const oauthState = {
      flowId: "nonexistent",
      providerId: "google",
      redirectUri: "http://localhost:3000/api/oauth/callback",
      nonce: "nonce_123",
      timestamp: Date.now(),
    };

    mockValidateState.mockReturnValue(oauthState);
    mockGetFlowById.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/oauth/callback?code=auth_code&state=state_123"
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("oauth_error=flow_not_found");
  });

  it("handles token exchange errors", async () => {
    const flowId = "flow_123";
    const state = "state_123";
    const code = "auth_code_123";

    const oauthState = {
      flowId,
      providerId: "google",
      redirectUri: "http://localhost:3000/api/oauth/callback",
      nonce: "nonce_123",
      timestamp: Date.now(),
    };

    const flow = {
      id: flowId,
      userId: null,
      integrationDomain: "google",
      step: "oauth_authorize" as const,
      data: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const flowConfig = {
      oauth_provider: "google",
    };

    mockValidateState.mockReturnValue(oauthState);
    mockGetFlowById.mockResolvedValue(flow);
    mockGetFlowConfig.mockResolvedValue(flowConfig);
    mockExchangeAuthorizationCode.mockRejectedValue(new Error("Token exchange failed"));

    const request = new NextRequest(
      `http://localhost:3000/api/oauth/callback?code=${code}&state=${state}`
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("oauth_error=");
  });
});
