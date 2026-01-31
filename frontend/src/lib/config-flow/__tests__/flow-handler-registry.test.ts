/**
 * Flow Handler Registry Tests
 * 
 * Tests for the flow handler registry
 */

import {
  getHandler,
  registerHandler,
  getRegisteredFlowTypes,
} from "../flow-handler-registry";
import { ManualFlowHandler } from "../handlers/manual-flow-handler";
import { DiscoveryFlowHandler } from "../handlers/discovery-flow-handler";
import { OAuthFlowHandler } from "../handlers/oauth-flow-handler";
import { WizardFlowHandler } from "../handlers/wizard-flow-handler";
import { NoneFlowHandler } from "../handlers/none-flow-handler";
import { HybridFlowHandler } from "../handlers/hybrid-flow-handler";
import type { FlowHandler } from "../flow-handlers";

describe("Flow Handler Registry", () => {
  describe("getHandler", () => {
    it("returns manual handler for manual flow type", () => {
      const handler = getHandler("manual");
      expect(handler).toBeInstanceOf(ManualFlowHandler);
    });

    it("returns discovery handler for discovery flow type", () => {
      const handler = getHandler("discovery");
      expect(handler).toBeInstanceOf(DiscoveryFlowHandler);
    });

    it("returns OAuth handler for oauth flow type", () => {
      const handler = getHandler("oauth");
      expect(handler).toBeInstanceOf(OAuthFlowHandler);
    });

    it("returns wizard handler for wizard flow type", () => {
      const handler = getHandler("wizard");
      expect(handler).toBeInstanceOf(WizardFlowHandler);
    });

    it("returns none handler for none flow type", () => {
      const handler = getHandler("none");
      expect(handler).toBeInstanceOf(NoneFlowHandler);
    });

    it("returns hybrid handler for hybrid flow type", () => {
      const handler = getHandler("hybrid");
      expect(handler).toBeInstanceOf(HybridFlowHandler);
    });

    it("falls back to manual handler for unknown flow type", () => {
      // @ts-expect-error - Testing invalid flow type
      const handler = getHandler("unknown");
      expect(handler).toBeInstanceOf(ManualFlowHandler);
    });
  });

  describe("registerHandler", () => {
    it("registers a custom handler", () => {
      const customHandler: FlowHandler = {
        getInitialStep: jest.fn().mockResolvedValue("pick_integration"),
        getNextStep: jest.fn().mockResolvedValue("confirm"),
        shouldSkipStep: jest.fn().mockResolvedValue(false),
        validateStepData: jest.fn().mockResolvedValue({ valid: true }),
      };

      registerHandler("manual", customHandler);

      const handler = getHandler("manual");
      expect(handler).toBe(customHandler);
    });

    it("overrides existing handler", () => {
      const originalHandler = getHandler("manual");
      const customHandler: FlowHandler = {
        getInitialStep: jest.fn().mockResolvedValue("pick_integration"),
        getNextStep: jest.fn().mockResolvedValue("confirm"),
        shouldSkipStep: jest.fn().mockResolvedValue(false),
        validateStepData: jest.fn().mockResolvedValue({ valid: true }),
      };

      registerHandler("manual", customHandler);

      const handler = getHandler("manual");
      expect(handler).toBe(customHandler);
      expect(handler).not.toBe(originalHandler);
    });
  });

  describe("getRegisteredFlowTypes", () => {
    it("returns all registered flow types", () => {
      const flowTypes = getRegisteredFlowTypes();

      expect(flowTypes).toContain("none");
      expect(flowTypes).toContain("manual");
      expect(flowTypes).toContain("discovery");
      expect(flowTypes).toContain("oauth");
      expect(flowTypes).toContain("wizard");
      expect(flowTypes).toContain("hybrid");
      expect(flowTypes.length).toBe(6);
    });
  });
});
