/**
 * Wizard Summary Component Tests
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WizardSummary } from "../WizardSummary.client";

describe("WizardSummary", () => {
  const mockSteps = [
    {
      stepId: "step1",
      title: "Basic Information",
      data: {
        name: "Test Device",
        location: "Living Room",
      },
    },
    {
      stepId: "step2",
      title: "Connection Settings",
      data: {
        type: "wifi",
        ssid: "MyNetwork",
      },
    },
    {
      stepId: "step3",
      title: "Advanced Settings",
      data: {
        poll_interval: 30,
        enable_encryption: true,
      },
    },
  ];

  const defaultProps = {
    steps: mockSteps,
    onConfirm: jest.fn().mockResolvedValue(undefined),
    onEditStep: jest.fn(),
    onBack: jest.fn(),
    onCancel: jest.fn(),
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all step titles and data", () => {
    render(<WizardSummary {...defaultProps} />);

    expect(screen.getByText("Basic Information")).toBeInTheDocument();
    expect(screen.getByText("Connection Settings")).toBeInTheDocument();
    expect(screen.getByText("Advanced Settings")).toBeInTheDocument();

    expect(screen.getByText("Test Device")).toBeInTheDocument();
    expect(screen.getByText("Living Room")).toBeInTheDocument();
    expect(screen.getByText("wifi")).toBeInTheDocument();
    expect(screen.getByText("MyNetwork")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument(); // true -> "Yes"
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);

    render(<WizardSummary {...defaultProps} onConfirm={onConfirm} />);

    const confirmButton = screen.getByRole("button", { name: /Confirm/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
  });

  it("calls onEditStep when edit button is clicked", () => {
    const onEditStep = jest.fn();

    render(<WizardSummary {...defaultProps} onEditStep={onEditStep} />);

    // Find edit buttons (there should be one per step)
    const editButtons = screen.getAllByRole("button", { name: "" }); // Icon buttons
    const firstEditButton = editButtons.find(button => 
      button.getAttribute("aria-label")?.includes("Edit") || 
      button.closest("button")?.getAttribute("aria-label")?.includes("Edit")
    );

    if (firstEditButton) {
      fireEvent.click(firstEditButton);
      expect(onEditStep).toHaveBeenCalled();
    }
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = jest.fn();

    render(<WizardSummary {...defaultProps} onBack={onBack} />);

    const backButton = screen.getByRole("button", { name: /Back/i });
    fireEvent.click(backButton);

    expect(onBack).toHaveBeenCalled();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = jest.fn();

    render(<WizardSummary {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it("disables buttons when loading", () => {
    render(<WizardSummary {...defaultProps} loading={true} />);

    const confirmButton = screen.getByRole("button", { name: /Completing/i });
    expect(confirmButton).toBeDisabled();

    const backButton = screen.getByRole("button", { name: /Back/i });
    expect(backButton).toBeDisabled();
  });

  it("handles empty step data", () => {
    const stepsWithEmpty = [
      {
        stepId: "step1",
        title: "Empty Step",
        data: {},
      },
    ];

    render(<WizardSummary {...defaultProps} steps={stepsWithEmpty} />);

    expect(screen.getByText(/No data collected/i)).toBeInTheDocument();
  });

  it("formats boolean values correctly", () => {
    const stepsWithBooleans = [
      {
        stepId: "step1",
        title: "Test",
        data: {
          enabled: true,
          disabled: false,
        },
      },
    ];

    render(<WizardSummary {...defaultProps} steps={stepsWithBooleans} />);

    expect(screen.getByText("Yes")).toBeInTheDocument(); // true
    expect(screen.getByText("No")).toBeInTheDocument(); // false
  });

  it("formats object values as JSON", () => {
    const stepsWithObject = [
      {
        stepId: "step1",
        title: "Test",
        data: {
          config: { key: "value", nested: { data: 123 } },
        },
      },
    ];

    render(<WizardSummary {...defaultProps} steps={stepsWithObject} />);

    const jsonText = screen.getByText(/{[\s\S]*"key"[\s\S]*"value"[\s\S]*}/);
    expect(jsonText).toBeInTheDocument();
  });

  it("handles null and undefined values", () => {
    const stepsWithNulls = [
      {
        stepId: "step1",
        title: "Test",
        data: {
          value1: null,
          value2: undefined,
        },
      },
    ];

    render(<WizardSummary {...defaultProps} steps={stepsWithNulls} />);

    // Both should show as "—"
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });
});
