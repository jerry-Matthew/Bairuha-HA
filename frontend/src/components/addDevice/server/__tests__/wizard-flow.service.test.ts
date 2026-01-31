/**
 * Wizard Flow Service Integration Tests
 * 
 * Tests the integration between wizard flow handler and device flow service
 */

import { advanceFlow } from "../deviceFlow.service";
import { createFlow } from "../config-flow.registry";
import { query } from "@/lib/db";
import { getFlowType, getFlowConfig } from "@/lib/config-flow/flow-type-resolver";
import { WizardFlowHandler } from "@/lib/config-flow/handlers/wizard-flow-handler";

// Mock the flow type resolver
jest.mock("@/lib/config-flow/flow-type-resolver");
jest.mock("@/lib/config-flow/flow-handler-registry", () => ({
  getHandler: (flowType: string) => {
    if (flowType === "wizard") {
      return new WizardFlowHandler();
    }
    throw new Error(`Unknown flow type: ${flowType}`);
  },
}));

const mockGetFlowType = getFlowType as jest.MockedFunction<typeof getFlowType>;
const mockGetFlowConfig = getFlowConfig as jest.MockedFunction<typeof getFlowConfig>;

describe("Wizard Flow Service Integration", () => {
  let flowId: string;

  beforeEach(async () => {
    // Create a test flow
    const flow = await createFlow({
      step: "pick_integration",
      data: {},
    });
    flowId = flow.id;

    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test flow
    if (flowId) {
      try {
        await query("DELETE FROM config_flows WHERE id = $1", [flowId]);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  describe("wizard step progression", () => {
    const wizardFlowConfig = {
      steps: [
        {
          step_id: "basic_info",
          title: "Basic Information",
          schema: {
            name: {
              type: "string",
              required: true,
              description: "Device Name",
            },
          },
        },
        {
          step_id: "connection",
          title: "Connection",
          schema: {
            type: {
              type: "string",
              required: true,
              description: "Connection Type",
              enum: ["wifi", "ethernet"],
            },
          },
        },
      ],
    };

    beforeEach(() => {
      mockGetFlowType.mockResolvedValue("wizard");
      mockGetFlowConfig.mockResolvedValue(wizardFlowConfig);
    });

    it("advances from pick_integration to first wizard step", async () => {
      const response = await advanceFlow(
        flowId,
        "test_wizard", // integrationId
        undefined, // selectedDeviceId
        undefined // configData
      );

      expect(response.step).toBe("wizard_step_basic_info");
      expect(response.schema).toBeDefined();
      expect(response.stepTitle).toBe("Basic Information");
      expect(response.stepNumber).toBe(1);
      expect(response.totalSteps).toBe(2);
    });

    it("validates wizard step data and advances to next step", async () => {
      // First, move to wizard step
      await advanceFlow(flowId, "test_wizard");

      // Submit first step data
      const response = await advanceFlow(
        flowId,
        undefined,
        undefined,
        { name: "Test Device" } // stepData for wizard
      );

      expect(response.step).toBe("wizard_step_connection");
      expect(response.stepTitle).toBe("Connection");
      expect(response.stepNumber).toBe(2);
      expect(response.totalSteps).toBe(2);
      expect(response.isLastStep).toBe(true);
    });

    it("returns validation errors for invalid step data", async () => {
      await advanceFlow(flowId, "test_wizard");

      await expect(
        advanceFlow(flowId, undefined, undefined, {}) // Missing required field
      ).rejects.toThrow();
    });

    it("advances to confirm after last wizard step", async () => {
      await advanceFlow(flowId, "test_wizard");
      await advanceFlow(flowId, undefined, undefined, { name: "Test Device" });

      const response = await advanceFlow(
        flowId,
        undefined,
        undefined,
        { type: "wifi" }
      );

      expect(response.step).toBe("confirm");
    });

    it("persists step data across navigation", async () => {
      await advanceFlow(flowId, "test_wizard");
      await advanceFlow(flowId, undefined, undefined, { name: "Test Device" });

      // Check that flow data contains the step data
      const flow = await query(
        "SELECT data FROM config_flows WHERE id = $1",
        [flowId]
      );
      const flowData = flow[0]?.data;

      expect(flowData).toHaveProperty("wizard_step_basic_info");
      expect(flowData.wizard_step_basic_info).toEqual({ name: "Test Device" });
    });
  });

  describe("conditional wizard steps", () => {
    const conditionalFlowConfig = {
      steps: [
        {
          step_id: "basic",
          title: "Basic",
          schema: {
            enable_advanced: {
              type: "boolean",
              required: false,
              description: "Enable Advanced",
            },
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
      ],
    };

    beforeEach(() => {
      mockGetFlowType.mockResolvedValue("wizard");
      mockGetFlowConfig.mockResolvedValue(conditionalFlowConfig);
    });

    it("skips conditional step when condition not met", async () => {
      await advanceFlow(flowId, "test_wizard");

      // Submit basic step without enabling advanced
      const response = await advanceFlow(
        flowId,
        undefined,
        undefined,
        { enable_advanced: false }
      );

      // Should skip advanced step and go to confirm
      expect(response.step).toBe("confirm");
    });

    it("includes conditional step when condition is met", async () => {
      await advanceFlow(flowId, "test_wizard");

      // Submit basic step with advanced enabled
      const response = await advanceFlow(
        flowId,
        undefined,
        undefined,
        { enable_advanced: true }
      );

      // Should include advanced step
      expect(response.step).toBe("wizard_step_advanced");
    });
  });
});
