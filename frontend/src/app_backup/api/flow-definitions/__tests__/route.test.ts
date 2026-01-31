/**
 * Flow Definitions API Route Tests
 * 
 * Tests for the flow definitions API endpoints
 */

// Mock dependencies BEFORE imports
jest.mock("@/lib/db");
jest.mock("@/lib/config-flow/flow-definition.registry");

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
      const response = new NextResponse(body, init);
      return response;
    }
  },
}));

import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import {
  listFlowDefinitions,
  createFlowDefinition,
} from "@/lib/config-flow/flow-definition.registry";
import type { FlowDefinitionRecord } from "@/lib/config-flow/flow-definition.types";

const mockListFlowDefinitions = listFlowDefinitions as jest.MockedFunction<
  typeof listFlowDefinitions
>;
const mockCreateFlowDefinition = createFlowDefinition as jest.MockedFunction<
  typeof createFlowDefinition
>;

describe("Flow Definitions API Routes", () => {
  const mockDefinition: FlowDefinitionRecord = {
    id: "def-123",
    integration_domain: "test_integration",
    version: 1,
    flow_type: "wizard",
    definition: {
      flow_type: "wizard",
      name: "Test Flow",
      steps: [
        {
          step_id: "step1",
          step_type: "wizard",
          title: "Step 1",
          schema: {
            type: "object",
            properties: {},
          },
        },
      ],
    },
    handler_class: null,
    handler_config: null,
    is_active: true,
    is_default: true,
    description: "Test description",
    created_by: "system",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/flow-definitions", () => {
    it("returns list of flow definitions", async () => {
      mockListFlowDefinitions.mockResolvedValueOnce({
        definitions: [mockDefinition],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });

      const request = new NextRequest("http://localhost/api/flow-definitions");
      const response = await GET(request);
      const data = await response.json();

      expect(data.definitions).toHaveLength(1);
      expect(data.pagination.total).toBe(1);
      expect(mockListFlowDefinitions).toHaveBeenCalledWith({}, {
        page: 1,
        limit: 50,
        sort: "created_at",
        order: "desc",
      });
    });

    it("filters by domain", async () => {
      mockListFlowDefinitions.mockResolvedValueOnce({
        definitions: [mockDefinition],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });

      const request = new NextRequest(
        "http://localhost/api/flow-definitions?domain=test_integration"
      );
      await GET(request);

      expect(mockListFlowDefinitions).toHaveBeenCalledWith(
        { domain: "test_integration" },
        expect.any(Object)
      );
    });

    it("filters by flow_type", async () => {
      mockListFlowDefinitions.mockResolvedValueOnce({
        definitions: [mockDefinition],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });

      const request = new NextRequest(
        "http://localhost/api/flow-definitions?flow_type=wizard"
      );
      await GET(request);

      expect(mockListFlowDefinitions).toHaveBeenCalledWith(
        { flow_type: "wizard" },
        expect.any(Object)
      );
    });

    it("handles pagination", async () => {
      mockListFlowDefinitions.mockResolvedValueOnce({
        definitions: [],
        total: 100,
        page: 2,
        limit: 25,
        totalPages: 4,
      });

      const request = new NextRequest(
        "http://localhost/api/flow-definitions?page=2&limit=25"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(25);
      expect(mockListFlowDefinitions).toHaveBeenCalledWith({}, {
        page: 2,
        limit: 25,
        sort: "created_at",
        order: "desc",
      });
    });

    it("handles errors", async () => {
      mockListFlowDefinitions.mockRejectedValueOnce(
        new Error("Database error")
      );

      const request = new NextRequest("http://localhost/api/flow-definitions");
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/flow-definitions", () => {
    it("creates a new flow definition", async () => {
      mockCreateFlowDefinition.mockResolvedValueOnce(mockDefinition);

      const request = new NextRequest("http://localhost/api/flow-definitions", {
        body: JSON.stringify({
          integration_domain: "test_integration",
          flow_type: "wizard",
          definition: mockDefinition.definition,
          description: "Test description",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.definition).toBeDefined();
      expect(data.definition.id).toBe("def-123");
      expect(mockCreateFlowDefinition).toHaveBeenCalledWith(
        expect.objectContaining({
          integration_domain: "test_integration",
          flow_type: "wizard",
          definition: mockDefinition.definition,
        })
      );
    });

    it("sets default values", async () => {
      mockCreateFlowDefinition.mockResolvedValueOnce(mockDefinition);

      const request = new NextRequest("http://localhost/api/flow-definitions", {
        body: JSON.stringify({
          integration_domain: "test_integration",
          flow_type: "wizard",
          definition: mockDefinition.definition,
        }),
      });

      await POST(request);

      expect(mockCreateFlowDefinition).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: true,
          is_default: false,
          created_by: "system",
        })
      );
    });

    it("handles errors", async () => {
      mockCreateFlowDefinition.mockRejectedValueOnce(
        new Error("Validation error")
      );

      const request = new NextRequest("http://localhost/api/flow-definitions", {
        body: JSON.stringify({
          integration_domain: "test_integration",
          flow_type: "wizard",
          definition: {},
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });
});
