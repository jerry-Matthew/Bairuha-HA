/**
 * Flow Definition Loader Tests
 * 
 * Tests for the flow definition loader service
 */

import {
  loadFlowDefinition,
  loadFlowDefinitionRecord,
  getStepDefinitions,
  getStepDefinition,
  getInitialStepId,
  getNextStepId,
  clearFlowDefinitionCache,
  clearFlowDefinitionCacheForDomain,
  invalidateFlowDefinitionCache,
} from "../flow-definition.loader";
import {
  getFlowDefinition,
  getActiveFlowDefinition,
} from "../flow-definition.registry";
import { getFlowConfig } from "../flow-type-resolver";
import type { FlowDefinition } from "../flow-definition.types";

// Mock dependencies
jest.mock("../flow-definition.registry");
jest.mock("../flow-type-resolver");

const mockGetFlowDefinition = getFlowDefinition as jest.MockedFunction<
  typeof getFlowDefinition
>;
const mockGetActiveFlowDefinition =
  getActiveFlowDefinition as jest.MockedFunction<
    typeof getActiveFlowDefinition
  >;
const mockGetFlowConfig = getFlowConfig as jest.MockedFunction<
  typeof getFlowConfig
>;

describe("Flow Definition Loader", () => {
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
      {
        step_id: "step2",
        step_type: "wizard",
        title: "Step 2",
        schema: {
          type: "object",
          properties: {},
        },
        condition: {
          depends_on: "step1",
          field: "field1",
          operator: "equals",
          value: "test",
        },
      },
    ],
  };

  const mockRecord = {
    id: "def-123",
    integration_domain: "test_integration",
    version: 1,
    flow_type: "wizard" as const,
    definition: mockDefinition,
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
    clearFlowDefinitionCache();
  });

  describe("loadFlowDefinition", () => {
    it("loads flow definition from registry", async () => {
      mockGetFlowDefinition.mockResolvedValueOnce(mockRecord);

      const result = await loadFlowDefinition("test_integration");

      expect(result).toEqual(mockDefinition);
      expect(mockGetFlowDefinition).toHaveBeenCalledWith("test_integration");
    });

    it("caches flow definition", async () => {
      mockGetFlowDefinition.mockResolvedValueOnce(mockRecord);

      const result1 = await loadFlowDefinition("test_integration");
      const result2 = await loadFlowDefinition("test_integration");

      expect(result1).toEqual(mockDefinition);
      expect(result2).toEqual(mockDefinition);
      expect(mockGetFlowDefinition).toHaveBeenCalledTimes(1);
    });

    it("falls back to flowConfig when definition not found", async () => {
      mockGetFlowDefinition.mockResolvedValueOnce(null);
      mockGetFlowConfig.mockResolvedValueOnce({
        steps: [
          {
            step_id: "step1",
            title: "Step 1",
            schema: {
              type: "object",
              properties: {},
            },
          },
        ],
      });

      const result = await loadFlowDefinition("test_integration");

      expect(result).toBeDefined();
      expect(result?.flow_type).toBe("wizard");
      expect(result?.steps).toHaveLength(1);
    });

    it("returns null when neither definition nor flowConfig found", async () => {
      mockGetFlowDefinition.mockResolvedValueOnce(null);
      mockGetFlowConfig.mockResolvedValueOnce(null);

      const result = await loadFlowDefinition("test_integration");

      expect(result).toBeNull();
    });

    it("handles errors gracefully", async () => {
      mockGetFlowDefinition.mockRejectedValueOnce(
        new Error("Database error")
      );

      const result = await loadFlowDefinition("test_integration");

      expect(result).toBeNull();
    });
  });

  describe("loadFlowDefinitionRecord", () => {
    it("loads flow definition record", async () => {
      mockGetFlowDefinition.mockResolvedValueOnce(mockRecord);

      const result = await loadFlowDefinitionRecord("test_integration");

      expect(result).toEqual(mockRecord);
    });

    it("caches flow definition record", async () => {
      mockGetFlowDefinition.mockResolvedValueOnce(mockRecord);

      const result1 = await loadFlowDefinitionRecord("test_integration");
      const result2 = await loadFlowDefinitionRecord("test_integration");

      expect(result1).toEqual(mockRecord);
      expect(result2).toEqual(mockRecord);
      expect(mockGetFlowDefinition).toHaveBeenCalledTimes(1);
    });

    it("returns null when definition not found", async () => {
      mockGetFlowDefinition.mockResolvedValueOnce(null);

      const result = await loadFlowDefinitionRecord("test_integration");

      expect(result).toBeNull();
    });
  });

  describe("getStepDefinitions", () => {
    it("extracts step definitions from flow definition", () => {
      const steps = getStepDefinitions(mockDefinition);

      expect(steps).toHaveLength(2);
      expect(steps[0].step_id).toBe("step1");
      expect(steps[1].step_id).toBe("step2");
    });

    it("returns empty array when no steps", () => {
      const definition: FlowDefinition = {
        flow_type: "manual",
        name: "Test",
        steps: [],
      };

      const steps = getStepDefinitions(definition);

      expect(steps).toHaveLength(0);
    });
  });

  describe("getStepDefinition", () => {
    it("finds step definition by step ID", () => {
      const step = getStepDefinition(mockDefinition, "step1");

      expect(step).toBeDefined();
      expect(step?.step_id).toBe("step1");
      expect(step?.title).toBe("Step 1");
    });

    it("returns null when step not found", () => {
      const step = getStepDefinition(mockDefinition, "nonexistent");

      expect(step).toBeNull();
    });
  });

  describe("getInitialStepId", () => {
    it("returns initial_step when specified", () => {
      const definition: FlowDefinition = {
        ...mockDefinition,
        initial_step: "step2",
      };

      const stepId = getInitialStepId(definition);

      expect(stepId).toBe("step2");
    });

    it("returns first step when initial_step not specified", () => {
      const stepId = getInitialStepId(mockDefinition);

      expect(stepId).toBe("step1");
    });

    it("returns null when no steps", () => {
      const definition: FlowDefinition = {
        flow_type: "manual",
        name: "Test",
        steps: [],
      };

      const stepId = getInitialStepId(definition);

      expect(stepId).toBeNull();
    });
  });

  describe("getNextStepId", () => {
    it("returns next step ID when condition is met", () => {
      const flowData = {
        step1: { field1: "test" }, // Condition met - step2 condition checks for "test"
      };

      const nextStepId = getNextStepId(mockDefinition, "step1", flowData);

      expect(nextStepId).toBe("step2"); // Condition met, step2 should be returned
    });

    it("skips conditional steps when condition not met", () => {
      const flowData = {
        step1: { field1: "other_value" }, // Condition not met
      };

      const nextStepId = getNextStepId(mockDefinition, "step1", flowData);

      expect(nextStepId).toBeNull(); // No next step since step2 is skipped
    });

    it("includes conditional steps when condition is met", () => {
      const flowData = {
        step1: { field1: "test" }, // Condition met - step2 condition checks for "test"
      };

      const nextStepId = getNextStepId(mockDefinition, "step1", flowData);

      expect(nextStepId).toBe("step2"); // Condition met, step2 should be returned
    });

    it("returns null when at last step", () => {
      const flowData = {
        step1: { field1: "value1" },
        step2: { field2: "value2" },
      };

      const nextStepId = getNextStepId(mockDefinition, "step2", flowData);

      expect(nextStepId).toBeNull();
    });

    it("uses explicit next_step from navigation", () => {
      const definition: FlowDefinition = {
        ...mockDefinition,
        steps: [
          {
            step_id: "step1",
            step_type: "wizard",
            title: "Step 1",
            schema: { type: "object", properties: {} },
            navigation: {
              next_step: "step3",
            },
          },
          {
            step_id: "step2",
            step_type: "wizard",
            title: "Step 2",
            schema: { type: "object", properties: {} },
          },
          {
            step_id: "step3",
            step_type: "wizard",
            title: "Step 3",
            schema: { type: "object", properties: {} },
          },
        ],
      };

      const nextStepId = getNextStepId(definition, "step1", {});

      expect(nextStepId).toBe("step3");
    });
  });

  describe("clearFlowDefinitionCache", () => {
    it("clears all cached definitions", async () => {
      mockGetFlowDefinition.mockResolvedValueOnce(mockRecord);

      await loadFlowDefinition("test_integration");
      clearFlowDefinitionCache();
      await loadFlowDefinition("test_integration");

      expect(mockGetFlowDefinition).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearFlowDefinitionCacheForDomain", () => {
    it("clears cache for specific domain", async () => {
      mockGetFlowDefinition.mockResolvedValueOnce(mockRecord);

      await loadFlowDefinition("test_integration");
      clearFlowDefinitionCacheForDomain("test_integration");
      await loadFlowDefinition("test_integration");

      expect(mockGetFlowDefinition).toHaveBeenCalledTimes(2);
    });
  });

  describe("invalidateFlowDefinitionCache", () => {
    it("invalidates and reloads cache", async () => {
      mockGetFlowDefinition.mockResolvedValue(mockRecord);

      await loadFlowDefinition("test_integration");
      await invalidateFlowDefinitionCache("test_integration");

      expect(mockGetFlowDefinition).toHaveBeenCalledTimes(2);
    });
  });
});
