/**
 * Flow Definition Registry Tests
 * 
 * Tests for the flow definition registry service
 */

import {
  createFlowDefinition,
  getFlowDefinitionById,
  getActiveFlowDefinition,
  getFlowDefinition,
  getFlowDefinitionVersions,
  updateFlowDefinition,
  activateFlowDefinition,
  deactivateFlowDefinition,
  deleteFlowDefinition,
  listFlowDefinitions,
} from "../flow-definition.registry";
import { query } from "@/lib/db";
import type {
  CreateFlowDefinitionInput,
  FlowDefinition,
  UpdateFlowDefinitionInput,
} from "../flow-definition.types";

// Mock dependencies
jest.mock("@/lib/db");
jest.mock("../flow-definition.validator", () => ({
  validateFlowDefinition: jest.fn((def: FlowDefinition) => ({
    valid: true,
    errors: [],
  })),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

describe("Flow Definition Registry", () => {
  const mockDefinition: FlowDefinition = {
    flow_type: "wizard",
    name: "Test Flow",
    steps: [
      {
        step_id: "step1",
        step_type: "wizard",
        title: "Step 1",
        schema: {
          type: "object",
          properties: {
            field1: {
              type: "string",
              title: "Field 1",
            },
          },
        },
      },
    ],
  };

  const mockRecord = {
    id: "def-123",
    integration_domain: "test_integration",
    version: 1,
    flow_type: "wizard",
    definition: mockDefinition,
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

  describe("createFlowDefinition", () => {
    it("creates a new flow definition", async () => {
      const input: CreateFlowDefinitionInput = {
        integration_domain: "test_integration",
        flow_type: "wizard",
        definition: mockDefinition,
        description: "Test description",
      };

      // Mock deactivation query (if needed)
      mockQuery.mockResolvedValueOnce([]);
      // Mock version query
      mockQuery.mockResolvedValueOnce([{ max_version: 0 }]);
      // Mock insert
      mockQuery.mockResolvedValueOnce([]);
      // Mock get by id
      mockQuery.mockResolvedValueOnce([
        {
          id: "def-123",
          integrationDomain: "test_integration",
          version: 1,
          flowType: "wizard",
          definition: JSON.stringify(mockDefinition),
          handlerClass: null,
          handlerConfig: null,
          isActive: true,
          isDefault: false,
          description: "Test description",
          createdBy: "system",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);

      const result = await createFlowDefinition(input);

      expect(result).toBeDefined();
      expect(result.integration_domain).toBe("test_integration");
      expect(result.version).toBe(1);
      expect(mockQuery).toHaveBeenCalledTimes(4);
    });

    it("deactivates existing active definitions when creating new active one", async () => {
      const input: CreateFlowDefinitionInput = {
        integration_domain: "test_integration",
        flow_type: "wizard",
        definition: mockDefinition,
        is_active: true,
      };

      // Mock deactivation query
      mockQuery.mockResolvedValueOnce([]);
      // Mock version query
      mockQuery.mockResolvedValueOnce([{ max_version: 1 }]);
      // Mock insert
      mockQuery.mockResolvedValueOnce([]);
      // Mock get by id
      mockQuery.mockResolvedValueOnce([
        {
          ...mockRecord,
          version: 2,
        },
      ]);

      await createFlowDefinition(input);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE integration_flow_definitions"),
        expect.arrayContaining(["test_integration"])
      );
    });

    it("increments version number", async () => {
      const input: CreateFlowDefinitionInput = {
        integration_domain: "test_integration",
        flow_type: "wizard",
        definition: mockDefinition,
      };

      // Mock deactivation (if needed)
      mockQuery.mockResolvedValueOnce([]);
      // Mock version query - existing version 2
      mockQuery.mockResolvedValueOnce([{ max_version: 2 }]);
      // Mock insert
      mockQuery.mockResolvedValueOnce([]);
      // Mock get by id
      mockQuery.mockResolvedValueOnce([
        {
          ...mockRecord,
          version: 3,
        },
      ]);

      const result = await createFlowDefinition(input);

      expect(result.version).toBe(3);
    });
  });

  describe("getFlowDefinitionById", () => {
    it("retrieves flow definition by ID", async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: "def-123",
          integrationDomain: "test_integration",
          version: 1,
          flowType: "wizard",
          definition: JSON.stringify(mockDefinition),
          handlerClass: null,
          handlerConfig: null,
          isActive: true,
          isDefault: true,
          description: "Test",
          createdBy: "system",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);

      const result = await getFlowDefinitionById("def-123");

      expect(result).toBeDefined();
      expect(result?.id).toBe("def-123");
      expect(result?.definition).toEqual(mockDefinition);
    });

    it("returns null when definition not found", async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await getFlowDefinitionById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getActiveFlowDefinition", () => {
    it("retrieves active flow definition for domain", async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: "def-123",
          integrationDomain: "test_integration",
          version: 1,
          flowType: "wizard",
          definition: JSON.stringify(mockDefinition),
          handlerClass: null,
          handlerConfig: null,
          isActive: true,
          isDefault: true,
          description: "Test",
          createdBy: "system",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);

      const result = await getActiveFlowDefinition("test_integration");

      expect(result).toBeDefined();
      expect(result?.is_active).toBe(true);
    });

    it("returns null when no active definition found", async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await getActiveFlowDefinition("test_integration");

      expect(result).toBeNull();
    });
  });

  describe("getFlowDefinition", () => {
    it("retrieves active flow definition when no version specified", async () => {
      // Mock getActiveFlowDefinition call
      mockQuery.mockResolvedValueOnce([
        {
          id: "def-123",
          integrationDomain: "test_integration",
          version: 1,
          flowType: "wizard",
          definition: JSON.stringify(mockDefinition),
          handlerClass: null,
          handlerConfig: null,
          isActive: true,
          isDefault: true,
          description: "Test",
          createdBy: "system",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);

      const result = await getFlowDefinition("test_integration");

      expect(result).toBeDefined();
      expect(result?.is_active).toBe(true);
    });

    it("retrieves specific version when version specified", async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: "def-123",
          integrationDomain: "test_integration",
          version: 2,
          flowType: "wizard",
          definition: JSON.stringify(mockDefinition),
          handlerClass: null,
          handlerConfig: null,
          isActive: false,
          isDefault: false,
          description: "Test",
          createdBy: "system",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);

      const result = await getFlowDefinition("test_integration", 2);

      expect(result).toBeDefined();
      expect(result?.version).toBe(2);
    });

    it("falls back to default when no active definition", async () => {
      // Mock getActiveFlowDefinition - no result
      mockQuery.mockResolvedValueOnce([]);
      // Mock get default
      mockQuery.mockResolvedValueOnce([
        {
          id: "def-123",
          integrationDomain: "test_integration",
          version: 1,
          flowType: "wizard",
          definition: JSON.stringify(mockDefinition),
          handlerClass: null,
          handlerConfig: null,
          isActive: false,
          isDefault: true,
          description: "Test",
          createdBy: "system",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);

      const result = await getFlowDefinition("test_integration");

      expect(result).toBeDefined();
      expect(result?.is_default).toBe(true);
    });
  });

  describe("getFlowDefinitionVersions", () => {
    it("retrieves all versions for a domain", async () => {
      mockQuery.mockResolvedValueOnce([
        {
          id: "def-123",
          integrationDomain: "test_integration",
          version: 2,
          flowType: "wizard",
          definition: JSON.stringify(mockDefinition),
          handlerClass: null,
          handlerConfig: null,
          isActive: true,
          isDefault: false,
          description: "Test",
          createdBy: "system",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "def-122",
          integrationDomain: "test_integration",
          version: 1,
          flowType: "wizard",
          definition: JSON.stringify(mockDefinition),
          handlerClass: null,
          handlerConfig: null,
          isActive: false,
          isDefault: true,
          description: "Test",
          createdBy: "system",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);

      const result = await getFlowDefinitionVersions("test_integration");

      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2);
      expect(result[1].version).toBe(1);
    });
  });

  describe("updateFlowDefinition", () => {
    it("updates flow definition", async () => {
      const updates: UpdateFlowDefinitionInput = {
        description: "Updated description",
      };

      // Mock get by id
      mockQuery.mockResolvedValueOnce([
        {
          id: "def-123",
          integrationDomain: "test_integration",
          version: 1,
          flowType: "wizard",
          definition: JSON.stringify(mockDefinition),
          handlerClass: null,
          handlerConfig: null,
          isActive: true,
          isDefault: true,
          description: "Test",
          createdBy: "system",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);
      // Mock update
      mockQuery.mockResolvedValueOnce([]);
      // Mock get by id after update
      mockQuery.mockResolvedValueOnce([
        {
          id: "def-123",
          integrationDomain: "test_integration",
          version: 1,
          flowType: "wizard",
          definition: JSON.stringify(mockDefinition),
          handlerClass: null,
          handlerConfig: null,
          isActive: true,
          isDefault: true,
          description: "Updated description",
          createdBy: "system",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);

      const result = await updateFlowDefinition("def-123", updates);

      expect(result.description).toBe("Updated description");
    });

    it("throws error when definition not found", async () => {
      mockQuery.mockResolvedValueOnce([]);

      await expect(
        updateFlowDefinition("nonexistent", { description: "Test" })
      ).rejects.toThrow("Flow definition not found");
    });

    it("deactivates other versions when activating one", async () => {
      // Mock get by id
      mockQuery.mockResolvedValueOnce([
        {
          id: "def-123",
          integrationDomain: "test_integration",
          version: 1,
          flowType: "wizard",
          definition: JSON.stringify(mockDefinition),
          handlerClass: null,
          handlerConfig: null,
          isActive: false,
          isDefault: false,
          description: "Test",
          createdBy: "system",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);
      // Mock deactivation of others
      mockQuery.mockResolvedValueOnce([]);
      // Mock update
      mockQuery.mockResolvedValueOnce([]);
      // Mock get by id after update
      mockQuery.mockResolvedValueOnce([
        {
          id: "def-123",
          integrationDomain: "test_integration",
          version: 1,
          flowType: "wizard",
          definition: JSON.stringify(mockDefinition),
          handlerClass: null,
          handlerConfig: null,
          isActive: true,
          isDefault: false,
          description: "Test",
          createdBy: "system",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);

      await updateFlowDefinition("def-123", { is_active: true });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE integration_flow_definitions"),
        expect.arrayContaining(["test_integration", "def-123"])
      );
    });
  });

  describe("activateFlowDefinition", () => {
    it("activates a flow definition and deactivates others", async () => {
      // Mock get by id
      mockQuery.mockResolvedValueOnce([
        {
          id: "def-123",
          integrationDomain: "test_integration",
          version: 1,
          flowType: "wizard",
          definition: JSON.stringify(mockDefinition),
          handlerClass: null,
          handlerConfig: null,
          isActive: false,
          isDefault: false,
          description: "Test",
          createdBy: "system",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);
      // Mock deactivation of others
      mockQuery.mockResolvedValueOnce([]);
      // Mock update
      mockQuery.mockResolvedValueOnce([]);
      // Mock get by id after update
      mockQuery.mockResolvedValueOnce([
        {
          id: "def-123",
          integrationDomain: "test_integration",
          version: 1,
          flowType: "wizard",
          definition: JSON.stringify(mockDefinition),
          handlerClass: null,
          handlerConfig: null,
          isActive: true,
          isDefault: false,
          description: "Test",
          createdBy: "system",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);

      const result = await activateFlowDefinition("def-123");

      expect(result.is_active).toBe(true);
    });
  });

  describe("deleteFlowDefinition", () => {
    it("deletes a flow definition", async () => {
      mockQuery.mockResolvedValueOnce([{ rowCount: 1 }]);

      await deleteFlowDefinition("def-123");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM integration_flow_definitions"),
        ["def-123"]
      );
    });

    it("throws error when definition not found", async () => {
      mockQuery.mockResolvedValueOnce([{ rowCount: 0 }]);

      await expect(deleteFlowDefinition("nonexistent")).rejects.toThrow(
        "Flow definition not found"
      );
    });
  });

  describe("listFlowDefinitions", () => {
    it("lists flow definitions with pagination", async () => {
      // Mock count query
      mockQuery.mockResolvedValueOnce([{ count: "10" }]);
      // Mock list query
      mockQuery.mockResolvedValueOnce([
        {
          id: "def-123",
          integrationDomain: "test_integration",
          version: 1,
          flowType: "wizard",
          definition: JSON.stringify(mockDefinition),
          handlerClass: null,
          handlerConfig: null,
          isActive: true,
          isDefault: true,
          description: "Test",
          createdBy: "system",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);

      const result = await listFlowDefinitions({}, { page: 1, limit: 10 });

      expect(result.definitions).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("filters by domain", async () => {
      mockQuery.mockResolvedValueOnce([{ count: "1" }]);
      mockQuery.mockResolvedValueOnce([
        {
          id: "def-123",
          integrationDomain: "test_integration",
          version: 1,
          flowType: "wizard",
          definition: JSON.stringify(mockDefinition),
          handlerClass: null,
          handlerConfig: null,
          isActive: true,
          isDefault: true,
          description: "Test",
          createdBy: "system",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ]);

      await listFlowDefinitions({ domain: "test_integration" });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("WHERE"),
        expect.arrayContaining(["test_integration"])
      );
    });
  });
});
