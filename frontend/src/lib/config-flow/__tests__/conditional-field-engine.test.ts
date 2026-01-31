/**
 * Conditional Field Engine Tests
 * 
 * Tests for conditional field visibility and dependency resolution
 */

import {
  evaluateCondition,
  shouldShowField,
  getVisibleFields,
  getFieldDependencies,
  getFieldDependencyChain,
} from "../conditional-field-engine";
import type { ConfigFieldSchema, IntegrationConfigSchema } from "@/components/addDevice/server/integration-config-schemas";

describe("Conditional Field Engine", () => {
  describe("evaluateCondition", () => {
    it("should evaluate equals operator", () => {
      const condition = {
        field: "type",
        operator: "equals" as const,
        value: "local",
      };

      expect(evaluateCondition(condition, { type: "local" })).toBe(true);
      expect(evaluateCondition(condition, { type: "cloud" })).toBe(false);
    });

    it("should evaluate not_equals operator", () => {
      const condition = {
        field: "type",
        operator: "not_equals" as const,
        value: "local",
      };

      expect(evaluateCondition(condition, { type: "cloud" })).toBe(true);
      expect(evaluateCondition(condition, { type: "local" })).toBe(false);
    });

    it("should evaluate contains operator", () => {
      const condition = {
        field: "value",
        operator: "contains" as const,
        value: "test",
      };

      expect(evaluateCondition(condition, { value: "test string" })).toBe(true);
      expect(evaluateCondition(condition, { value: "other string" })).toBe(false);
    });

    it("should evaluate greater_than operator", () => {
      const condition = {
        field: "count",
        operator: "greater_than" as const,
        value: 10,
      };

      expect(evaluateCondition(condition, { count: 15 })).toBe(true);
      expect(evaluateCondition(condition, { count: 5 })).toBe(false);
    });

    it("should evaluate less_than operator", () => {
      const condition = {
        field: "count",
        operator: "less_than" as const,
        value: 10,
      };

      expect(evaluateCondition(condition, { count: 5 })).toBe(true);
      expect(evaluateCondition(condition, { count: 15 })).toBe(false);
    });

    it("should evaluate in operator", () => {
      const condition = {
        field: "value",
        operator: "in" as const,
        value: [1, 2, 3],
      };

      expect(evaluateCondition(condition, { value: 2 })).toBe(true);
      expect(evaluateCondition(condition, { value: 5 })).toBe(false);
    });

    it("should evaluate not_in operator", () => {
      const condition = {
        field: "value",
        operator: "not_in" as const,
        value: [1, 2, 3],
      };

      expect(evaluateCondition(condition, { value: 5 })).toBe(true);
      expect(evaluateCondition(condition, { value: 2 })).toBe(false);
    });
  });

  describe("shouldShowField", () => {
    it("should show field when no conditional is set", () => {
      const fieldSchema: ConfigFieldSchema = {
        type: "string",
        label: "Field",
      };

      expect(shouldShowField("field", fieldSchema, {})).toBe(true);
    });

    it("should show/hide field based on conditional", () => {
      const fieldSchema: ConfigFieldSchema = {
        type: "string",
        label: "Field",
        conditional: {
          field: "type",
          operator: "equals",
          value: "local",
        },
      };

      expect(shouldShowField("field", fieldSchema, { type: "local" })).toBe(true);
      expect(shouldShowField("field", fieldSchema, { type: "cloud" })).toBe(false);
    });
  });

  describe("getVisibleFields", () => {
    it("should return all fields when no conditionals", () => {
      const schema: IntegrationConfigSchema = {
        field1: {
          type: "string",
          label: "Field 1",
        },
        field2: {
          type: "string",
          label: "Field 2",
        },
      };

      const visible = getVisibleFields(schema, {});
      expect(visible).toEqual(["field1", "field2"]);
    });

    it("should filter fields based on conditionals", () => {
      const schema: IntegrationConfigSchema = {
        type: {
          type: "select",
          label: "Type",
          options: [
            { label: "Local", value: "local" },
            { label: "Cloud", value: "cloud" },
          ],
        },
        local_field: {
          type: "string",
          label: "Local Field",
          conditional: {
            field: "type",
            operator: "equals",
            value: "local",
          },
        },
        cloud_field: {
          type: "string",
          label: "Cloud Field",
          conditional: {
            field: "type",
            operator: "equals",
            value: "cloud",
          },
        },
      };

      const visibleLocal = getVisibleFields(schema, { type: "local" });
      expect(visibleLocal).toContain("type");
      expect(visibleLocal).toContain("local_field");
      expect(visibleLocal).not.toContain("cloud_field");

      const visibleCloud = getVisibleFields(schema, { type: "cloud" });
      expect(visibleCloud).toContain("type");
      expect(visibleCloud).toContain("cloud_field");
      expect(visibleCloud).not.toContain("local_field");
    });
  });

  describe("getFieldDependencies", () => {
    it("should find fields that depend on a given field", () => {
      const schema: IntegrationConfigSchema = {
        type: {
          type: "select",
          label: "Type",
          options: [],
        },
        dependent1: {
          type: "string",
          label: "Dependent 1",
          conditional: {
            field: "type",
            operator: "equals",
            value: "local",
          },
        },
        dependent2: {
          type: "string",
          label: "Dependent 2",
          dependsOn: ["type"],
        },
      };

      const dependencies = getFieldDependencies("type", schema);
      expect(dependencies).toContain("dependent1");
      expect(dependencies).toContain("dependent2");
    });

    it("should return empty array when no dependencies", () => {
      const schema: IntegrationConfigSchema = {
        field1: {
          type: "string",
          label: "Field 1",
        },
        field2: {
          type: "string",
          label: "Field 2",
        },
      };

      const dependencies = getFieldDependencies("field1", schema);
      expect(dependencies).toEqual([]);
    });
  });

  describe("getFieldDependencyChain", () => {
    it("should return dependency chain for a field", () => {
      const schema: IntegrationConfigSchema = {
        field1: {
          type: "string",
          label: "Field 1",
        },
        field2: {
          type: "string",
          label: "Field 2",
          dependsOn: ["field1"],
        },
        field3: {
          type: "string",
          label: "Field 3",
          dependsOn: ["field2"],
        },
      };

      const chain = getFieldDependencyChain("field3", schema);
      expect(chain).toContain("field1");
      expect(chain).toContain("field2");
    });

    it("should handle circular dependencies gracefully", () => {
      const schema: IntegrationConfigSchema = {
        field1: {
          type: "string",
          label: "Field 1",
          dependsOn: ["field2"],
        },
        field2: {
          type: "string",
          label: "Field 2",
          dependsOn: ["field1"],
        },
      };

      // Should not throw, should return empty or handle gracefully
      const chain1 = getFieldDependencyChain("field1", schema);
      const chain2 = getFieldDependencyChain("field2", schema);
      
      // Should detect circular dependency and return empty or partial chain
      expect(Array.isArray(chain1)).toBe(true);
      expect(Array.isArray(chain2)).toBe(true);
    });
  });
});
