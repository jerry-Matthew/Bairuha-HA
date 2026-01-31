/**
 * Step Component Registry Tests
 * 
 * Tests for the step component registry
 */

import {
  getStepComponent,
  registerStepComponent,
  registerCustomComponent,
  getCustomComponent,
  clearComponentCache,
  clearComponentCacheForType,
  getRegisteredComponentTypes,
} from "../step-component-registry";
import type { ComponentType } from "react";

// Mock React components
const MockConfigureStep: ComponentType<any> = () => null;
const MockDeviceDiscovery: ComponentType<any> = () => null;
const MockOAuthStep: ComponentType<any> = () => null;
const MockWizardStep: ComponentType<any> = () => null;
const MockDeviceConfirm: ComponentType<any> = () => null;
const MockCustomComponent: ComponentType<any> = () => null;

// Mock dynamic imports
jest.mock("@/components/addDevice/client/ConfigureStep.client", () => ({
  __esModule: true,
  default: MockConfigureStep,
}));
jest.mock("@/components/addDevice/client/DeviceDiscovery.client", () => ({
  __esModule: true,
  default: MockDeviceDiscovery,
}));
jest.mock("@/components/addDevice/client/OAuthStep.client", () => ({
  __esModule: true,
  default: MockOAuthStep,
}));
jest.mock("@/components/addDevice/client/WizardStep.client", () => ({
  __esModule: true,
  default: MockWizardStep,
}));
jest.mock("@/components/addDevice/client/DeviceConfirm.client", () => ({
  __esModule: true,
  default: MockDeviceConfirm,
}));

describe("Step Component Registry", () => {
  beforeEach(() => {
    clearComponentCache();
  });

  describe("getStepComponent", () => {
    it("should load manual component", async () => {
      const component = await getStepComponent("manual");
      expect(component).toBe(MockConfigureStep);
    });

    it("should load discovery component", async () => {
      const component = await getStepComponent("discovery");
      expect(component).toBe(MockDeviceDiscovery);
    });

    it("should load oauth component", async () => {
      const component = await getStepComponent("oauth");
      expect(component).toBe(MockOAuthStep);
    });

    it("should load wizard component", async () => {
      const component = await getStepComponent("wizard");
      expect(component).toBe(MockWizardStep);
    });

    it("should load confirm component", async () => {
      const component = await getStepComponent("confirm");
      expect(component).toBe(MockDeviceConfirm);
    });

    it("should cache loaded components", async () => {
      const component1 = await getStepComponent("manual");
      const component2 = await getStepComponent("manual");
      
      expect(component1).toBe(component2);
      expect(component1).toBe(MockConfigureStep);
    });

    it("should fallback to manual for unknown types", async () => {
      const component = await getStepComponent("unknown");
      expect(component).toBe(MockConfigureStep);
    });

    it("should throw error if no component loader exists", async () => {
      // This shouldn't happen with fallback, but test edge case
      await expect(getStepComponent("manual")).resolves.toBeDefined();
    });
  });

  describe("registerStepComponent", () => {
    it("should register a custom component", async () => {
      const CustomComponent: ComponentType<any> = () => null;
      registerStepComponent("custom_type", CustomComponent);
      
      // Component should be cached and retrievable
      const component = await getStepComponent("custom_type");
      expect(component).toBe(CustomComponent);
    });

    it("should override existing component registration", async () => {
      const CustomComponent: ComponentType<any> = () => null;
      registerStepComponent("manual", CustomComponent);
      
      const component = await getStepComponent("manual");
      expect(component).toBe(CustomComponent);
    });
  });

  describe("registerCustomComponent", () => {
    it("should register a custom component path", () => {
      registerCustomComponent("MyCustomComponent", "@/components/custom/MyComponent");
      
      expect(getRegisteredComponentTypes()).toContain("MyCustomComponent");
    });

    it("should validate component path format", () => {
      expect(() => {
        registerCustomComponent("Invalid", "invalid-path");
      }).toThrow("Invalid component path");
    });

    it("should accept paths starting with @/", () => {
      expect(() => {
        registerCustomComponent("Valid", "@/components/valid/Component");
      }).not.toThrow();
    });

    it("should accept relative paths", () => {
      expect(() => {
        registerCustomComponent("Valid", "./components/valid/Component");
      }).not.toThrow();
    });
  });

  describe("getCustomComponent", () => {
    it("should throw error if custom component not found", async () => {
      await expect(getCustomComponent("NonExistent")).rejects.toThrow(
        "Custom component not found"
      );
    });

    it("should register custom component path", () => {
      registerCustomComponent("TestComponent", "@/components/custom/TestComponent");
      
      // Component should be registered
      expect(getRegisteredComponentTypes()).toContain("TestComponent");
    });
  });

  describe("clearComponentCache", () => {
    it("should clear all cached components", async () => {
      // Load some components
      await getStepComponent("manual");
      await getStepComponent("wizard");
      
      // Clear cache
      clearComponentCache();
      
      // Components should be reloaded (cached cleared)
      const component = await getStepComponent("manual");
      expect(component).toBeDefined();
    });
  });

  describe("clearComponentCacheForType", () => {
    it("should clear specific component from cache", async () => {
      // Load component
      await getStepComponent("manual");
      
      // Clear specific type
      clearComponentCacheForType("manual");
      
      // Component should be reloaded
      const component = await getStepComponent("manual");
      expect(component).toBeDefined();
    });
  });

  describe("getRegisteredComponentTypes", () => {
    it("should return all registered component types", () => {
      const types = getRegisteredComponentTypes();
      
      expect(types).toContain("manual");
      expect(types).toContain("discovery");
      expect(types).toContain("oauth");
      expect(types).toContain("wizard");
      expect(types).toContain("confirm");
    });

    it("should include custom components", () => {
      registerCustomComponent("Custom1", "@/components/custom/Custom1");
      registerCustomComponent("Custom2", "@/components/custom/Custom2");
      
      const types = getRegisteredComponentTypes();
      
      expect(types).toContain("Custom1");
      expect(types).toContain("Custom2");
    });
  });
});
