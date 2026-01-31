/**
 * Integration Config Schemas Tests
 * 
 * Tests for enhanced config schema validation including:
 * - Advanced field types (select, file, object, array)
 * - Conditional field validation
 * - Regex pattern validation
 * - Cross-field validation
 * - Nested object/array validation
 */

import {
  validateConfig,
  applyConfigDefaults,
  getConfigSchema,
  type IntegrationConfigSchema,
} from "../integration-config-schemas";

describe("Integration Config Schemas - Enhanced Validation", () => {
  describe("Basic Field Types", () => {
    it("should validate string fields", () => {
      const schema: IntegrationConfigSchema = {
        name: {
          type: "string",
          label: "Name",
          required: true,
        },
      };

      const valid = validateConfig("test", { name: "Test Device" });
      expect(valid.valid).toBe(true);
      expect(Object.keys(valid.errors)).toHaveLength(0);

      const invalid = validateConfig("test", { name: "" });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors.name).toBeDefined();
    });

    it("should validate number fields with min/max", () => {
      const schema: IntegrationConfigSchema = {
        port: {
          type: "number",
          label: "Port",
          required: true,
          min: 1,
          max: 65535,
        },
      };

      const valid = validateConfig("test", { port: 8080 });
      expect(valid.valid).toBe(true);

      const tooSmall = validateConfig("test", { port: 0 });
      expect(tooSmall.valid).toBe(false);
      expect(tooSmall.errors.port).toContain("at least");

      const tooLarge = validateConfig("test", { port: 70000 });
      expect(tooLarge.valid).toBe(false);
      expect(tooLarge.errors.port).toContain("at most");
    });

    it("should validate boolean fields", () => {
      const schema: IntegrationConfigSchema = {
        enabled: {
          type: "boolean",
          label: "Enabled",
          required: true,
        },
      };

      const valid = validateConfig("test", { enabled: true });
      expect(valid.valid).toBe(true);

      const invalid = validateConfig("test", { enabled: "not boolean" });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors.enabled).toBeDefined();
    });
  });

  describe("Regex Pattern Validation", () => {
    it("should validate string fields against regex pattern", () => {
      const schema: IntegrationConfigSchema = {
        ip_address: {
          type: "string",
          label: "IP Address",
          required: true,
          validation: {
            pattern: "^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$",
            patternMessage: "Must be a valid IP address",
          },
        },
      };

      const valid = validateConfig("test", { ip_address: "192.168.1.1" });
      expect(valid.valid).toBe(true);

      const invalid = validateConfig("test", { ip_address: "invalid-ip" });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors.ip_address).toContain("IP address");
    });

    it("should validate email pattern", () => {
      const schema: IntegrationConfigSchema = {
        email: {
          type: "string",
          label: "Email",
          required: true,
          validation: {
            pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$",
            patternMessage: "Must be a valid email address",
          },
        },
      };

      const valid = validateConfig("test", { email: "test@example.com" });
      expect(valid.valid).toBe(true);

      const invalid = validateConfig("test", { email: "not-an-email" });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors.email).toContain("email");
    });
  });

  describe("Length Validation", () => {
    it("should validate string min/max length", () => {
      const schema: IntegrationConfigSchema = {
        password: {
          type: "password",
          label: "Password",
          required: true,
          validation: {
            minLength: 8,
            maxLength: 128,
          },
        },
      };

      const valid = validateConfig("test", { password: "validpassword123" });
      expect(valid.valid).toBe(true);

      const tooShort = validateConfig("test", { password: "short" });
      expect(tooShort.valid).toBe(false);
      expect(tooShort.errors.password).toContain("at least 8");

      const tooLong = validateConfig("test", { password: "a".repeat(200) });
      expect(tooLong.valid).toBe(false);
      expect(tooLong.errors.password).toContain("at most 128");
    });
  });

  describe("Select Field Validation", () => {
    it("should validate select fields against static options", () => {
      const schema: IntegrationConfigSchema = {
        type: {
          type: "select",
          label: "Type",
          required: true,
          options: [
            { label: "Option 1", value: "opt1" },
            { label: "Option 2", value: "opt2" },
          ],
        },
      };

      const valid = validateConfig("test", { type: "opt1" });
      expect(valid.valid).toBe(true);

      const invalid = validateConfig("test", { type: "invalid" });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors.type).toBeDefined();
    });

    it("should validate multiselect fields", () => {
      const schema: IntegrationConfigSchema = {
        tags: {
          type: "multiselect",
          label: "Tags",
          required: true,
          options: [
            { label: "Tag 1", value: "tag1" },
            { label: "Tag 2", value: "tag2" },
          ],
          validation: {
            minLength: 1,
            maxLength: 5,
          },
        },
      };

      const valid = validateConfig("test", { tags: ["tag1", "tag2"] });
      expect(valid.valid).toBe(true);

      const invalid = validateConfig("test", { tags: ["invalid"] });
      expect(invalid.valid).toBe(false);

      const tooMany = validateConfig("test", { tags: Array(10).fill("tag1") });
      expect(tooMany.valid).toBe(false);
    });
  });

  describe("Nested Object Validation", () => {
    it("should validate nested object fields", () => {
      const schema: IntegrationConfigSchema = {
        config: {
          type: "object",
          label: "Configuration",
          properties: {
            host: {
              type: "string",
              label: "Host",
              required: true,
            },
            port: {
              type: "number",
              label: "Port",
              required: true,
              min: 1,
              max: 65535,
            },
          },
        },
      };

      const valid = validateConfig("test", {
        config: {
          host: "localhost",
          port: 8080,
        },
      });
      expect(valid.valid).toBe(true);

      const missingHost = validateConfig("test", {
        config: {
          port: 8080,
        },
      });
      expect(missingHost.valid).toBe(false);
      expect(missingHost.errors["config.host"]).toBeDefined();

      const invalidPort = validateConfig("test", {
        config: {
          host: "localhost",
          port: 70000,
        },
      });
      expect(invalidPort.valid).toBe(false);
      expect(invalidPort.errors["config.port"]).toBeDefined();
    });

    it("should validate deeply nested objects", () => {
      const schema: IntegrationConfigSchema = {
        auth: {
          type: "object",
          label: "Authentication",
          properties: {
            credentials: {
              type: "object",
              label: "Credentials",
              properties: {
                username: {
                  type: "string",
                  label: "Username",
                  required: true,
                },
                password: {
                  type: "password",
                  label: "Password",
                  required: true,
                },
              },
            },
          },
        },
      };

      const valid = validateConfig("test", {
        auth: {
          credentials: {
            username: "user",
            password: "pass",
          },
        },
      });
      expect(valid.valid).toBe(true);

      const invalid = validateConfig("test", {
        auth: {
          credentials: {
            username: "",
          },
        },
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors["auth.credentials.password"]).toBeDefined();
    });
  });

  describe("Nested Array Validation", () => {
    it("should validate array fields", () => {
      const schema: IntegrationConfigSchema = {
        items: {
          type: "array",
          label: "Items",
          items: {
            type: "string",
            label: "Item",
            required: true,
          },
          validation: {
            minLength: 1,
            maxLength: 10,
          },
        },
      };

      const valid = validateConfig("test", {
        items: ["item1", "item2"],
      });
      expect(valid.valid).toBe(true);

      const empty = validateConfig("test", { items: [] });
      expect(empty.valid).toBe(false);
      expect(empty.errors.items).toContain("at least 1");

      const tooMany = validateConfig("test", {
        items: Array(20).fill("item"),
      });
      expect(tooMany.valid).toBe(false);
      expect(tooMany.errors.items).toContain("at most 10");
    });

    it("should validate array of objects", () => {
      const schema: IntegrationConfigSchema = {
        zones: {
          type: "array",
          label: "Zones",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                label: "Zone Name",
                required: true,
              },
              temperature: {
                type: "number",
                label: "Temperature",
                required: true,
                min: 0,
                max: 100,
              },
            },
          },
        },
      };

      const valid = validateConfig("test", {
        zones: [
          { name: "Zone 1", temperature: 22 },
          { name: "Zone 2", temperature: 24 },
        ],
      });
      expect(valid.valid).toBe(true);

      const invalid = validateConfig("test", {
        zones: [
          { name: "", temperature: 22 },
        ],
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors["zones[0].name"]).toBeDefined();
    });
  });

  describe("Conditional Field Validation", () => {
    it("should skip required validation for hidden conditional fields", () => {
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
        cloud_api_key: {
          type: "password",
          label: "Cloud API Key",
          required: true,
          conditional: {
            field: "connection_type",
            operator: "equals",
            value: "cloud",
          },
        },
      };

      // When connection_type is "local", cloud_api_key should not be required
      const local = validateConfig("test", {
        connection_type: "local",
      });
      expect(local.valid).toBe(true);
      expect(local.errors.cloud_api_key).toBeUndefined();

      // When connection_type is "cloud", cloud_api_key should be required
      const cloud = validateConfig("test", {
        connection_type: "cloud",
      });
      expect(cloud.valid).toBe(false);
      expect(cloud.errors.cloud_api_key).toBeDefined();
    });

    it("should handle various conditional operators", () => {
      const schema: IntegrationConfigSchema = {
        value: {
          type: "number",
          label: "Value",
          required: true,
        },
        show_if_greater: {
          type: "string",
          label: "Show If Greater",
          required: true,
          conditional: {
            field: "value",
            operator: "greater_than",
            value: 10,
          },
        },
        show_if_in: {
          type: "string",
          label: "Show If In",
          required: true,
          conditional: {
            field: "value",
            operator: "in",
            value: [5, 10, 15],
          },
        },
      };

      // value > 10, so show_if_greater should be required
      const greater = validateConfig("test", { value: 15 });
      expect(greater.valid).toBe(false);
      expect(greater.errors.show_if_greater).toBeDefined();

      // value <= 10, so show_if_greater should not be required
      const less = validateConfig("test", { value: 5 });
      expect(less.valid).toBe(true);
      expect(less.errors.show_if_greater).toBeUndefined();
    });
  });

  describe("Cross-Field Validation", () => {
    it("should validate password match", () => {
      const schema: IntegrationConfigSchema = {
        password: {
          type: "password",
          label: "Password",
          required: true,
        },
        confirm_password: {
          type: "password",
          label: "Confirm Password",
          required: true,
          validation: {
            crossFieldValidation: {
              dependsOn: ["password"],
              validator: "password_match",
            },
          },
        },
      };

      const valid = validateConfig("test", {
        password: "password123",
        confirm_password: "password123",
      });
      expect(valid.valid).toBe(true);

      const invalid = validateConfig("test", {
        password: "password123",
        confirm_password: "different",
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors.confirm_password).toContain("match");
    });
  });

  describe("applyConfigDefaults", () => {
    it("should apply default values", () => {
      const schema: IntegrationConfigSchema = {
        name: {
          type: "string",
          label: "Name",
          default: "Default Name",
        },
        port: {
          type: "number",
          label: "Port",
          default: 8080,
        },
        enabled: {
          type: "boolean",
          label: "Enabled",
          default: false,
        },
      };

      const result = applyConfigDefaults("test", {});
      expect(result.name).toBe("Default Name");
      expect(result.port).toBe(8080);
      expect(result.enabled).toBe(false);
    });

    it("should preserve existing values", () => {
      const schema: IntegrationConfigSchema = {
        name: {
          type: "string",
          label: "Name",
          default: "Default Name",
        },
      };

      const result = applyConfigDefaults("test", { name: "Custom Name" });
      expect(result.name).toBe("Custom Name");
    });

    it("should apply defaults for nested objects", () => {
      const schema: IntegrationConfigSchema = {
        config: {
          type: "object",
          label: "Configuration",
          properties: {
            host: {
              type: "string",
              label: "Host",
              default: "localhost",
            },
            port: {
              type: "number",
              label: "Port",
              default: 8080,
            },
          },
        },
      };

      const result = applyConfigDefaults("test", {});
      expect(result.config.host).toBe("localhost");
      expect(result.config.port).toBe(8080);
    });

    it("should apply defaults for arrays", () => {
      const schema: IntegrationConfigSchema = {
        items: {
          type: "array",
          label: "Items",
          items: {
            type: "string",
            label: "Item",
            default: "default-item",
          },
        },
      };

      const result = applyConfigDefaults("test", { items: [] });
      expect(Array.isArray(result.items)).toBe(true);
    });
  });
});
