/**
 * Validate Flow Definition API Route Tests
 */

jest.mock("@/lib/db");
jest.mock("@/lib/config-flow/flow-definition.registry");
jest.mock("@/lib/config-flow/flow-definition.validator");

jest.mock("next/server", () => ({
  NextRequest: class NextRequest {
    url: string;
    headers: Headers;
    nextUrl: URL;

    constructor(url: string, init?: any) {
      this.url = url;
      this.headers = new Headers();
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

    constructor(body?: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
    }

    async json() {
      return this.body;
    }

    static json(body: any, init?: any) {
      const response = new NextResponse(body, init);
      return response;
    }
  },
}));

import { NextRequest } from "next/server";
import { POST } from "../[id]/validate/route";
import { getFlowDefinitionById } from "@/lib/config-flow/flow-definition.registry";
import { validateFlowDefinition } from "@/lib/config-flow/flow-definition.validator";

const mockGetFlowDefinitionById = getFlowDefinitionById as jest.MockedFunction<
  typeof getFlowDefinitionById
>;
const mockValidateFlowDefinition = validateFlowDefinition as jest.MockedFunction<
  typeof validateFlowDefinition
>;

describe("Validate Flow Definition API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("validates flow definition from request body", async () => {
    const definition = {
      flow_type: "wizard",
      name: "Test Flow",
      steps: [],
    };

    mockValidateFlowDefinition.mockReturnValueOnce({
      valid: true,
      errors: [],
    });

    const request = new NextRequest(
      "http://localhost/api/flow-definitions/def-123/validate",
      {
        body: JSON.stringify({
          definition,
        }),
      }
    );

    const response = await POST(request, { params: { id: "def-123" } });
    const data = await response.json();

    expect(data.valid).toBe(true);
    expect(data.errors).toHaveLength(0);
    expect(mockValidateFlowDefinition).toHaveBeenCalledWith(definition);
  });

  it("validates flow definition from database when not in body", async () => {
    const mockDefinition = {
      id: "def-123",
      integration_domain: "test_integration",
      version: 1,
      flow_type: "wizard" as const,
      definition: {
        flow_type: "wizard" as const,
        name: "Test Flow",
        steps: [],
      },
      handler_class: null,
      handler_config: null,
      is_active: true,
      is_default: true,
      description: "Test",
      created_by: "system",
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    };

    mockGetFlowDefinitionById.mockResolvedValueOnce(mockDefinition);
    mockValidateFlowDefinition.mockReturnValueOnce({
      valid: false,
      errors: [
        {
          field: "steps",
          message: "Flow must have at least one step",
          code: "REQUIRED_FIELD",
        },
      ],
    });

    const request = new NextRequest(
      "http://localhost/api/flow-definitions/def-123/validate"
    );

    const response = await POST(request, { params: { id: "def-123" } });
    const data = await response.json();

    expect(data.valid).toBe(false);
    expect(data.errors).toHaveLength(1);
    expect(mockGetFlowDefinitionById).toHaveBeenCalledWith("def-123");
  });

  it("returns 404 when definition not found", async () => {
    mockGetFlowDefinitionById.mockResolvedValueOnce(null);

    const request = new NextRequest(
      "http://localhost/api/flow-definitions/def-123/validate"
    );

    const response = await POST(request, { params: { id: "def-123" } });

    expect(response.status).toBe(404);
  });

  it("handles errors", async () => {
    mockGetFlowDefinitionById.mockRejectedValueOnce(
      new Error("Database error")
    );

    const request = new NextRequest(
      "http://localhost/api/flow-definitions/def-123/validate"
    );

    const response = await POST(request, { params: { id: "def-123" } });

    expect(response.status).toBe(500);
  });
});
