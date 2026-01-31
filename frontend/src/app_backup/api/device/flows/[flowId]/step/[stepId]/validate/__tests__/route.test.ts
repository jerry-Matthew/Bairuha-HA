/**
 * Step Validation API Endpoint Tests
 * 
 * Tests for POST /api/device/flows/[flowId]/step/[stepId]/validate
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
jest.mock("@/lib/config-flow/step-resolver");
jest.mock("@/lib/config-flow/step-validation-engine");

import { POST } from "../route";
import { getStepDefinitionFromFlow } from "@/lib/config-flow/step-resolver";
import { validateStepData } from "@/lib/config-flow/step-validation-engine";

// Mock dependencies
jest.mock("@/lib/config-flow/step-resolver");
jest.mock("@/lib/config-flow/step-validation-engine");

const mockGetStepDefinitionFromFlow = getStepDefinitionFromFlow as jest.MockedFunction<
  typeof getStepDefinitionFromFlow
>;
const mockValidateStepData = validateStepData as jest.MockedFunction<
  typeof validateStepData
>;

describe("POST /api/device/flows/[flowId]/step/[stepId]/validate", () => {
  const mockStepDefinition = {
    step_id: "step1",
    step_type: "wizard" as const,
    title: "Step 1",
    schema: {
      type: "object" as const,
      properties: {
        value: {
          type: "string",
          title: "Value",
        },
      },
      required: ["value"],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStepDefinitionFromFlow.mockResolvedValue(mockStepDefinition as any);
  });

  it("should validate valid step data", async () => {
    mockValidateStepData.mockResolvedValue({
      valid: true,
      errors: {},
    });
    
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      "http://localhost/api/device/flows/flow-123/step/step1/validate",
      {
        method: "POST",
        body: JSON.stringify({ stepData: { value: "test" } }),
      }
    );
    const params = { flowId: "flow-123", stepId: "step1" };
    
    const response = await POST(request, { params } as any);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(mockValidateStepData).toHaveBeenCalledWith(
      mockStepDefinition,
      { value: "test" }
    );
  });

  it("should return validation errors for invalid data", async () => {
    mockValidateStepData.mockResolvedValue({
      valid: false,
      errors: {
        value: "Value is required",
      },
    });
    
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      "http://localhost/api/device/flows/flow-123/step/step1/validate",
      {
        method: "POST",
        body: JSON.stringify({ stepData: {} }),
      }
    );
    const params = { flowId: "flow-123", stepId: "step1" };
    
    const response = await POST(request, { params } as any);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.valid).toBe(false);
    expect(data.errors.value).toBe("Value is required");
  });

  it("should return 400 if stepData is missing", async () => {
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      "http://localhost/api/device/flows/flow-123/step/step1/validate",
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );
    const params = { flowId: "flow-123", stepId: "step1" };
    
    const response = await POST(request, { params } as any);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.error).toContain("stepData is required");
  });

  it("should return 404 if step definition not found", async () => {
    mockGetStepDefinitionFromFlow.mockResolvedValue(null);
    
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      "http://localhost/api/device/flows/flow-123/step/invalid-step/validate",
      {
        method: "POST",
        body: JSON.stringify({ stepData: { value: "test" } }),
      }
    );
    const params = { flowId: "flow-123", stepId: "invalid-step" };
    
    const response = await POST(request, { params } as any);
    const data = await response.json();
    
    expect(response.status).toBe(404);
    expect(data.error).toContain("Step definition not found");
  });

  it("should handle validation errors gracefully", async () => {
    mockValidateStepData.mockRejectedValue(new Error("Validation failed"));
    
    const { NextRequest } = await import("next/server");
    const request = new NextRequest(
      "http://localhost/api/device/flows/flow-123/step/step1/validate",
      {
        method: "POST",
        body: JSON.stringify({ stepData: { value: "test" } }),
      }
    );
    const params = { flowId: "flow-123", stepId: "step1" };
    
    const response = await POST(request, { params } as any);
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data.error).toContain("Validation failed");
  });
});
