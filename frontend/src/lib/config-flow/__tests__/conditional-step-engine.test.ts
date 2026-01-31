/**
 * Conditional Step Engine Tests
 * 
 * Tests for the conditional step logic engine
 */

import {
  evaluateStepCondition,
  shouldSkipStep,
  determineNextStep,
  getVisibleSteps,
} from "../conditional-step-engine";
import type { FlowDefinition, StepCondition } from "../flow-definition.types";

describe("Conditional Step Engine", () => {
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
          properties: {},
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
          field: "enable_advanced",
          operator: "equals",
          value: true,
        },
      },
      {
        step_id: "step3",
        step_type: "wizard",
        title: "Step 3",
        schema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };

  describe("evaluateStepCondition", () => {
    it("should evaluate equals condition correctly", () => {
      const condition: StepCondition = {
        depends_on: "step1",
        field: "enable_advanced",
        operator: "equals",
        value: true,
      };
      const flowData = {
        step1: { enable_advanced: true },
      };
      expect(evaluateStepCondition(condition, flowData, mockDefinition)).toBe(true);
    });

    it("should evaluate not_equals condition correctly", () => {
      const condition: StepCondition = {
        depends_on: "step1",
        field: "enable_advanced",
        operator: "not_equals",
        value: true,
      };
      const flowData = {
        step1: { enable_advanced: false },
      };
      expect(evaluateStepCondition(condition, flowData, mockDefinition)).toBe(true);
    });

    it("should evaluate contains condition correctly", () => {
      const condition: StepCondition = {
        depends_on: "step1",
        field: "options",
        operator: "contains",
        value: "option1",
      };
      const flowData = {
        step1: { options: ["option1", "option2"] },
      };
      expect(evaluateStepCondition(condition, flowData, mockDefinition)).toBe(true);
    });

    it("should evaluate greater_than condition correctly", () => {
      const condition: StepCondition = {
        depends_on: "step1",
        field: "count",
        operator: "greater_than",
        value: 5,
      };
      const flowData = {
        step1: { count: 10 },
      };
      expect(evaluateStepCondition(condition, flowData, mockDefinition)).toBe(true);
    });

    it("should evaluate less_than condition correctly", () => {
      const condition: StepCondition = {
        depends_on: "step1",
        field: "count",
        operator: "less_than",
        value: 5,
      };
      const flowData = {
        step1: { count: 3 },
      };
      expect(evaluateStepCondition(condition, flowData, mockDefinition)).toBe(true);
    });

    it("should evaluate exists condition correctly", () => {
      const condition: StepCondition = {
        depends_on: "step1",
        field: "value",
        operator: "exists",
      };
      const flowData = {
        step1: { value: "something" },
      };
      expect(evaluateStepCondition(condition, flowData, mockDefinition)).toBe(true);
    });

    it("should evaluate not_exists condition correctly", () => {
      const condition: StepCondition = {
        depends_on: "step1",
        field: "missing_value",
        operator: "not_exists",
      };
      const flowData = {
        step1: { value: "something" },
      };
      expect(evaluateStepCondition(condition, flowData, mockDefinition)).toBe(true);
    });

    it("should evaluate in condition correctly", () => {
      const condition: StepCondition = {
        depends_on: "step1",
        field: "value",
        operator: "in",
        value: ["option1", "option2", "option3"],
      };
      const flowData = {
        step1: { value: "option2" },
      };
      expect(evaluateStepCondition(condition, flowData, mockDefinition)).toBe(true);
    });

    it("should evaluate not_in condition correctly", () => {
      const condition: StepCondition = {
        depends_on: "step1",
        field: "value",
        operator: "not_in",
        value: ["option1", "option2"],
      };
      const flowData = {
        step1: { value: "option3" },
      };
      expect(evaluateStepCondition(condition, flowData, mockDefinition)).toBe(true);
    });

    it("should handle nested conditions with AND logic", () => {
      const condition: StepCondition = {
        depends_on: "step1",
        operator: "equals",
        value: true,
        logic: "and",
        conditions: [
          {
            depends_on: "step1",
            field: "field1",
            operator: "equals",
            value: "value1",
          },
          {
            depends_on: "step1",
            field: "field2",
            operator: "equals",
            value: "value2",
          },
        ],
      };
      const flowData = {
        step1: { field1: "value1", field2: "value2" },
      };
      expect(evaluateStepCondition(condition, flowData, mockDefinition)).toBe(true);
    });

    it("should handle nested conditions with OR logic", () => {
      const condition: StepCondition = {
        depends_on: "step1",
        operator: "equals",
        value: true,
        logic: "or",
        conditions: [
          {
            depends_on: "step1",
            field: "field1",
            operator: "equals",
            value: "value1",
          },
          {
            depends_on: "step1",
            field: "field2",
            operator: "equals",
            value: "value2",
          },
        ],
      };
      const flowData = {
        step1: { field1: "wrong", field2: "value2" },
      };
      expect(evaluateStepCondition(condition, flowData, mockDefinition)).toBe(true);
    });

    it("should handle wizard_step_ prefix in flowData", () => {
      const condition: StepCondition = {
        depends_on: "step1",
        field: "enable_advanced",
        operator: "equals",
        value: true,
      };
      const flowData = {
        wizard_step_step1: { enable_advanced: true },
      };
      expect(evaluateStepCondition(condition, flowData, mockDefinition)).toBe(true);
    });
  });

  describe("shouldSkipStep", () => {
    it("should not skip step without condition", () => {
      const step = mockDefinition.steps[0];
      const flowData = {};
      expect(shouldSkipStep(step, flowData, mockDefinition)).toBe(false);
    });

    it("should skip step when condition is false", () => {
      const step = mockDefinition.steps[1];
      const flowData = {
        step1: { enable_advanced: false },
      };
      expect(shouldSkipStep(step, flowData, mockDefinition)).toBe(true);
    });

    it("should not skip step when condition is true", () => {
      const step = mockDefinition.steps[1];
      const flowData = {
        step1: { enable_advanced: true },
      };
      expect(shouldSkipStep(step, flowData, mockDefinition)).toBe(false);
    });
  });

  describe("determineNextStep", () => {
    it("should return next step when no conditions", () => {
      const flowData = {
        step1: { value: "test" },
      };
      const nextStep = determineNextStep(mockDefinition, "step1", flowData);
      expect(nextStep).toBe("step3"); // step2 is skipped because condition is false
    });

    it("should skip conditional step when condition is false", () => {
      const flowData = {
        step1: { enable_advanced: false },
      };
      const nextStep = determineNextStep(mockDefinition, "step1", flowData);
      expect(nextStep).toBe("step3"); // step2 skipped
    });

    it("should include conditional step when condition is true", () => {
      const flowData = {
        step1: { enable_advanced: true },
      };
      const nextStep = determineNextStep(mockDefinition, "step1", flowData);
      expect(nextStep).toBe("step2");
    });

    it("should return null when at last step", () => {
      const flowData = {};
      const nextStep = determineNextStep(mockDefinition, "step3", flowData);
      expect(nextStep).toBeNull();
    });

    it("should use explicit next_step if specified", () => {
      const definitionWithNextStep: FlowDefinition = {
        ...mockDefinition,
        steps: [
          {
            ...mockDefinition.steps[0],
            navigation: {
              next_step: "step3",
            },
          },
          ...mockDefinition.steps.slice(1),
        ],
      };
      const flowData = {};
      const nextStep = determineNextStep(definitionWithNextStep, "step1", flowData);
      expect(nextStep).toBe("step3");
    });
  });

  describe("getVisibleSteps", () => {
    it("should return all steps when no conditions", () => {
      const simpleDefinition: FlowDefinition = {
        ...mockDefinition,
        steps: [mockDefinition.steps[0], mockDefinition.steps[2]],
      };
      const flowData = {};
      const visibleSteps = getVisibleSteps(simpleDefinition, flowData);
      expect(visibleSteps).toEqual(["step1", "step3"]);
    });

    it("should filter out steps based on conditions", () => {
      const flowData = {
        step1: { enable_advanced: false },
      };
      const visibleSteps = getVisibleSteps(mockDefinition, flowData);
      expect(visibleSteps).toEqual(["step1", "step3"]); // step2 filtered out
    });

    it("should include conditional steps when conditions are met", () => {
      const flowData = {
        step1: { enable_advanced: true },
      };
      const visibleSteps = getVisibleSteps(mockDefinition, flowData);
      expect(visibleSteps).toEqual(["step1", "step2", "step3"]);
    });
  });
});
