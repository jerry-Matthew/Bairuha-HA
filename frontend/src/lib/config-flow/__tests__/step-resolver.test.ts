/**
 * Step Resolver Tests
 * 
 * Tests for the step resolver service
 */

import {
  resolveStepComponent,
  getStepDefinitionFromFlow,
  evaluateStepConditions,
  type StepComponentInfo,
} from "../step-resolver";
import { loadFlowDefinition, getStepDefinition } from "../flow-definition.loader";
import { getFlowById } from "@/components/addDevice/server/config-flow.registry";
import type { FlowDefinition, StepDefinition } from "../flow-definition.types";

// Mock dependencies
jest.mock("../flow-definition.loader");
jest.mock("@/components/addDevice/server/config-flow.registry");

const mockLoadFlowDefinition = loadFlowDefinition as jest.MockedFunction<
  typeof loadFlowDefinition
>;
const mockGetStepDefinition = getStepDefinition as jest.MockedFunction<
  typeof getStepDefinition
>;
const mockGetFlowById = getFlowById as jest.MockedFunction<typeof getFlowById>;

describe("Step Resolver", () => {
  const mockFlow = {
    id: "flow-123",
    userId: null,
    integration_domain: "test_domain",
    step: "step1",
    data: { step1: { value: "test" } },
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
  };

  const mockDefinition: FlowDefinition = {
    flow_type: "wizard",
    name: "Test Flow",
    steps: [
      {
        step_id: "step1",
        step_type: "wizard",
        title: "Step 1",
        description: "First step",
        icon: "mdi:step-1",
        schema: {
          type: "object",
          properties: {
            value: {
              type: "string",
              title: "Value",
            },
          },
        },
        ui: {
          help_text: "Enter a value",
        },
      },
      {
        step_id: "step2",
        step_type: "manual",
        title: "Step 2",
        schema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };

  const mockStepDef: StepDefinition = mockDefinition.steps[0];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFlowById.mockResolvedValue(mockFlow as any);
    mockLoadFlowDefinition.mockResolvedValue(mockDefinition);
    mockGetStepDefinition.mockReturnValue(mockStepDef);
  });

  describe("resolveStepComponent", () => {
    it("should resolve step component for wizard step", async () => {
      const result = await resolveStepComponent("flow-123", "step1");
      
      expect(result).toBeDefined();
      expect(result.componentType).toBe("wizard");
      expect(result.stepDefinition).toEqual(mockStepDef);
      expect(result.stepMetadata.stepId).toBe("step1");
      expect(result.stepMetadata.title).toBe("Step 1");
      expect(result.stepMetadata.description).toBe("First step");
    });

    it("should resolve step component for manual step", async () => {
      const manualStepDef: StepDefinition = mockDefinition.steps[1];
      mockGetStepDefinition.mockReturnValue(manualStepDef);
      
      const result = await resolveStepComponent("flow-123", "step2");
      
      expect(result.componentType).toBe("manual");
      expect(result.stepDefinition).toEqual(manualStepDef);
    });

    it("should normalize step IDs with prefixes", async () => {
      mockGetStepDefinition.mockReturnValueOnce(null).mockReturnValue(mockStepDef);
      
      const result = await resolveStepComponent("flow-123", "wizard_step_step1");
      
      expect(result).toBeDefined();
      expect(result.stepMetadata.stepId).toBe("step1");
    });

    it("should extract component props", async () => {
      const result = await resolveStepComponent("flow-123", "step1");
      
      expect(result.props).toBeDefined();
      expect(result.props.showProgress).toBe(true);
    });

    it("should throw error if flow not found", async () => {
      mockGetFlowById.mockResolvedValue(null);
      
      await expect(resolveStepComponent("invalid-flow", "step1")).rejects.toThrow(
        "Flow not found"
      );
    });

    it("should throw error if flow definition not found", async () => {
      mockLoadFlowDefinition.mockResolvedValue(null);
      
      await expect(resolveStepComponent("flow-123", "step1")).rejects.toThrow(
        "Flow definition not found"
      );
    });

    it("should throw error if step definition not found", async () => {
      mockGetStepDefinition.mockReturnValue(null);
      
      await expect(resolveStepComponent("flow-123", "invalid-step")).rejects.toThrow(
        "Step definition not found"
      );
    });

    it("should handle custom components", async () => {
      const customStepDef: StepDefinition = {
        ...mockStepDef,
        ui: {
          component: "CustomComponent",
        },
      };
      mockGetStepDefinition.mockReturnValue(customStepDef);
      
      const result = await resolveStepComponent("flow-123", "step1");
      
      expect(result.componentType).toBe("custom");
      expect(result.componentName).toBe("CustomComponent");
    });

    it("should calculate step metadata correctly", async () => {
      const result = await resolveStepComponent("flow-123", "step1");
      
      expect(result.stepMetadata.stepNumber).toBe(1);
      expect(result.stepMetadata.totalSteps).toBe(2);
      expect(result.stepMetadata.canGoBack).toBe(false);
      expect(result.stepMetadata.isLastStep).toBe(false);
    });

    it("should identify last step correctly", async () => {
      const lastStepDef: StepDefinition = mockDefinition.steps[1];
      mockGetStepDefinition.mockReturnValue(lastStepDef);
      
      const result = await resolveStepComponent("flow-123", "step2");
      
      expect(result.stepMetadata.isLastStep).toBe(true);
    });
  });

  describe("getStepDefinitionFromFlow", () => {
    it("should get step definition from flow", async () => {
      const result = await getStepDefinitionFromFlow("flow-123", "step1");
      
      expect(result).toEqual(mockStepDef);
      expect(mockLoadFlowDefinition).toHaveBeenCalledWith("test_domain");
      expect(mockGetStepDefinition).toHaveBeenCalledWith(mockDefinition, "step1");
    });

    it("should return null if flow not found", async () => {
      mockGetFlowById.mockResolvedValue(null);
      
      const result = await getStepDefinitionFromFlow("invalid-flow", "step1");
      
      expect(result).toBeNull();
    });

    it("should return null if flow definition not found", async () => {
      mockLoadFlowDefinition.mockResolvedValue(null);
      
      const result = await getStepDefinitionFromFlow("flow-123", "step1");
      
      expect(result).toBeNull();
    });
  });

  describe("evaluateStepConditions", () => {
    it("should evaluate step conditions correctly", async () => {
      const flowData = {
        step1: { enable_advanced: true },
      };
      const flowWithData = { ...mockFlow, data: flowData };
      mockGetFlowById.mockResolvedValue(flowWithData as any);
      
      const result = await evaluateStepConditions("flow-123", "step1", flowData);
      
      expect(result).toBe(true);
    });

    it("should return false if step should be skipped", async () => {
      const conditionalStepDef: StepDefinition = {
        ...mockStepDef,
        condition: {
          depends_on: "step1",
          field: "enable_advanced",
          operator: "equals",
          value: true,
        },
      };
      mockGetStepDefinition.mockReturnValue(conditionalStepDef);
      
      const flowData = {
        step1: { enable_advanced: false },
      };
      const flowWithData = { ...mockFlow, data: flowData };
      mockGetFlowById.mockResolvedValue(flowWithData as any);
      
      const result = await evaluateStepConditions("flow-123", "step1", flowData);
      
      expect(result).toBe(false);
    });
  });
});
