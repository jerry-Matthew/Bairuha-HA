/**
 * Manual Flow Handler Tests
 */

import { ManualFlowHandler } from "../../handlers/manual-flow-handler";
import { getConfigSchema } from "@/components/addDevice/server/integration-config-schemas";

jest.mock("@/components/addDevice/server/integration-config-schemas");

const mockGetConfigSchema = getConfigSchema as jest.MockedFunction<typeof getConfigSchema>;

describe("ManualFlowHandler", () => {
  let handler: ManualFlowHandler;

  beforeEach(() => {
    handler = new ManualFlowHandler();
    jest.clearAllMocks();
  });

  describe("getInitialStep", () => {
    it("returns pick_integration as initial step", async () => {
      const step = await handler.getInitialStep("test_integration");
      expect(step).toBe("pick_integration");
    });
  });

  describe("getNextStep", () => {
    it("moves from pick_integration to configure when schema has fields", async () => {
      mockGetConfigSchema.mockReturnValue({
        host: { type: "string", required: true },
        port: { type: "number", required: false },
      });

      const nextStep = await handler.getNextStep(
        "pick_integration",
        {},
        "test_integration"
      );

      expect(nextStep).toBe("configure");
    });

    it("moves from pick_integration to confirm when schema is empty", async () => {
      mockGetConfigSchema.mockReturnValue({});

      const nextStep = await handler.getNextStep(
        "pick_integration",
        {},
        "test_integration"
      );

      expect(nextStep).toBe("confirm");
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

    it("throws error for invalid step", async () => {
      await expect(
        handler.getNextStep("discover" as any, {}, "test_integration")
      ).rejects.toThrow("Invalid step for manual flow");
    });
  });

  describe("shouldSkipStep", () => {
    it("skips configure step when schema is empty", async () => {
      mockGetConfigSchema.mockReturnValue({});

      const shouldSkip = await handler.shouldSkipStep(
        "configure",
        {},
        "test_integration"
      );

      expect(shouldSkip).toBe(true);
    });

    it("does not skip configure step when schema has fields", async () => {
      mockGetConfigSchema.mockReturnValue({
        api_key: { type: "string", required: true },
      });

      const shouldSkip = await handler.shouldSkipStep(
        "configure",
        {},
        "test_integration"
      );

      expect(shouldSkip).toBe(false);
    });

    it("does not skip other steps", async () => {
      const shouldSkip = await handler.shouldSkipStep(
        "pick_integration",
        {},
        "test_integration"
      );

      expect(shouldSkip).toBe(false);
    });
  });
});
