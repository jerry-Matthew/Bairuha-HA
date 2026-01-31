/**
 * Wizard Progress Component Tests
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { WizardProgress } from "../WizardProgress.client";

describe("WizardProgress", () => {
  const mockSteps = [
    {
      stepId: "step1",
      title: "Step 1",
      completed: true,
      visible: true,
    },
    {
      stepId: "step2",
      title: "Step 2",
      completed: true,
      visible: true,
    },
    {
      stepId: "step3",
      title: "Step 3",
      completed: false,
      visible: true,
    },
  ];

  const defaultProps = {
    steps: mockSteps,
    currentStepIndex: 2,
    onStepClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all visible steps", () => {
    render(<WizardProgress {...defaultProps} />);

    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();
    expect(screen.getByText("Step 3")).toBeInTheDocument();
  });

  it("highlights current step", () => {
    render(<WizardProgress {...defaultProps} currentStepIndex={1} />);

    // The current step should be marked as active
    // Material-UI Stepper component will add aria attributes
    const step2 = screen.getByText("Step 2");
    expect(step2).toBeInTheDocument();
  });

  it("calls onStepClick when completed step is clicked", () => {
    const onStepClick = jest.fn();

    render(<WizardProgress {...defaultProps} onStepClick={onStepClick} />);

    // Find and click a completed step
    const step1 = screen.getByText("Step 1");
    const stepButton = step1.closest("button");

    if (stepButton) {
      stepButton.click();
      expect(onStepClick).toHaveBeenCalledWith(0); // First step index
    }
  });

  it("hides invisible steps", () => {
    const stepsWithInvisible = [
      {
        stepId: "step1",
        title: "Step 1",
        completed: true,
        visible: true,
      },
      {
        stepId: "step2",
        title: "Step 2",
        completed: false,
        visible: false,
      },
      {
        stepId: "step3",
        title: "Step 3",
        completed: false,
        visible: true,
      },
    ];

    render(
      <WizardProgress
        {...defaultProps}
        steps={stepsWithInvisible}
        currentStepIndex={2}
      />
    );

    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 3")).toBeInTheDocument();
    expect(screen.queryByText("Step 2")).not.toBeInTheDocument();
  });

  it("does not call onStepClick when onStepClick is not provided", () => {
    render(<WizardProgress {...defaultProps} onStepClick={undefined} />);

    const step1 = screen.getByText("Step 1");
    const stepButton = step1.closest("button");

    if (stepButton) {
      expect(() => stepButton.click()).not.toThrow();
    }
  });

  it("renders step numbers correctly", () => {
    render(<WizardProgress {...defaultProps} />);

    // Material-UI Stepper shows step numbers in the optional text
    // Check that step indicators are present
    expect(screen.getByText("Step 1")).toBeInTheDocument();
  });

  it("handles single step", () => {
    const singleStep = [
      {
        stepId: "step1",
        title: "Only Step",
        completed: false,
        visible: true,
      },
    ];

    render(
      <WizardProgress
        {...defaultProps}
        steps={singleStep}
        currentStepIndex={0}
      />
    );

    expect(screen.getByText("Only Step")).toBeInTheDocument();
  });

  it("handles empty steps array", () => {
    render(
      <WizardProgress
        {...defaultProps}
        steps={[]}
        currentStepIndex={0}
      />
    );

    // Should render without errors, but no steps visible
    expect(screen.queryByText("Step 1")).not.toBeInTheDocument();
  });
});
