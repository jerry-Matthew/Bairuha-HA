/**
 * OAuth Authorize API Tests
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
    
    static redirect(url: string, init?: any) {
      const response = new NextResponse(null, { status: 307, ...init });
      response.headers.set("location", url);
      return response;
    }
  },
}));

import { POST } from "../authorize/route";
import { NextRequest } from "next/server";
import { getFlowById, updateFlow } from "@/components/addDevice/server/config-flow.registry";
import { getFlowConfig } from "@/lib/config-flow/flow-type-resolver";
import { generateAuthorizationUrl } from "@/lib/oauth/oauth-service";

jest.mock("@/components/addDevice/server/config-flow.registry");
jest.mock("@/lib/config-flow/flow-type-resolver");
jest.mock("@/lib/oauth/oauth-service");

const mockGetFlowById = getFlowById as jest.MockedFunction<typeof getFlowById>;
const mockUpdateFlow = updateFlow as jest.MockedFunction<typeof updateFlow>;
const mockGetFlowConfig = getFlowConfig as jest.MockedFunction<typeof getFlowConfig>;
const mockGenerateAuthorizationUrl = generateAuthorizationUrl as jest.MockedFunction<typeof generateAuthorizationUrl>;

describe("POST /api/oauth/authorize", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("generates authorization URL successfully", async () => {
    const flowId = "flow_123";
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

    mockGetFlowById.mockResolvedValue(flow);
    mockGetFlowConfig.mockResolvedValue(flowConfig);
    mockGenerateAuthorizationUrl.mockResolvedValue({
      url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=test&...",
      state: "state_123",
    });
    mockUpdateFlow.mockResolvedValue(flow);

    const request = new NextRequest("http://localhost:3000/api/oauth/authorize", {
      method: "POST",
      body: JSON.stringify({ flowId }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.authorizationUrl).toBeDefined();
    expect(data.state).toBeDefined();
    expect(mockGenerateAuthorizationUrl).toHaveBeenCalledWith(
      "google",
      flowId,
      ["openid", "email"],
      expect.stringContaining("/api/oauth/callback"),
      flowConfig
    );
  });

  it("returns 400 when flowId is missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/oauth/authorize", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("flowId required");
  });

  it("returns 404 when flow not found", async () => {
    mockGetFlowById.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/oauth/authorize", {
      method: "POST",
      body: JSON.stringify({ flowId: "nonexistent" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("Flow not found");
  });

  it("returns 400 when integration domain not set", async () => {
    const flow = {
      id: "flow_123",
      userId: null,
      integrationDomain: null,
      step: "pick_integration" as const,
      data: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockGetFlowById.mockResolvedValue(flow);

    const request = new NextRequest("http://localhost:3000/api/oauth/authorize", {
      method: "POST",
      body: JSON.stringify({ flowId: "flow_123" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Integration domain not set");
  });

  it("returns 400 when OAuth provider not configured", async () => {
    const flow = {
      id: "flow_123",
      userId: null,
      integrationDomain: "test_integration",
      step: "oauth_authorize" as const,
      data: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockGetFlowById.mockResolvedValue(flow);
    mockGetFlowConfig.mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/oauth/authorize", {
      method: "POST",
      body: JSON.stringify({ flowId: "flow_123" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("OAuth provider not configured");
  });
});
