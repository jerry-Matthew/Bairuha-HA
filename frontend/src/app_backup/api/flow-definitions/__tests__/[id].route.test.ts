/**
 * Flow Definition by ID API Route Tests
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
import { GET, PUT, DELETE } from "../[id]/route";
import {
  getFlowDefinitionById,
  updateFlowDefinition,
  deleteFlowDefinition,
} from "@/lib/config-flow/flow-definition.registry";

const mockGetFlowDefinitionById = getFlowDefinitionById as jest.MockedFunction<
  typeof getFlowDefinitionById
>;
const mockUpdateFlowDefinition = updateFlowDefinition as jest.MockedFunction<
  typeof updateFlowDefinition
>;
const mockDeleteFlowDefinition = deleteFlowDefinition as jest.MockedFunction<
  typeof deleteFlowDefinition
>;

describe("Flow Definition by ID API Routes", () => {
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

  describe("GET /api/flow-definitions/[id]", () => {
    it("returns flow definition by ID", async () => {
      mockGetFlowDefinitionById.mockResolvedValueOnce(mockDefinition);

      const request = new NextRequest(
        "http://localhost/api/flow-definitions/def-123"
      );
      const response = await GET(request, { params: { id: "def-123" } });
      const data = await response.json();

      expect(data.definition).toEqual(mockDefinition);
    });

    it("returns 404 when definition not found", async () => {
      mockGetFlowDefinitionById.mockResolvedValueOnce(null);

      const request = new NextRequest(
        "http://localhost/api/flow-definitions/def-123"
      );
      const response = await GET(request, { params: { id: "def-123" } });

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/flow-definitions/[id]", () => {
    it("updates flow definition", async () => {
      mockUpdateFlowDefinition.mockResolvedValueOnce({
        ...mockDefinition,
        description: "Updated description",
      });

      const request = new NextRequest(
        "http://localhost/api/flow-definitions/def-123",
        {
          body: JSON.stringify({
            description: "Updated description",
          }),
        }
      );

      const response = await PUT(request, { params: { id: "def-123" } });
      const data = await response.json();

      expect(data.definition.description).toBe("Updated description");
      expect(mockUpdateFlowDefinition).toHaveBeenCalledWith(
        "def-123",
        expect.objectContaining({
          description: "Updated description",
        })
      );
    });

    it("handles errors", async () => {
      mockUpdateFlowDefinition.mockRejectedValueOnce(
        new Error("Update failed")
      );

      const request = new NextRequest(
        "http://localhost/api/flow-definitions/def-123",
        {
          body: JSON.stringify({
            description: "Updated description",
          }),
        }
      );

      const response = await PUT(request, { params: { id: "def-123" } });

      expect(response.status).toBe(500);
    });
  });

  describe("DELETE /api/flow-definitions/[id]", () => {
    it("deletes flow definition", async () => {
      mockDeleteFlowDefinition.mockResolvedValueOnce();

      const request = new NextRequest(
        "http://localhost/api/flow-definitions/def-123"
      );
      const response = await DELETE(request, { params: { id: "def-123" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDeleteFlowDefinition).toHaveBeenCalledWith("def-123");
    });

    it("handles errors", async () => {
      mockDeleteFlowDefinition.mockRejectedValueOnce(
        new Error("Delete failed")
      );

      const request = new NextRequest(
        "http://localhost/api/flow-definitions/def-123"
      );
      const response = await DELETE(request, { params: { id: "def-123" } });

      expect(response.status).toBe(500);
    });
  });
});
