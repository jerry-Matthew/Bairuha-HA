/**
 * Flow Definitions by Domain API Route Tests
 */

jest.mock("@/lib/db");
jest.mock("@/lib/config-flow/flow-definition.registry");

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
import { GET, PUT } from "../by-domain/[domain]/route";
import {
  getFlowDefinition,
  getActiveFlowDefinition,
  createFlowDefinition,
} from "@/lib/config-flow/flow-definition.registry";

const mockGetFlowDefinition = getFlowDefinition as jest.MockedFunction<
  typeof getFlowDefinition
>;
const mockGetActiveFlowDefinition =
  getActiveFlowDefinition as jest.MockedFunction<
    typeof getActiveFlowDefinition
  >;
const mockCreateFlowDefinition = createFlowDefinition as jest.MockedFunction<
  typeof createFlowDefinition
>;

describe("Flow Definitions by Domain API Routes", () => {
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

  describe("GET /api/flow-definitions/by-domain/[domain]", () => {
    it("returns active flow definition", async () => {
      mockGetFlowDefinition.mockResolvedValueOnce(mockDefinition);

      const request = new NextRequest(
        "http://localhost/api/flow-definitions/test_integration"
      );
      const response = await GET(request, {
        params: { domain: "test_integration" },
      });
      const data = await response.json();

      expect(data.definition).toEqual(mockDefinition);
      expect(mockGetFlowDefinition).toHaveBeenCalledWith(
        "test_integration",
        undefined
      );
    });

    it("returns specific version when version query param provided", async () => {
      mockGetFlowDefinition.mockResolvedValueOnce(mockDefinition);

      const request = new NextRequest(
        "http://localhost/api/flow-definitions/test_integration?version=2"
      );
      await GET(request, {
        params: { domain: "test_integration" },
      });

      expect(mockGetFlowDefinition).toHaveBeenCalledWith(
        "test_integration",
        2
      );
    });

    it("returns 404 when definition not found", async () => {
      mockGetFlowDefinition.mockResolvedValueOnce(null);

      const request = new NextRequest(
        "http://localhost/api/flow-definitions/test_integration"
      );
      const response = await GET(request, {
        params: { domain: "test_integration" },
      });

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/flow-definitions/by-domain/[domain]", () => {
    it("updates existing active definition", async () => {
      mockGetActiveFlowDefinition.mockResolvedValueOnce(mockDefinition);
      mockCreateFlowDefinition.mockResolvedValueOnce({
        ...mockDefinition,
        version: 2,
      });

      const request = new NextRequest(
        "http://localhost/api/flow-definitions/test_integration",
        {
          body: JSON.stringify({
            flow_type: "wizard",
            definition: mockDefinition.definition,
          }),
        }
      );

      const response = await PUT(request, {
        params: { domain: "test_integration" },
      });
      const data = await response.json();

      expect(data.definition.version).toBe(2);
    });

    it("creates new definition when none exists", async () => {
      mockGetActiveFlowDefinition.mockResolvedValueOnce(null);
      mockCreateFlowDefinition.mockResolvedValueOnce(mockDefinition);

      const request = new NextRequest(
        "http://localhost/api/flow-definitions/test_integration",
        {
          body: JSON.stringify({
            flow_type: "wizard",
            definition: mockDefinition.definition,
          }),
        }
      );

      const response = await PUT(request, {
        params: { domain: "test_integration" },
      });

      expect(response.status).toBe(201);
    });

    it("handles errors", async () => {
      mockGetActiveFlowDefinition.mockRejectedValueOnce(
        new Error("Database error")
      );

      const request = new NextRequest(
        "http://localhost/api/flow-definitions/test_integration",
        {
          body: JSON.stringify({
            flow_type: "wizard",
            definition: {},
          }),
        }
      );

      const response = await PUT(request, {
        params: { domain: "test_integration" },
      });

      expect(response.status).toBe(500);
    });
  });
});
