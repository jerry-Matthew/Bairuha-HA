/**
 * Dynamic Step Renderer Component Tests
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { DynamicStepRenderer } from "../DynamicStepRenderer.client";
import { routeToStepComponent } from "@/lib/config-flow/step-component-router";
import type { StepComponentInfo } from "@/lib/config-flow/step-resolver";

// Mock dependencies
jest.mock("@/lib/config-flow/step-component-router");

const mockRouteToStepComponent = routeToStepComponent as jest.MockedFunction<
  typeof routeToStepComponent
>;

// Mock step components
const MockConfigureStep = jest.fn(() => <div>Configure Step</div>);
const MockWizardStep = jest.fn(() => <div>Wizard Step</div>);
const MockDeviceDiscovery = jest.fn(() => <div>Device Discovery</div>);
const MockOAuthStep = jest.fn(() => <div>OAuth Step</div>);
const MockDeviceConfirm = jest.fn(() => <div>Device Confirm</div>);

// Mock Material-UI components
jest.mock("@mui/material", () => {
  const actual = jest.requireActual("@mui/material");
  return {
    ...actual,
  };
});

describe("DynamicStepRenderer", () => {
  const mockStepComponentInfo: StepComponentInfo = {
    componentType: "wizard",
    stepDefinition: {
      step_id: "step1",
      step_type: "wizard",
      title: "Step 1",
      schema: {
        type: "object",
        properties: {
          value: {
            type: "string",
            title: "Value",
          },
        },
      },
    } as any,
    stepMetadata: {
      stepId: "step1",
      title: "Step 1",
      stepNumber: 1,
      totalSteps: 3,
      canGoBack: false,
      canSkip: false,
      isLastStep: false,
    },
    props: {},
  };

  const defaultProps = {
    flowId: "flow-123",
    stepId: "step1",
    onStepComplete: jest.fn(),
    onStepBack: jest.fn(),
    onFlowCancel: jest.fn(),
    flowData: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch for component info API
    global.fetch = jest.fn((url: string) => {
      if (url.includes("/step/")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStepComponentInfo),
        } as Response);
      }
      return Promise.reject(new Error("Unknown URL"));
    }) as jest.Mock;
  });

  it("should render loading state initially", () => {
    render(<DynamicStepRenderer {...defaultProps} />);
    
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should load and render component", async () => {
    mockRouteToStepComponent.mockResolvedValue(MockWizardStep as any);
    
    render(<DynamicStepRenderer {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText("Wizard Step")).toBeInTheDocument();
    });
    
    expect(mockRouteToStepComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        componentType: "wizard",
      })
    );
  });

  it("should handle errors when loading step info", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        statusText: "Not Found",
      } as Response)
    ) as jest.Mock;
    
    render(<DynamicStepRenderer {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load step info/i)).toBeInTheDocument();
    });
  });

  it("should handle errors when loading component", async () => {
    mockRouteToStepComponent.mockRejectedValue(new Error("Component not found"));
    
    render(<DynamicStepRenderer {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Component not found/i)).toBeInTheDocument();
    });
  });

  it("should use preloaded component info if provided", async () => {
    mockRouteToStepComponent.mockResolvedValue(MockWizardStep as any);
    
    render(
      <DynamicStepRenderer
        {...defaultProps}
        componentInfo={mockStepComponentInfo}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText("Wizard Step")).toBeInTheDocument();
    });
    
    // Should not call fetch if componentInfo is provided
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should render manual component", async () => {
    const manualInfo: StepComponentInfo = {
      ...mockStepComponentInfo,
      componentType: "manual",
    };
    
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(manualInfo),
      } as Response)
    ) as jest.Mock;
    
    mockRouteToStepComponent.mockResolvedValue(MockConfigureStep as any);
    
    render(<DynamicStepRenderer {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockRouteToStepComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          componentType: "manual",
        })
      );
    });
  });

  it("should render discovery component", async () => {
    const discoveryInfo: StepComponentInfo = {
      ...mockStepComponentInfo,
      componentType: "discovery",
    };
    
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(discoveryInfo),
      } as Response)
    ) as jest.Mock;
    
    mockRouteToStepComponent.mockResolvedValue(MockDeviceDiscovery as any);
    
    render(<DynamicStepRenderer {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockRouteToStepComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          componentType: "discovery",
        })
      );
    });
  });

  it("should render oauth component", async () => {
    const oauthInfo: StepComponentInfo = {
      ...mockStepComponentInfo,
      componentType: "oauth",
    };
    
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(oauthInfo),
      } as Response)
    ) as jest.Mock;
    
    mockRouteToStepComponent.mockResolvedValue(MockOAuthStep as any);
    
    render(<DynamicStepRenderer {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockRouteToStepComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          componentType: "oauth",
        })
      );
    });
  });

  it("should render confirm component", async () => {
    const confirmInfo: StepComponentInfo = {
      ...mockStepComponentInfo,
      componentType: "confirm",
    };
    
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(confirmInfo),
      } as Response)
    ) as jest.Mock;
    
    mockRouteToStepComponent.mockResolvedValue(MockDeviceConfirm as any);
    
    render(<DynamicStepRenderer {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockRouteToStepComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          componentType: "confirm",
        })
      );
    });
  });

  it("should reload component when stepId changes", async () => {
    mockRouteToStepComponent.mockResolvedValue(MockWizardStep as any);
    
    const { rerender } = render(<DynamicStepRenderer {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockRouteToStepComponent).toHaveBeenCalled();
    });
    
    jest.clearAllMocks();
    
    rerender(<DynamicStepRenderer {...defaultProps} stepId="step2" />);
    
    await waitFor(() => {
      expect(mockRouteToStepComponent).toHaveBeenCalled();
    });
  });

  it("should handle missing component gracefully", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockStepComponentInfo),
      } as Response)
    ) as jest.Mock;
    
    mockRouteToStepComponent.mockResolvedValue(null as any);
    
    render(<DynamicStepRenderer {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Step component not found/i)).toBeInTheDocument();
    });
  });
});
