/**
 * Wizard Flow Handler Tests
 */

import { WizardFlowHandler } from "../../handlers/wizard-flow-handler";
import type { FlowConfig } from "../../flow-type-resolver";

describe("WizardFlowHandler", () => {
  let handler: WizardFlowHandler;

  beforeEach(() => {
    handler = new WizardFlowHandler();
  });

  describe("getInitialStep", () => {
    it("returns pick_integration as initial step", async () => {
      const step = await handler.getInitialStep("test_integration");
      expect(step).toBe("pick_integration");
    });
  });

  describe("getNextStep", () => {
    const flowConfig: FlowConfig = {
      steps: [
        { step_id: "connection", title: "Connection", schema: {} },
        { step_id: "device_selection", title: "Select Devices", schema: {} },
        { step_id: "confirm", title: "Confirm", schema: {} },
      ],
    };

    it("moves from pick_integration to first wizard step", async () => {
      const nextStep = await handler.getNextStep(
        "pick_integration",
        {},
        "test_integration",
        flowConfig
      );

      expect(nextStep).toBe("wizard_step_connection");
    });

    it("moves from pick_integration to confirm when no steps defined", async () => {
      const nextStep = await handler.getNextStep(
        "pick_integration",
        {},
        "test_integration",
        {}
      );

      expect(nextStep).toBe("confirm");
    });

    it("moves to next wizard step", async () => {
      const nextStep = await handler.getNextStep(
        "wizard_step_connection",
        {},
        "test_integration",
        flowConfig
      );

      expect(nextStep).toBe("wizard_step_device_selection");
    });

    it("moves from last wizard step to confirm", async () => {
      const nextStep = await handler.getNextStep(
        "wizard_step_confirm",
        {},
        "test_integration",
        flowConfig
      );

      expect(nextStep).toBe("confirm");
    });

    it("throws error when flow is already completed", async () => {
      await expect(
        handler.getNextStep("confirm", {}, "test_integration", flowConfig)
      ).rejects.toThrow("Flow already completed");
    });

    it("handles invalid wizard step gracefully", async () => {
      await expect(
        handler.getNextStep(
          "wizard_step_invalid",
          {},
          "test_integration",
          flowConfig
        )
      ).rejects.toThrow("Invalid step for wizard flow");
    });
  });

  describe("conditional steps", () => {
    const flowConfigWithConditional: FlowConfig = {
      steps: [
        {
          step_id: "basic",
          title: "Basic",
          schema: {
            enable_advanced: { type: "boolean", required: false },
          },
        },
        {
          step_id: "advanced",
          title: "Advanced",
          schema: {},
          condition: {
            depends_on: "basic",
            field: "enable_advanced",
            operator: "equals",
            value: true,
          },
        },
        {
          step_id: "network",
          title: "Network",
          schema: {},
          condition: {
            depends_on: "basic",
            field: "connection_type",
            operator: "equals",
            value: "ethernet",
          },
        },
      ],
    };

    it("skips conditional step when condition is not met", async () => {
      const flowData = {
        wizard_step_basic: {
          enable_advanced: false,
        },
      };

      const nextStep = await handler.getNextStep(
        "wizard_step_basic",
        flowData,
        "test_integration",
        flowConfigWithConditional
      );

      // Should skip advanced step and go to confirm (no more steps)
      expect(nextStep).toBe("confirm");
    });

    it("includes conditional step when condition is met", async () => {
      const flowData = {
        wizard_step_basic: {
          enable_advanced: true,
        },
      };

      const nextStep = await handler.getNextStep(
        "wizard_step_basic",
        flowData,
        "test_integration",
        flowConfigWithConditional
      );

      expect(nextStep).toBe("wizard_step_advanced");
    });

    it("skips conditional step when dependent step data not found", async () => {
      const nextStep = await handler.getNextStep(
        "pick_integration",
        {},
        "test_integration",
        flowConfigWithConditional
      );

      // Should start with first non-conditional step
      expect(nextStep).toBe("wizard_step_basic");
    });

    it("handles multiple conditional steps correctly", async () => {
      const flowData = {
        wizard_step_basic: {
          enable_advanced: false,
          connection_type: "ethernet",
        },
      };

      const nextStep = await handler.getNextStep(
        "wizard_step_basic",
        flowData,
        "test_integration",
        flowConfigWithConditional
      );

      // Should skip advanced, go to network (ethernet condition met)
      expect(nextStep).toBe("wizard_step_network");
    });

    it("handles condition operators correctly", async () => {
      const flowConfig: FlowConfig = {
        steps: [
          {
            step_id: "test",
            title: "Test",
            schema: {
              value: { type: "string", required: false },
            },
          },
          {
            step_id: "equals",
            title: "Equals",
            schema: {},
            condition: {
              depends_on: "test",
              field: "value",
              operator: "equals",
              value: "test_value",
            },
          },
          {
            step_id: "not_equals",
            title: "Not Equals",
            schema: {},
            condition: {
              depends_on: "test",
              field: "value",
              operator: "not_equals",
              value: "test_value",
            },
          },
          {
            step_id: "exists",
            title: "Exists",
            schema: {},
            condition: {
              depends_on: "test",
              field: "value",
              operator: "exists",
            },
          },
          {
            step_id: "not_exists",
            title: "Not Exists",
            schema: {},
            condition: {
              depends_on: "test",
              field: "value",
              operator: "not_exists",
            },
          },
        ],
      };

      // Test equals
      let nextStep = await handler.getNextStep(
        "wizard_step_test",
        { wizard_step_test: { value: "test_value" } },
        "test_integration",
        flowConfig
      );
      expect(nextStep).toBe("wizard_step_equals");

      // Test not_equals
      nextStep = await handler.getNextStep(
        "wizard_step_test",
        { wizard_step_test: { value: "other_value" } },
        "test_integration",
        flowConfig
      );
      expect(nextStep).toBe("wizard_step_not_equals");

      // Test exists
      nextStep = await handler.getNextStep(
        "wizard_step_test",
        { wizard_step_test: { value: "anything" } },
        "test_integration",
        flowConfig
      );
      // Should skip equals/not_equals and go to exists
      expect(nextStep).toBe("wizard_step_exists");

      // Test not_exists
      nextStep = await handler.getNextStep(
        "wizard_step_test",
        { wizard_step_test: {} },
        "test_integration",
        flowConfig
      );
      // Should skip all others and go to not_exists
      expect(nextStep).toBe("wizard_step_not_exists");
    });
  });

  describe("shouldSkipStep", () => {
    it("returns false for steps without conditions", async () => {
      const flowConfig: FlowConfig = {
        steps: [
          { step_id: "basic", title: "Basic", schema: {} },
        ],
      };

      const shouldSkip = await handler.shouldSkipStep(
        "wizard_step_basic",
        {},
        "test_integration",
        flowConfig
      );

      expect(shouldSkip).toBe(false);
    });

    it("returns true when condition is not met", async () => {
      const flowConfig: FlowConfig = {
        steps: [
          {
            step_id: "conditional",
            title: "Conditional",
            schema: {},
            condition: {
              depends_on: "basic",
              field: "enabled",
              operator: "equals",
              value: true,
            },
          },
        ],
      };

      const shouldSkip = await handler.shouldSkipStep(
        "wizard_step_conditional",
        { wizard_step_basic: { enabled: false } },
        "test_integration",
        flowConfig
      );

      expect(shouldSkip).toBe(true);
    });

    it("returns false when condition is met", async () => {
      const flowConfig: FlowConfig = {
        steps: [
          {
            step_id: "conditional",
            title: "Conditional",
            schema: {},
            condition: {
              depends_on: "basic",
              field: "enabled",
              operator: "equals",
              value: true,
            },
          },
        ],
      };

      const shouldSkip = await handler.shouldSkipStep(
        "wizard_step_conditional",
        { wizard_step_basic: { enabled: true } },
        "test_integration",
        flowConfig
      );

      expect(shouldSkip).toBe(false);
    });
  });

  describe("validateStepData", () => {
    it("returns valid for empty schema", async () => {
      const flowConfig: FlowConfig = {
        steps: [
          { step_id: "test", title: "Test", schema: {} },
        ],
      };

      const result = await handler.validateStepData(
        "wizard_step_test",
        {},
        "test_integration",
        flowConfig
      );

      expect(result.valid).toBe(true);
    });

    it("validates required fields", async () => {
      const flowConfig: FlowConfig = {
        steps: [
          {
            step_id: "test",
            title: "Test",
            schema: {
              name: {
                type: "string",
                required: true,
                description: "Name",
              },
            },
          },
        ],
      };

      const result = await handler.validateStepData(
        "wizard_step_test",
        {},
        "test_integration",
        flowConfig
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty("name");
    });

    it("validates field types", async () => {
      const flowConfig: FlowConfig = {
        steps: [
          {
            step_id: "test",
            title: "Test",
            schema: {
              name: {
                type: "string",
                required: true,
                description: "Name",
              },
              age: {
                type: "number",
                required: true,
                description: "Age",
              },
              active: {
                type: "boolean",
                required: true,
                description: "Active",
              },
            },
          },
        ],
      };

      const result = await handler.validateStepData(
        "wizard_step_test",
        {
          name: 123, // Wrong type
          age: "not a number", // Wrong type
          active: "not a boolean", // Wrong type
        },
        "test_integration",
        flowConfig
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty("name");
      expect(result.errors).toHaveProperty("age");
      expect(result.errors).toHaveProperty("active");
    });

    it("validates number ranges", async () => {
      const flowConfig: FlowConfig = {
        steps: [
          {
            step_id: "test",
            title: "Test",
            schema: {
              port: {
                type: "number",
                required: true,
                description: "Port",
                min: 1,
                max: 65535,
              },
            },
          },
        ],
      };

      let result = await handler.validateStepData(
        "wizard_step_test",
        { port: 0 },
        "test_integration",
        flowConfig
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty("port");

      result = await handler.validateStepData(
        "wizard_step_test",
        { port: 65536 },
        "test_integration",
        flowConfig
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty("port");

      result = await handler.validateStepData(
        "wizard_step_test",
        { port: 8080 },
        "test_integration",
        flowConfig
      );
      expect(result.valid).toBe(true);
    });

    it("validates enum values", async () => {
      const flowConfig: FlowConfig = {
        steps: [
          {
            step_id: "test",
            title: "Test",
            schema: {
              type: {
                type: "string",
                required: true,
                description: "Type",
                enum: ["wifi", "ethernet", "usb"],
              },
            },
          },
        ],
      };

      let result = await handler.validateStepData(
        "wizard_step_test",
        { type: "invalid" },
        "test_integration",
        flowConfig
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty("type");

      result = await handler.validateStepData(
        "wizard_step_test",
        { type: "wifi" },
        "test_integration",
        flowConfig
      );
      expect(result.valid).toBe(true);
    });

    it("returns error when step not found", async () => {
      const flowConfig: FlowConfig = {
        steps: [
          { step_id: "other", title: "Other", schema: {} },
        ],
      };

      const result = await handler.validateStepData(
        "wizard_step_invalid",
        {},
        "test_integration",
        flowConfig
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveProperty("_general");
    });
  });

  describe("getStepMetadata", () => {
    it("returns step metadata when step exists", () => {
      const flowConfig: FlowConfig = {
        steps: [
          {
            step_id: "test",
            title: "Test Step",
            description: "Test Description",
            schema: { field: { type: "string" } },
          },
        ],
      };

      const metadata = handler.getStepMetadata("test", flowConfig);

      expect(metadata).not.toBeNull();
      expect(metadata?.stepId).toBe("test");
      expect(metadata?.title).toBe("Test Step");
      expect(metadata?.description).toBe("Test Description");
      expect(metadata?.stepNumber).toBe(1);
      expect(metadata?.totalSteps).toBe(1);
    });

    it("returns null when step not found", () => {
      const flowConfig: FlowConfig = {
        steps: [
          { step_id: "other", title: "Other", schema: {} },
        ],
      };

      const metadata = handler.getStepMetadata("test", flowConfig);

      expect(metadata).toBeNull();
    });
  });

  describe("isLastWizardStep", () => {
    it("returns true for last step", () => {
      const flowConfig: FlowConfig = {
        steps: [
          { step_id: "step1", title: "Step 1", schema: {} },
          { step_id: "step2", title: "Step 2", schema: {} },
        ],
      };

      const isLast = handler.isLastWizardStep("wizard_step_step2", flowConfig);
      expect(isLast).toBe(true);
    });

    it("returns false for non-last step", () => {
      const flowConfig: FlowConfig = {
        steps: [
          { step_id: "step1", title: "Step 1", schema: {} },
          { step_id: "step2", title: "Step 2", schema: {} },
        ],
      };

      const isLast = handler.isLastWizardStep("wizard_step_step1", flowConfig);
      expect(isLast).toBe(false);
    });
  });

  describe("getWizardStepsWithStatus", () => {
    it("returns steps with completion status", () => {
      const flowConfig: FlowConfig = {
        steps: [
          { step_id: "step1", title: "Step 1", schema: {} },
          { step_id: "step2", title: "Step 2", schema: {} },
        ],
      };

      const flowData = {
        wizard_step_step1: { field1: "value1" },
      };

      const stepsWithStatus = handler.getWizardStepsWithStatus(flowData, flowConfig);

      expect(stepsWithStatus).toHaveLength(2);
      expect(stepsWithStatus[0].completed).toBe(true);
      expect(stepsWithStatus[0].visible).toBe(true);
      expect(stepsWithStatus[1].completed).toBe(false);
      expect(stepsWithStatus[1].visible).toBe(true);
    });

    it("respects conditional step visibility", () => {
      const flowConfig: FlowConfig = {
        steps: [
          {
            step_id: "step1",
            title: "Step 1",
            schema: {},
          },
          {
            step_id: "step2",
            title: "Step 2",
            schema: {},
            condition: {
              depends_on: "step1",
              field: "enabled",
              operator: "equals",
              value: true,
            },
          },
        ],
      };

      let stepsWithStatus = handler.getWizardStepsWithStatus(
        { wizard_step_step1: { enabled: false } },
        flowConfig
      );
      expect(stepsWithStatus[1].visible).toBe(false);

      stepsWithStatus = handler.getWizardStepsWithStatus(
        { wizard_step_step1: { enabled: true } },
        flowConfig
      );
      expect(stepsWithStatus[1].visible).toBe(true);
    });
  });
});
