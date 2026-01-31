/**
 * Hybrid Flow Handler Tests
 */

import { HybridFlowHandler } from "../../handlers/hybrid-flow-handler";
import { getConfigSchema } from "@/components/addDevice/server/integration-config-schemas";
import type { FlowConfig } from "../../../flow-type-resolver";

jest.mock("@/components/addDevice/server/integration-config-schemas");

const mockGetConfigSchema = getConfigSchema as jest.MockedFunction<typeof getConfigSchema>;

describe("HybridFlowHandler", () => {
  let handler: HybridFlowHandler;

  beforeEach(() => {
    handler = new HybridFlowHandler();
    jest.clearAllMocks();
  });

  describe("getInitialStep", () => {
    it("returns discover when discovery protocols are available", async () => {
      const flowConfig: FlowConfig = {
        discovery_protocols: {
          dhcp: [{ hostname: "test-device" }],
        },
      };

      const step = await handler.getInitialStep("test_integration", flowConfig);
      expect(step).toBe("discover");
    });

    it("returns pick_integration when no discovery protocols", async () => {
      const step = await handler.getInitialStep("test_integration", {});
      expect(step).toBe("pick_integration");
    });
  });

  describe("getNextStep", () => {
    it("moves from discover to configure when device selected and schema has fields", async () => {
      mockGetConfigSchema.mockReturnValue({
        api_key: { type: "string", required: true },
      });

      const nextStep = await handler.getNextStep(
        "discover",
        { selectedDeviceId: "device123" },
        "test_integration"
      );

      expect(nextStep).toBe("configure");
    });

    it("moves from discover to pick_integration when no device selected", async () => {
      const nextStep = await handler.getNextStep(
        "discover",
        {},
        "test_integration"
      );

      expect(nextStep).toBe("pick_integration");
    });

    it("moves from pick_integration to oauth_authorize when OAuth provider is set", async () => {
      const flowConfig: FlowConfig = {
        oauth_provider: "google",
      };

      const nextStep = await handler.getNextStep(
        "pick_integration",
        {},
        "test_integration",
        flowConfig
      );

      expect(nextStep).toBe("oauth_authorize");
    });

    it("moves from pick_integration to wizard step when wizard steps are defined", async () => {
      const flowConfig: FlowConfig = {
        steps: [
          { step_id: "step1", title: "Step 1", schema: {} },
        ],
      };

      const nextStep = await handler.getNextStep(
        "pick_integration",
        {},
        "test_integration",
        flowConfig
      );

      expect(nextStep).toBe("wizard_step_step1");
    });

    it("moves from pick_integration to configure when no OAuth or wizard", async () => {
      mockGetConfigSchema.mockReturnValue({
        host: { type: "string", required: true },
      });

      const nextStep = await handler.getNextStep(
        "pick_integration",
        {},
        "test_integration",
        {}
      );

      expect(nextStep).toBe("configure");
    });

    it("moves from oauth_authorize to oauth_callback", async () => {
      const nextStep = await handler.getNextStep(
        "oauth_authorize",
        {},
        "test_integration"
      );

      expect(nextStep).toBe("oauth_callback");
    });

    it("moves from oauth_callback to configure when schema has fields", async () => {
      mockGetConfigSchema.mockReturnValue({
        region: { type: "string", required: true },
      });

      const nextStep = await handler.getNextStep(
        "oauth_callback",
        {},
        "test_integration"
      );

      expect(nextStep).toBe("configure");
    });

    it("moves through wizard steps", async () => {
      const flowConfig: FlowConfig = {
        steps: [
          { step_id: "step1", title: "Step 1", schema: {} },
          { step_id: "step2", title: "Step 2", schema: {} },
        ],
      };

      const nextStep1 = await handler.getNextStep(
        "wizard_step_step1",
        {},
        "test_integration",
        flowConfig
      );

      expect(nextStep1).toBe("wizard_step_step2");

      const nextStep2 = await handler.getNextStep(
        "wizard_step_step2",
        {},
        "test_integration",
        flowConfig
      );

      expect(nextStep2).toBe("confirm");
    });

    it("moves from configure to confirm", async () => {
      const nextStep = await handler.getNextStep(
        "configure",
        {},
        "test_integration"
      );

      expect(nextStep).toBe("confirm");
    });

    it("throws error when flow is already completed", async () => {
      await expect(
        handler.getNextStep("confirm", {}, "test_integration")
      ).rejects.toThrow("Flow already completed");
    });
  });
});
