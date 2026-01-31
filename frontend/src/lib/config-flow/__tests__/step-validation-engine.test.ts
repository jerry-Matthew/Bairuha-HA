/**
 * Step Validation Engine Tests
 * 
 * Tests for the dynamic step validation engine
 */

import {
  validateStepData,
  validateField,
  type ValidationResult,
  type FieldValidationResult,
} from "../step-validation-engine";
import type { StepDefinition, FieldDefinition } from "../flow-definition.types";

describe("Step Validation Engine", () => {
  const mockStepDefinition: StepDefinition = {
    step_id: "test_step",
    step_type: "wizard",
    title: "Test Step",
    schema: {
      type: "object",
      properties: {
        device_name: {
          type: "string",
          title: "Device Name",
          min: 3,
          max: 50,
        },
        email: {
          type: "string",
          title: "Email",
          format: "email",
        },
        port: {
          type: "number",
          title: "Port",
          min: 1,
          max: 65535,
        },
        enabled: {
          type: "boolean",
          title: "Enabled",
        },
      },
      required: ["device_name", "email"],
    },
  };

  describe("validateStepData", () => {
    it("should validate valid step data", async () => {
      const stepData = {
        device_name: "Test Device",
        email: "test@example.com",
        port: 8080,
        enabled: true,
      };
      const result = await validateStepData(mockStepDefinition, stepData);
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it("should detect missing required fields", async () => {
      const stepData = {
        port: 8080,
      };
      const result = await validateStepData(mockStepDefinition, stepData);
      expect(result.valid).toBe(false);
      expect(result.errors.device_name).toBeDefined();
      expect(result.errors.email).toBeDefined();
    });

    it("should validate string min length", async () => {
      const stepData = {
        device_name: "AB", // Too short
        email: "test@example.com",
      };
      const result = await validateStepData(mockStepDefinition, stepData);
      expect(result.valid).toBe(false);
      expect(result.errors.device_name).toContain("at least 3 characters");
    });

    it("should validate string max length", async () => {
      const stepData = {
        device_name: "A".repeat(51), // Too long
        email: "test@example.com",
      };
      const result = await validateStepData(mockStepDefinition, stepData);
      expect(result.valid).toBe(false);
      expect(result.errors.device_name).toContain("at most 50 characters");
    });

    it("should validate email format", async () => {
      const stepData = {
        device_name: "Test Device",
        email: "invalid-email",
      };
      const result = await validateStepData(mockStepDefinition, stepData);
      expect(result.valid).toBe(false);
      expect(result.errors.email).toContain("email format");
    });

    it("should validate number min value", async () => {
      const stepData = {
        device_name: "Test Device",
        email: "test@example.com",
        port: 0, // Too low
      };
      const result = await validateStepData(mockStepDefinition, stepData);
      expect(result.valid).toBe(false);
      expect(result.errors.port).toContain("at least 1");
    });

    it("should validate number max value", async () => {
      const stepData = {
        device_name: "Test Device",
        email: "test@example.com",
        port: 70000, // Too high
      };
      const result = await validateStepData(mockStepDefinition, stepData);
      expect(result.valid).toBe(false);
      expect(result.errors.port).toContain("at most 65535");
    });

    it("should validate with custom validators", async () => {
      const stepWithValidators: StepDefinition = {
        ...mockStepDefinition,
        validation: {
          validators: [
            {
              type: "required",
              field: "custom_field",
              message: "Custom field is required",
            },
            {
              type: "min",
              field: "device_name",
              value: 5,
              message: "Device name must be at least 5 characters",
            },
          ],
        },
      };
      const stepData = {
        device_name: "Test",
        email: "test@example.com",
      };
      const result = await validateStepData(stepWithValidators, stepData);
      expect(result.valid).toBe(false);
      expect(result.errors.custom_field).toBeDefined();
      expect(result.errors.device_name).toBeDefined();
    });
  });

  describe("validateField", () => {
    it("should validate string field", async () => {
      const fieldDef: FieldDefinition = {
        type: "string",
        title: "Test Field",
        min: 3,
        max: 10,
      };
      const result = await validateField(fieldDef, "test", {});
      expect(result.valid).toBe(true);
    });

    it("should validate number field", async () => {
      const fieldDef: FieldDefinition = {
        type: "number",
        title: "Test Field",
        min: 1,
        max: 100,
      };
      const result = await validateField(fieldDef, 50, {});
      expect(result.valid).toBe(true);
    });

    it("should validate boolean field", async () => {
      const fieldDef: FieldDefinition = {
        type: "boolean",
        title: "Test Field",
      };
      const result = await validateField(fieldDef, true, {});
      expect(result.valid).toBe(true);
    });

    it("should validate pattern", async () => {
      const fieldDef: FieldDefinition = {
        type: "string",
        title: "Test Field",
        pattern: "^[A-Z]{3}$",
      };
      const result1 = await validateField(fieldDef, "ABC", {});
      expect(result1.valid).toBe(true);

      const result2 = await validateField(fieldDef, "abc", {});
      expect(result2.valid).toBe(false);
    });

    it("should validate URL format", async () => {
      const fieldDef: FieldDefinition = {
        type: "string",
        title: "Test Field",
        format: "url",
      };
      const result1 = await validateField(fieldDef, "https://example.com", {});
      expect(result1.valid).toBe(true);

      const result2 = await validateField(fieldDef, "not-a-url", {});
      expect(result2.valid).toBe(false);
    });

    it("should validate field dependencies", async () => {
      const fieldDef: FieldDefinition = {
        type: "string",
        title: "Dependent Field",
        depends_on: {
          field: "parent_field",
          operator: "equals",
          value: "show",
        },
      };
      const allData = {
        parent_field: "show",
        dependent_field: "value",
      };
      const result = await validateField(fieldDef, "value", allData);
      expect(result.valid).toBe(true);
    });
  });
});
