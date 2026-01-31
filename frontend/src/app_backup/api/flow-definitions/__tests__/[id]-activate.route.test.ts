/**
 * Activate Flow Definition API Route Tests
 */

jest.mock("@/lib/db");
jest.mock("@/lib/config-flow/flow-definition.registry");

jest.mock("next/server", () => ({
  NextRequest: class NextRequest {
    url: string;
    headers: Headers;
    nextUrl: URL;

    constructor(url: string) {
      this.url = url;
      this.headers = new Headers();
      this.nextUrl = new URL(url, "http://localhost");
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
import { PATCH } from "../[id]/activate/route";
import { activateFlowDefinition } from "@/lib/config-flow/flow-definition.registry";

const mockActivateFlowDefinition = activateFlowDefinition as jest.MockedFunction<
  typeof activateFlowDefinition
>;

describe("Activate Flow Definition API Route", () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("activates flow definition", async () => {
    mockActivateFlowDefinition.mockResolvedValueOnce(mockDefinition);

    const request = new NextRequest(
      "http://localhost/api/flow-definitions/def-123/activate"
    );
    const response = await PATCH(request, { params: { id: "def-123" } });
    const data = await response.json();

    expect(data.definition).toEqual(mockDefinition);
    expect(data.definition.is_active).toBe(true);
    expect(mockActivateFlowDefinition).toHaveBeenCalledWith("def-123");
  });

  it("handles errors", async () => {
    mockActivateFlowDefinition.mockRejectedValueOnce(
      new Error("Activation failed")
    );

    const request = new NextRequest(
      "http://localhost/api/flow-definitions/def-123/activate"
    );
    const response = await PATCH(request, { params: { id: "def-123" } });

    expect(response.status).toBe(500);
  });
});
