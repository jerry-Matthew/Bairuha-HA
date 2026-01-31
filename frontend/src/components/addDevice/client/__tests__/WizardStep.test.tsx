/**
 * Wizard Step Component Tests
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WizardStep } from "../WizardStep.client";
import type { IntegrationConfigSchema } from "../../server/integration-config-schemas";

// Mock Material-UI components
jest.mock("@mui/material", () => {
  const actual = jest.requireActual("@mui/material");
  return {
    ...actual,
  };
});

describe("WizardStep", () => {
  const mockSchema: IntegrationConfigSchema = {
    name: {
      type: "string",
      required: true,
      description: "Device Name",
      placeholder: "Enter device name",
    },
    port: {
      type: "number",
      required: true,
      description: "Port",
      default: 8080,
    },
    enabled: {
      type: "boolean",
      required: false,
      description: "Enable Device",
      default: false,
    },
  };

  const defaultProps = {
    stepId: "test_step",
    stepTitle: "Test Step",
    stepDescription: "Test description",
    stepNumber: 1,
    totalSteps: 3,
    schema: mockSchema,
    onSubmit: jest.fn(),
    onBack: jest.fn(),
    onCancel: jest.fn(),
    loading: false,
    validationErrors: {},
    canGoBack: true,
    isLastStep: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders step title and description", () => {
    render(<WizardStep {...defaultProps} />);

    expect(screen.getByText("Test Step")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
  });

  it("renders all form fields from schema", () => {
    render(<WizardStep {...defaultProps} />);

    expect(screen.getByLabelText(/Device Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Port/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Enable Device/i)).toBeInTheDocument();
  });

  it("initializes form with default values", () => {
    render(<WizardStep {...defaultProps} />);

    const portInput = screen.getByLabelText(/Port/i) as HTMLInputElement;
    expect(portInput.value).toBe("8080");

    const enabledSwitch = screen.getByLabelText(/Enable Device/i) as HTMLInputElement;
    expect(enabledSwitch.checked).toBe(false);
  });

  it("initializes form with initialData", () => {
    const initialData = {
      name: "Test Device",
      port: 9090,
      enabled: true,
    };

    render(<WizardStep {...defaultProps} initialData={initialData} />);

    const nameInput = screen.getByLabelText(/Device Name/i) as HTMLInputElement;
    expect(nameInput.value).toBe("Test Device");

    const portInput = screen.getByLabelText(/Port/i) as HTMLInputElement;
    expect(portInput.value).toBe("9090");

    const enabledSwitch = screen.getByLabelText(/Enable Device/i) as HTMLInputElement;
    expect(enabledSwitch.checked).toBe(true);
  });

  it("calls onSubmit with form data when form is submitted", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(<WizardStep {...defaultProps} onSubmit={onSubmit} />);

    const nameInput = screen.getByLabelText(/Device Name/i);
    fireEvent.change(nameInput, { target: { value: "My Device" } });

    const submitButton = screen.getByRole("button", { name: /Next/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "My Device",
          port: 8080,
          enabled: false,
        })
      );
    });
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = jest.fn();

    render(<WizardStep {...defaultProps} onBack={onBack} />);

    const backButton = screen.getByRole("button", { name: /Back/i });
    fireEvent.click(backButton);

    expect(onBack).toHaveBeenCalled();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = jest.fn();

    render(<WizardStep {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it("displays validation errors", () => {
    const validationErrors = {
      name: "Name is required",
      port: "Port must be a number",
    };

    render(<WizardStep {...defaultProps} validationErrors={validationErrors} />);

    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Port must be a number")).toBeInTheDocument();
  });

  it("disables buttons when loading", () => {
    render(<WizardStep {...defaultProps} loading={true} />);

    const submitButton = screen.getByRole("button", { name: /Saving/i });
    expect(submitButton).toBeDisabled();

    const backButton = screen.getByRole("button", { name: /Back/i });
    expect(backButton).toBeDisabled();
  });

  it("hides back button when canGoBack is false", () => {
    render(<WizardStep {...defaultProps} canGoBack={false} />);

    expect(screen.queryByRole("button", { name: /Back/i })).not.toBeInTheDocument();
  });

  it("shows 'Review' button text when isLastStep is true", () => {
    render(<WizardStep {...defaultProps} isLastStep={true} />);

    expect(screen.getByRole("button", { name: /Review/i })).toBeInTheDocument();
  });

  it("handles password field type", () => {
    const passwordSchema: IntegrationConfigSchema = {
      password: {
        type: "password",
        required: true,
        description: "Password",
      },
    };

    render(<WizardStep {...defaultProps} schema={passwordSchema} />);

    const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");
  });

  it("handles number field input", () => {
    render(<WizardStep {...defaultProps} />);

    const portInput = screen.getByLabelText(/Port/i);
    fireEvent.change(portInput, { target: { value: "9090" } });

    expect((portInput as HTMLInputElement).value).toBe("9090");
  });

  it("handles boolean field toggle", () => {
    render(<WizardStep {...defaultProps} />);

    const enabledSwitch = screen.getByLabelText(/Enable Device/i) as HTMLInputElement;
    
    fireEvent.click(enabledSwitch);
    expect(enabledSwitch.checked).toBe(true);

    fireEvent.click(enabledSwitch);
    expect(enabledSwitch.checked).toBe(false);
  });
});
