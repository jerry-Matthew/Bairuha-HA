/**
 * Discovery API Tests
 */

// Mock dependencies BEFORE imports
jest.mock("@/lib/discovery");
jest.mock("@/lib/config-flow/flow-type-resolver");
jest.mock("@/components/addDevice/server/config-flow.registry");

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

import { POST } from "../discover/route";
import { NextRequest } from "next/server";
import { discoveryService } from "@/lib/discovery";
import { getFlowConfig } from "@/lib/config-flow/flow-type-resolver";
import { getFlowById } from "@/components/addDevice/server/config-flow.registry";

const mockDiscoveryService = discoveryService as jest.Mocked<typeof discoveryService>;
const mockGetFlowConfig = getFlowConfig as jest.MockedFunction<typeof getFlowConfig>;
const mockGetFlowById = getFlowById as jest.MockedFunction<typeof getFlowById>;

describe("POST /api/discovery/discover", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("discovers devices with integrationDomain", async () => {
    const mockDevices = [
      {
        id: "device1",
        name: "Device 1",
        protocol: "homeassistant",
        discoveredAt: new Date(),
      },
    ];

    mockGetFlowConfig.mockResolvedValue({
      discovery_protocols: {
        mqtt: {},
      },
    });
    mockDiscoveryService.discoverDevices.mockResolvedValue(mockDevices);

    const request = new NextRequest("http://localhost/api/discovery/discover", {
      method: "POST",
      body: JSON.stringify({
        integrationDomain: "test_integration",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.devices).toEqual(mockDevices);
    expect(mockDiscoveryService.discoverDevices).toHaveBeenCalledWith(
      "test_integration",
      expect.any(Object)
    );
  });

  it("discovers devices with flowId", async () => {
    const mockDevices = [
      {
        id: "device1",
        name: "Device 1",
        protocol: "homeassistant",
        discoveredAt: new Date(),
      },
    ];

    mockGetFlowById.mockResolvedValue({
      id: "flow1",
      userId: null,
      step: "discover",
      integrationDomain: "test_integration",
      data: {},
      createdAt: new Date(),
    });
    mockGetFlowConfig.mockResolvedValue({
      discovery_protocols: {
        mqtt: {},
      },
    });
    mockDiscoveryService.discoverDevices.mockResolvedValue(mockDevices);

    const request = new NextRequest("http://localhost/api/discovery/discover", {
      method: "POST",
      body: JSON.stringify({
        flowId: "flow1",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.devices).toEqual(mockDevices);
    expect(mockGetFlowById).toHaveBeenCalledWith("flow1");
  });

  it("returns 400 when neither flowId nor integrationDomain provided", async () => {
    const request = new NextRequest("http://localhost/api/discovery/discover", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("flowId or integrationDomain required");
  });

  it("returns 404 when flow not found", async () => {
    mockGetFlowById.mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/discovery/discover", {
      method: "POST",
      body: JSON.stringify({
        flowId: "nonexistent",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Flow not found");
  });

  it("returns 400 when integration domain is missing", async () => {
    mockGetFlowById.mockResolvedValue({
      id: "flow1",
      userId: null,
      step: "discover",
      integrationDomain: null,
      data: {},
      createdAt: new Date(),
    });

    const request = new NextRequest("http://localhost/api/discovery/discover", {
      method: "POST",
      body: JSON.stringify({
        flowId: "flow1",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Integration domain required");
  });

  it("handles discovery errors", async () => {
    mockGetFlowConfig.mockResolvedValue(null);
    mockDiscoveryService.discoverDevices.mockRejectedValue(new Error("Discovery failed"));

    const request = new NextRequest("http://localhost/api/discovery/discover", {
      method: "POST",
      body: JSON.stringify({
        integrationDomain: "test_integration",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Discovery failed");
  });
});
