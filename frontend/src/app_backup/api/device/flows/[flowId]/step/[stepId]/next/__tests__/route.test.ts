/**
 * Next Step API Endpoint Tests
 * 
 * Tests for POST /api/device/flows/[flowId]/step/[stepId]/next
 */

// Mock Next.js server utilities BEFORE imports
jest.mock("next/server", () => ({
  NextRequest: class NextRequest {
    url: string;
    body: string;
    constructor(url: string, init?: any) {
      this.url = url;
      this.body = init?.body || "{}";
    }
    async json() {
      return JSON.parse(this.body);
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
jest.mock("@/components/addDevice/server/config-flow.registry");
jest.mock("@/lib/config-flow/flow-definition.loader");
jest.mock("@/lib/config-flow/conditional-step-engine");
jest.mock("@/lib/config-flow/step-resolver");

import { POST } from "../route";
import { getFlowById } from "@/components/addDevice/server/config-flow.registry";
import { loadFlowDefinition } from "@/lib/config-flow/flow-definition.loader";
import { determineNextStep } from "@/lib/config-flow/conditional-step-engine";
import { resolveStepComponent } from "@/lib/config-flow/step-resolver";

// Mock dependencies
jest.mock("@/components/addDevice/server/config-flow.registry");
jest.mock("@/lib/config-flow/flow-definition.loader");
jest.mock("@/lib/config-flow/conditional-step-engine");
jest.mock("@/lib/config-flow/step-resolver");

const mockGetFlowById = getFlowById as jest.MockedFunction<typeof getFlowById>;
const mockLoadFlowDefinition = loadFlowDefinition as jest.MockedFunction<
  typeof loadFlowDefinition
>;
const mockDetermineNextStep = determineNextStep as jest.MockedFunction<
  typeof determineNextStep
>;
const mockResolveStepComponent = resolveStepComponent as jest.MockedFunction<
  typeof resolveStepComponent
>;

describe("POST /api/device/flows/[flowId]/step/[stepId]/next", () => {
  const mockFlow = {
    id: "flow-123",
    userId: null,
    integration_domain: "test_domain",
    step: "step1",
    data: { step1: { value: "test" } },
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
  };

  const mockDefinition = {
    flow_type: "wizard",
    name: "Test Flow",
    steps: [
      {
        step_id: "step1",
        step_type: "wizard",
        title: "Step 1",
        schema: { type: "object", properties: {} },
      },
      {
        step_id: "step2",
        step_type: "wizard",
        title: "Step 2",
        schema: { type: "object", properties: {} },
      },
    ],
  };

  const mockStepInfo = {
    componentType: "wizard" as const,
    stepDefinition: mockDefinition.steps[1],
    stepMetadata: {
      stepId: "step2",
      title: "Step 2",
      stepNumber: 2,
      totalSteps: 2,
      canGoBack: true,
      canSkip: false,
      isLastStep: false,
    },
    props: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFlowById.mockResolvedValue(mockFlow as any);
    mockLoadFlowDefinition.mockResolvedValue(mockDefinition as any);
    mockDetermineNextStep.mockReturnValue("step2");
    mockResolveStepComponent.mockResolvedValue(mockStepInfo as any);
  });

  it("should determine next step", async () => {
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      "http://localhost/api/device/flows/flow-123/step/step1/next",
      {
        method: "POST",
        body: JSON.stringify({ stepData: { step1: { value: "test" } } }),
      }
    );
    const params = { flowId: "flow-123", stepId: "step1" };
    
    const response = await POST(request, { params } as any);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.nextStepId).toBe("step2");
    expect(data.flowComplete).toBe(false);
    expect(data.stepInfo).toEqual(mockStepInfo);
    
    expect(mockDetermineNextStep).toHaveBeenCalledWith(
      mockDefinition,
      "step1",
      expect.objectContaining({ step1: { value: "test" } })
    );
  });

  it("should return flowComplete when no next step", async () => {
    mockDetermineNextStep.mockReturnValue(null);
    
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      "http://localhost/api/device/flows/flow-123/step/step2/next",
      {
        method: "POST",
        body: JSON.stringify({ stepData: {} }),
      }
    );
    const params = { flowId: "flow-123", stepId: "step2" };
    
    const response = await POST(request, { params } as any);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.nextStepId).toBeNull();
    expect(data.flowComplete).toBe(true);
  });

  it("should merge step data with flow data", async () => {
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      "http://localhost/api/device/flows/flow-123/step/step1/next",
      {
        method: "POST",
        body: JSON.stringify({
          stepData: { step1: { newValue: "new" } },
        }),
      }
    );
    const params = { flowId: "flow-123", stepId: "step1" };
    
    await POST(request, { params } as any);
    
    expect(mockDetermineNextStep).toHaveBeenCalledWith(
      mockDefinition,
      "step1",
      expect.objectContaining({
        step1: { value: "test", newValue: "new" },
      })
    );
  });

  it("should handle missing step info gracefully", async () => {
    mockResolveStepComponent.mockRejectedValue(new Error("Step not found"));
    
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      "http://localhost/api/device/flows/flow-123/step/step1/next",
      {
        method: "POST",
        body: JSON.stringify({ stepData: {} }),
      }
    );
    const params = { flowId: "flow-123", stepId: "step1" };
    
    const response = await POST(request, { params } as any);
    const data = await response.json();
    
    // Should still return next step ID even if step info fails
    expect(response.status).toBe(200);
    expect(data.nextStepId).toBe("step2");
    expect(data.stepInfo).toBeNull();
  });

  it("should return 404 if flow not found", async () => {
    mockGetFlowById.mockResolvedValue(null);
    
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      "http://localhost/api/device/flows/invalid-flow/step/step1/next",
      {
        method: "POST",
        body: JSON.stringify({ stepData: {} }),
      }
    );
    const params = { flowId: "invalid-flow", stepId: "step1" };
    
    const response = await POST(request, { params } as any);
    const data = await response.json();
    
    expect(response.status).toBe(404);
    expect(data.error).toContain("Flow not found");
  });

  it("should return 400 if flow has no integration domain", async () => {
    const flowWithoutDomain = { ...mockFlow, integration_domain: null };
    mockGetFlowById.mockResolvedValue(flowWithoutDomain as any);
    
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      "http://localhost/api/device/flows/flow-123/step/step1/next",
      {
        method: "POST",
        body: JSON.stringify({ stepData: {} }),
      }
    );
    const params = { flowId: "flow-123", stepId: "step1" };
    
    const response = await POST(request, { params } as any);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.error).toContain("integration domain");
  });

  it("should return 404 if flow definition not found", async () => {
    mockLoadFlowDefinition.mockResolvedValue(null);
    
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      "http://localhost/api/device/flows/flow-123/step/step1/next",
      {
        method: "POST",
        body: JSON.stringify({ stepData: {} }),
      }
    );
    const params = { flowId: "flow-123", stepId: "step1" };
    
    const response = await POST(request, { params } as any);
    const data = await response.json();
    
    expect(response.status).toBe(404);
    expect(data.error).toContain("Flow definition not found");
  });

  it("should handle errors gracefully", async () => {
    mockDetermineNextStep.mockImplementation(() => {
      throw new Error("Condition evaluation failed");
    });
    
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      "http://localhost/api/device/flows/flow-123/step/step1/next",
      {
        method: "POST",
        body: JSON.stringify({ stepData: {} }),
      }
    );
    const params = { flowId: "flow-123", stepId: "step1" };
    
    const response = await POST(request, { params } as any);
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data.error).toContain("Condition evaluation failed");
  });
});
