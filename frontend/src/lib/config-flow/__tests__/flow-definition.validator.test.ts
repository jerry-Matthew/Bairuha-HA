/**
 * Flow Definition Validator Tests
 * 
 * Tests for the flow definition validator service
 */

import {
  validateFlowDefinition,
  validateFlowDefinitionStructure,
} from "../flow-definition.validator";
import type { FlowDefinition } from "../flow-definition.types";

describe("Flow Definition Validator", () => {
  describe("validateFlowDefinition", () => {
    it("validates a valid flow definition", () => {
      const definition: FlowDefinition = {
        flow_type: "wizard",
        name: "Test Flow",
        steps: [
          {
            step_id: "step1",
            step_type: "wizard",
            title: "Step 1",
            schema: {
              type: "object",
              properties: {
                field1: {
                  type: "string",
                  title: "Field 1",
                },
              },
            },
          },
        ],
      };

      const result = validateFlowDefinition(definition);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects flow definition with invalid flow_type", () => {
      const definition: any = {
        flow_type: "invalid_type",
        name: "Test Flow",
        steps: [],
      };

      const result = validateFlowDefinition(definition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "flow_type",
          code: "INVALID_FLOW_TYPE",
        })
      );
    });

    it("rejects flow definition without name", () => {
      const definition: any = {
        flow_type: "manual",
        steps: [],
      };

      const result = validateFlowDefinition(definition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "name",
          code: "REQUIRED_FIELD",
        })
      );
    });

    it("rejects flow definition without steps", () => {
      const definition: any = {
        flow_type: "manual",
        name: "Test Flow",
        steps: [],
      };

      const result = validateFlowDefinition(definition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "steps",
          code: "REQUIRED_FIELD",
        })
      );
    });

    it("rejects flow definition with duplicate step IDs", () => {
      const definition: FlowDefinition = {
        flow_type: "wizard",
        name: "Test Flow",
        steps: [
          {
            step_id: "step1",
            step_type: "wizard",
            title: "Step 1",
            schema: { type: "object", properties: {} },
          },
          {
            step_id: "step1", // Duplicate
            step_type: "wizard",
            title: "Step 2",
            schema: { type: "object", properties: {} },
          },
        ],
      };

      const result = validateFlowDefinition(definition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "steps",
          code: "DUPLICATE_STEP_ID",
        })
      );
    });

    it("rejects flow definition with invalid initial_step reference", () => {
      const definition: FlowDefinition = {
        flow_type: "wizard",
        name: "Test Flow",
        initial_step: "nonexistent_step",
        steps: [
          {
            step_id: "step1",
            step_type: "wizard",
            title: "Step 1",
            schema: { type: "object", properties: {} },
          },
        ],
      };

      const result = validateFlowDefinition(definition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "initial_step",
          code: "INVALID_STEP_REFERENCE",
        })
      );
    });

    it("validates step definitions", () => {
      const definition: FlowDefinition = {
        flow_type: "wizard",
        name: "Test Flow",
        steps: [
          {
            step_id: "",
            step_type: "wizard",
            title: "Step 1",
            schema: { type: "object", properties: {} },
          },
        ],
      };

      const result = validateFlowDefinition(definition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "steps[0].step_id",
          code: "REQUIRED_FIELD",
        })
      );
    });

    it("validates step schema structure", () => {
      const definition: FlowDefinition = {
        flow_type: "wizard",
        name: "Test Flow",
        steps: [
          {
            step_id: "step1",
            step_type: "wizard",
            title: "Step 1",
            schema: {
              type: "string", // Invalid - should be "object"
              properties: {},
            },
          },
        ],
      };

      const result = validateFlowDefinition(definition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "steps[0].schema.type",
          code: "INVALID_SCHEMA_TYPE",
        })
      );
    });

    it("validates field definitions", () => {
      const definition: FlowDefinition = {
        flow_type: "wizard",
        name: "Test Flow",
        steps: [
          {
            step_id: "step1",
            step_type: "wizard",
            title: "Step 1",
            schema: {
              type: "object",
              properties: {
                field1: {
                  type: "invalid_type" as any,
                  title: "Field 1",
                },
              },
            },
          },
        ],
      };

      const result = validateFlowDefinition(definition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "steps[0].schema.properties[field1].type",
          code: "INVALID_FIELD_TYPE",
        })
      );
    });

    it("validates step conditions", () => {
      const definition: FlowDefinition = {
        flow_type: "wizard",
        name: "Test Flow",
        steps: [
          {
            step_id: "step1",
            step_type: "wizard",
            title: "Step 1",
            schema: { type: "object", properties: {} },
          },
          {
            step_id: "step2",
            step_type: "wizard",
            title: "Step 2",
            schema: { type: "object", properties: {} },
            condition: {
              depends_on: "",
              operator: "invalid_operator" as any,
            },
          },
        ],
      };

      const result = validateFlowDefinition(definition);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes("condition"))).toBe(true);
    });

    it("validates navigation step references", () => {
      const definition: FlowDefinition = {
        flow_type: "wizard",
        name: "Test Flow",
        steps: [
          {
            step_id: "step1",
            step_type: "wizard",
            title: "Step 1",
            schema: { type: "object", properties: {} },
            navigation: {
              next_step: "nonexistent_step",
            },
          },
        ],
      };

      const result = validateFlowDefinition(definition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "steps[0].navigation.next_step",
          code: "INVALID_STEP_REFERENCE",
        })
      );
    });

    it("validates select fields have options", () => {
      const definition: FlowDefinition = {
        flow_type: "wizard",
        name: "Test Flow",
        steps: [
          {
            step_id: "step1",
            step_type: "wizard",
            title: "Step 1",
            schema: {
              type: "object",
              properties: {
                field1: {
                  type: "select",
                  title: "Field 1",
                  // Missing options
                },
              },
            },
          },
        ],
      };

      const result = validateFlowDefinition(definition);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: "steps[0].schema.properties[field1].options",
          code: "REQUIRED_FIELD",
        })
      );
    });
  });

  describe("validateFlowDefinitionStructure", () => {
    it("validates basic structure", () => {
      expect(validateFlowDefinitionStructure(null)).toBe(false);
      expect(validateFlowDefinitionStructure(undefined)).toBe(false);
      expect(validateFlowDefinitionStructure("string")).toBe(false);
      expect(validateFlowDefinitionStructure({})).toBe(false);

      expect(
        validateFlowDefinitionStructure({
          flow_type: "manual",
          name: "Test",
          steps: [
            {
              step_id: "step1",
              step_type: "manual",
              title: "Step 1",
              schema: {
                type: "object",
                properties: {},
              },
            },
          ],
        })
      ).toBe(true);
    });

    it("requires flow_type", () => {
      expect(
        validateFlowDefinitionStructure({
          name: "Test",
          steps: [],
        })
      ).toBe(false);
    });

    it("requires name", () => {
      expect(
        validateFlowDefinitionStructure({
          flow_type: "manual",
          steps: [],
        })
      ).toBe(false);
    });

    it("requires steps array", () => {
      expect(
        validateFlowDefinitionStructure({
          flow_type: "manual",
          name: "Test",
        })
      ).toBe(false);
    });
  });
});
