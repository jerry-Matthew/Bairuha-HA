/**
 * None Flow Handler Tests
 */

import { NoneFlowHandler } from "../../handlers/none-flow-handler";

describe("NoneFlowHandler", () => {
  let handler: NoneFlowHandler;

  beforeEach(() => {
    handler = new NoneFlowHandler();
  });

  describe("getInitialStep", () => {
    it("returns pick_integration as initial step", async () => {
      const step = await handler.getInitialStep("test_integration");
      expect(step).toBe("pick_integration");
    });
  });

  describe("getNextStep", () => {
    it("moves from pick_integration directly to confirm", async () => {
      const nextStep = await handler.getNextStep(
        "pick_integration",
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
        handler.getNextStep("configure" as any, {}, "test_integration")
      ).rejects.toThrow("Invalid step for none flow");
    });
  });

  describe("shouldSkipStep", () => {
    it("skips configure step", async () => {
      const shouldSkip = await handler.shouldSkipStep(
        "configure",
        {},
        "test_integration"
      );

      expect(shouldSkip).toBe(true);
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
