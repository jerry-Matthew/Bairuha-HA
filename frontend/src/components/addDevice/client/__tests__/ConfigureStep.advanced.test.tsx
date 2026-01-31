/**
 * ConfigureStep Advanced Features Tests
 * 
 * Tests for advanced field types, conditional fields, and dynamic options
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConfigureStep } from "../ConfigureStep.client";
import type { IntegrationConfigSchema } from "../../server/integration-config-schemas";

// Mock Material-UI
jest.mock("@mui/material", () => {
  const actual = jest.requireActual("@mui/material");
  return {
    ...actual,
  };
});

// Mock field components
jest.mock("../fieldRenderer", () => ({
  renderField: jest.fn((fieldName, fieldSchema, value, onChange) => {
    const label = fieldSchema.label || fieldSchema.description || fieldName;
    
    switch (fieldSchema.type) {
      case "string":
      case "password":
        return (
          <input
            key={fieldName}
            data-testid={`field-${fieldName}`}
            type={fieldSchema.type === "password" ? "password" : "text"}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={fieldSchema.placeholder}
          />
        );
      case "select":
        return (
          <select
            key={fieldName}
            data-testid={`field-${fieldName}`}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
          >
            {fieldSchema.options?.map((opt: any) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case "boolean":
        return (
          <input
            key={fieldName}
            data-testid={`field-${fieldName}`}
            type="checkbox"
            checked={value || false}
            onChange={(e) => onChange(e.target.checked)}
          />
        );
      default:
        return <div key={fieldName} data-testid={`field-${fieldName}`}>Unknown type</div>;
    }
  }),
}));

describe("ConfigureStep - Advanced Features", () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Conditional Fields", () => {
    it("should show/hide fields based on conditional logic", async () => {
      const schema: IntegrationConfigSchema = {
        connection_type: {
          type: "select",
          label: "Connection Type",
          required: true,
          options: [
            { label: "Local", value: "local" },
            { label: "Cloud", value: "cloud" },
          ],
        },
        local_field: {
          type: "string",
          label: "Local Field",
          conditional: {
            field: "connection_type",
            operator: "equals",
            value: "local",
          },
        },
        cloud_field: {
          type: "string",
          label: "Cloud Field",
          conditional: {
            field: "connection_type",
            operator: "equals",
            value: "cloud",
          },
        },
      };

      const { rerender } = render(
        <ConfigureStep
          schema={schema}
          onSubmit={mockOnSubmit}
          integrationId="test"
        />
      );

      // Initially, no conditional fields should be visible
      expect(screen.queryByTestId("field-local_field")).not.toBeInTheDocument();
      expect(screen.queryByTestId("field-cloud_field")).not.toBeInTheDocument();

      // Select "local" connection type
      const typeField = screen.getByTestId("field-connection_type");
      fireEvent.change(typeField, { target: { value: "local" } });

      await waitFor(() => {
        expect(screen.getByTestId("field-local_field")).toBeInTheDocument();
        expect(screen.queryByTestId("field-cloud_field")).not.toBeInTheDocument();
      });

      // Change to "cloud"
      fireEvent.change(typeField, { target: { value: "cloud" } });

      await waitFor(() => {
        expect(screen.queryByTestId("field-local_field")).not.toBeInTheDocument();
        expect(screen.getByTestId("field-cloud_field")).toBeInTheDocument();
      });
    });
  });

  describe("Field Grouping", () => {
    it("should group fields by group property", () => {
      const schema: IntegrationConfigSchema = {
        field1: {
          type: "string",
          label: "Field 1",
          group: "Group A",
        },
        field2: {
          type: "string",
          label: "Field 2",
          group: "Group A",
        },
        field3: {
          type: "string",
          label: "Field 3",
          group: "Group B",
        },
      };

      render(
        <ConfigureStep
          schema={schema}
          onSubmit={mockOnSubmit}
          integrationId="test"
        />
      );

      expect(screen.getByText("Group A")).toBeInTheDocument();
      expect(screen.getByText("Group B")).toBeInTheDocument();
    });

    it("should group fields by section property", () => {
      const schema: IntegrationConfigSchema = {
        field1: {
          type: "string",
          label: "Field 1",
          section: "Section A",
        },
        field2: {
          type: "string",
          label: "Field 2",
          section: "Section A",
        },
      };

      render(
        <ConfigureStep
          schema={schema}
          onSubmit={mockOnSubmit}
          integrationId="test"
        />
      );

      expect(screen.getByText("Section A")).toBeInTheDocument();
    });
  });

  describe("Field Ordering", () => {
    it("should order fields by order property", () => {
      const schema: IntegrationConfigSchema = {
        field3: {
          type: "string",
          label: "Field 3",
          order: 3,
        },
        field1: {
          type: "string",
          label: "Field 1",
          order: 1,
        },
        field2: {
          type: "string",
          label: "Field 2",
          order: 2,
        },
      };

      render(
        <ConfigureStep
          schema={schema}
          onSubmit={mockOnSubmit}
          integrationId="test"
        />
      );

      const fields = screen.getAllByTestId(/^field-/);
      expect(fields[0]).toHaveAttribute("data-testid", "field-field1");
      expect(fields[1]).toHaveAttribute("data-testid", "field-field2");
      expect(fields[2]).toHaveAttribute("data-testid", "field-field3");
    });
  });

  describe("Validation Errors", () => {
    it("should display validation errors", () => {
      const schema: IntegrationConfigSchema = {
        name: {
          type: "string",
          label: "Name",
          required: true,
        },
      };

      const validationErrors = {
        name: "Name is required",
        _general: "Please fix the errors below",
      };

      render(
        <ConfigureStep
          schema={schema}
          onSubmit={mockOnSubmit}
          validationErrors={validationErrors}
          integrationId="test"
        />
      );

      expect(screen.getByText("Please fix the errors below")).toBeInTheDocument();
    });
  });
});
