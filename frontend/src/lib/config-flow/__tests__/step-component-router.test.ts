/**
 * Step Component Router Tests
 * 
 * Tests for the step component router
 */

import {
  routeToStepComponent,
  resolveComponentPath,
} from "../step-component-router";
import { getStepComponent, getCustomComponent } from "../step-component-registry";
import type { StepComponentInfo } from "../step-resolver";

// Mock dependencies
jest.mock("../step-component-registry");

const mockGetStepComponent = getStepComponent as jest.MockedFunction<
  typeof getStepComponent
>;
const mockGetCustomComponent = getCustomComponent as jest.MockedFunction<
  typeof getCustomComponent
>;

describe("Step Component Router", () => {
  const MockComponent: any = () => null;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("routeToStepComponent", () => {
    it("should route to standard component type", async () => {
      mockGetStepComponent.mockResolvedValue(MockComponent);
      
      const componentInfo: StepComponentInfo = {
        componentType: "manual",
        stepDefinition: {} as any,
        stepMetadata: {} as any,
        props: {},
      };
      
      const component = await routeToStepComponent(componentInfo);
      
      expect(component).toBe(MockComponent);
      expect(mockGetStepComponent).toHaveBeenCalledWith("manual");
    });

    it("should route to custom component", async () => {
      mockGetCustomComponent.mockResolvedValue(MockComponent);
      
      const componentInfo: StepComponentInfo = {
        componentType: "custom",
        componentName: "CustomComponent",
        stepDefinition: {} as any,
        stepMetadata: {} as any,
        props: {},
      };
      
      const component = await routeToStepComponent(componentInfo);
      
      expect(component).toBe(MockComponent);
      expect(mockGetCustomComponent).toHaveBeenCalledWith("CustomComponent");
    });

    it("should route wizard step to wizard component", async () => {
      mockGetStepComponent.mockResolvedValue(MockComponent);
      
      const componentInfo: StepComponentInfo = {
        componentType: "wizard",
        stepDefinition: {} as any,
        stepMetadata: {} as any,
        props: {},
      };
      
      const component = await routeToStepComponent(componentInfo);
      
      expect(component).toBe(MockComponent);
      expect(mockGetStepComponent).toHaveBeenCalledWith("wizard");
    });

    it("should route discovery step to discovery component", async () => {
      mockGetStepComponent.mockResolvedValue(MockComponent);
      
      const componentInfo: StepComponentInfo = {
        componentType: "discovery",
        stepDefinition: {} as any,
        stepMetadata: {} as any,
        props: {},
      };
      
      const component = await routeToStepComponent(componentInfo);
      
      expect(component).toBe(MockComponent);
      expect(mockGetStepComponent).toHaveBeenCalledWith("discovery");
    });

    it("should route oauth step to oauth component", async () => {
      mockGetStepComponent.mockResolvedValue(MockComponent);
      
      const componentInfo: StepComponentInfo = {
        componentType: "oauth",
        stepDefinition: {} as any,
        stepMetadata: {} as any,
        props: {},
      };
      
      const component = await routeToStepComponent(componentInfo);
      
      expect(component).toBe(MockComponent);
      expect(mockGetStepComponent).toHaveBeenCalledWith("oauth");
    });
  });

  describe("resolveComponentPath", () => {
    it("should resolve standard component paths", () => {
      expect(resolveComponentPath("manual")).toBe(
        "@/components/addDevice/client/ConfigureStep.client"
      );
      expect(resolveComponentPath("discovery")).toBe(
        "@/components/addDevice/client/DeviceDiscovery.client"
      );
      expect(resolveComponentPath("oauth")).toBe(
        "@/components/addDevice/client/OAuthStep.client"
      );
      expect(resolveComponentPath("wizard")).toBe(
        "@/components/addDevice/client/WizardStep.client"
      );
      expect(resolveComponentPath("confirm")).toBe(
        "@/components/addDevice/client/DeviceConfirm.client"
      );
    });

    it("should resolve custom component paths", () => {
      const path = resolveComponentPath("custom", "MyCustomComponent");
      expect(path).toBe("@/components/custom/MyCustomComponent");
    });

    it("should fallback to manual for unknown types", () => {
      const path = resolveComponentPath("unknown");
      expect(path).toBe("@/components/addDevice/client/ConfigureStep.client");
    });
  });
});
