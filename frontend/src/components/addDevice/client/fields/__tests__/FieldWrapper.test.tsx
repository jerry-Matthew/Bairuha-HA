/**
 * Field Wrapper Component Tests
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { FieldWrapper } from "../FieldWrapper";
import type { ConfigFieldSchema } from "../../../server/integration-config-schemas";

describe("FieldWrapper", () => {
  it("should render children when field is visible", () => {
    const fieldSchema: ConfigFieldSchema = {
      type: "string",
      label: "Test Field",
    };

    render(
      <FieldWrapper
        fieldName="test"
        fieldSchema={fieldSchema}
        formValues={{}}
      >
        <input type="text" data-testid="test-input" />
      </FieldWrapper>
    );

    expect(screen.getByTestId("test-input")).toBeInTheDocument();
  });

  it("should hide field when conditional is not met", () => {
    const fieldSchema: ConfigFieldSchema = {
      type: "string",
      label: "Test Field",
      conditional: {
        field: "type",
        operator: "equals",
        value: "local",
      },
    };

    const { container } = render(
      <FieldWrapper
        fieldName="test"
        fieldSchema={fieldSchema}
        formValues={{ type: "cloud" }}
      >
        <input type="text" data-testid="test-input" />
      </FieldWrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it("should display error message when provided", () => {
    const fieldSchema: ConfigFieldSchema = {
      type: "string",
      label: "Test Field",
    };

    render(
      <FieldWrapper
        fieldName="test"
        fieldSchema={fieldSchema}
        formValues={{}}
        errorMessage="This field is required"
      >
        <input type="text" />
      </FieldWrapper>
    );

    expect(screen.getByText("This field is required")).toBeInTheDocument();
  });

  it("should display help text when provided", () => {
    const fieldSchema: ConfigFieldSchema = {
      type: "string",
      label: "Test Field",
      helpText: "This is help text",
    };

    render(
      <FieldWrapper
        fieldName="test"
        fieldSchema={fieldSchema}
        formValues={{}}
      >
        <input type="text" />
      </FieldWrapper>
    );

    expect(screen.getByText("This is help text")).toBeInTheDocument();
  });

  it("should display required indicator when field is required", () => {
    const fieldSchema: ConfigFieldSchema = {
      type: "string",
      label: "Test Field",
      required: true,
    };

    render(
      <FieldWrapper
        fieldName="test"
        fieldSchema={fieldSchema}
        formValues={{}}
      >
        <input type="text" />
      </FieldWrapper>
    );

    expect(screen.getByText("Required")).toBeInTheDocument();
  });
});
