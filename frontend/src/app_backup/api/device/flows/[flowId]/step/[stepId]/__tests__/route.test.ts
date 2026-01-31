/**
 * Step Info API Endpoint Tests
 * 
 * Tests for GET /api/device/flows/[flowId]/step/[stepId]
 */

// Mock Next.js server utilities BEFORE imports
jest.mock("next/server", () => ({
  NextRequest: class NextRequest {
    url: string;
    constructor(url: string) {
      this.url = url;
    }
  },
  NextResponse: class NextResponse {
    body: any;
    status: number;
    constructor(body?: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
    }
    async json() {
      return this.body;
    }
    static json(body: any, init?: any) {
      return new NextResponse(body, init);
    }
  },
}));

// Mock dependencies
jest.mock("@/lib/config-flow/step-resolver");

import { GET } from "../route";
import { resolveStepComponent } from "@/lib/config-flow/step-resolver";

const mockResolveStepComponent = resolveStepComponent as jest.MockedFunction<
  typeof resolveStepComponent
>;

describe("GET /api/device/flows/[flowId]/step/[stepId]", () => {
  const mockComponentInfo = {
    componentType: "wizard" as const,
    stepDefinition: {
      step_id: "step1",
      step_type: "wizard" as const,
      title: "Step 1",
      schema: {
        type: "object" as const,
        properties: {},
      },
    },
    stepMetadata: {
      stepId: "step1",
      title: "Step 1",
      stepNumber: 1,
      totalSteps: 3,
      canGoBack: false,
      canSkip: false,
      isLastStep: false,
    },
    props: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveStepComponent.mockResolvedValue(mockComponentInfo as any);
  });

  it("should return step component information", async () => {
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      "http://localhost/api/device/flows/flow-123/step/step1"
    );
    const params = { flowId: "flow-123", stepId: "step1" };
    
    const response = await GET(request, { params } as any);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toEqual(mockComponentInfo);
    expect(mockResolveStepComponent).toHaveBeenCalledWith("flow-123", "step1");
  });

  it("should handle errors gracefully", async () => {
    mockResolveStepComponent.mockRejectedValue(new Error("Flow not found"));
    
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      "http://localhost/api/device/flows/invalid-flow/step/step1"
    );
    const params = { flowId: "invalid-flow", stepId: "step1" };
    
    const response = await GET(request, { params } as any);
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data.error).toContain("Flow not found");
  });

  it("should handle missing step", async () => {
    mockResolveStepComponent.mockRejectedValue(new Error("Step definition not found"));
    
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      "http://localhost/api/device/flows/flow-123/step/invalid-step"
    );
    const params = { flowId: "flow-123", stepId: "invalid-step" };
    
    const response = await GET(request, { params } as any);
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data.error).toContain("Step definition not found");
  });
});
