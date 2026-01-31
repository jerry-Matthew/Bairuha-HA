/**
 * YAML Validator Service Tests
 * 
 * Tests for the YAML validator service including:
 * - YAML syntax validation
 * - Configuration checking
 * - Configuration reloading
 */

import { getYAMLValidator } from "../yaml-validator";
import { createHARestClient } from "@/lib/home-assistant/rest-client";

// Mock dependencies
jest.mock("@/lib/home-assistant/rest-client");
jest.mock("@/lib/db");
jest.mock("@/components/globalAdd/server/config-entry.registry");
jest.mock("js-yaml", () => ({
  load: jest.fn(),
  DEFAULT_SAFE_SCHEMA: {},
}));

import yaml from "js-yaml";

const mockYaml = yaml as jest.Mocked<typeof yaml>;
const mockHARestClient = createHARestClient as jest.MockedFunction<typeof createHARestClient>;

describe("YAMLValidator", () => {
  let validator: ReturnType<typeof getYAMLValidator>;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = getYAMLValidator();
  });

  describe("validateYAML", () => {
    it("validates valid YAML successfully", async () => {
      const yamlContent = "homeassistant:\n  name: Home";
      const parsedData = { homeassistant: { name: "Home" } };

      mockYaml.load.mockReturnValue(parsedData);

      const result = await validator.validateYAML({
        yaml: yamlContent,
        fileType: "configuration",
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.data).toEqual(parsedData);
      expect(mockYaml.load).toHaveBeenCalledWith(
        yamlContent,
        expect.objectContaining({
          schema: mockYaml.DEFAULT_SAFE_SCHEMA,
        })
      );
    });

    it("handles YAML syntax errors", async () => {
      const yamlContent = "invalid: yaml: content: [";
      const error = new Error("YAML syntax error");
      (error as any).mark = { line: 0, column: 20 };
      (error as any).reason = "expected mapping key";

      mockYaml.load.mockImplementation(() => {
        throw error;
      });

      const result = await validator.validateYAML({
        yaml: yamlContent,
        fileType: "custom",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("YAML syntax error");
      expect(result.errors[0].line).toBe(1); // js-yaml uses 0-based, we convert to 1-based
      expect(result.errors[0].column).toBe(21);
    });

    it("handles YAML with warnings", async () => {
      const yamlContent = "test: value";
      const parsedData = { test: "value" };
      const warnings: any[] = [];

      mockYaml.load.mockImplementation((content, options: any) => {
        if (options?.onWarning) {
          options.onWarning({ message: "Deprecated syntax" });
        }
        return parsedData;
      });

      const result = await validator.validateYAML({
        yaml: yamlContent,
        fileType: "custom",
      });

      expect(result.valid).toBe(true);
      // Warnings would be captured by onWarning callback
    });
  });

  describe("checkConfiguration", () => {
    it("validates syntax first before checking configuration", async () => {
      const yamlContent = "homeassistant:\n  name: Home";
      const parsedData = { homeassistant: { name: "Home" } };

      mockYaml.load.mockReturnValue(parsedData);

      const result = await validator.checkConfiguration({
        yaml: yamlContent,
        fileType: "configuration",
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("returns syntax errors if YAML is invalid", async () => {
      const yamlContent = "invalid: [";
      const error = new Error("YAML syntax error");
      (error as any).mark = { line: 0, column: 10 };

      mockYaml.load.mockImplementation(() => {
        throw error;
      });

      const result = await validator.checkConfiguration({
        yaml: yamlContent,
        fileType: "configuration",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("reloadConfiguration", () => {
    it("reloads automation configuration", async () => {
      const mockClient = {
        callService: jest.fn().mockResolvedValue({}),
      };
      mockHARestClient.mockReturnValue(mockClient as any);

      const result = await validator.reloadConfiguration("automation");

      expect(result.success).toBe(true);
      expect(result.reloaded).toContain("automation");
      expect(mockClient.callService).toHaveBeenCalledWith("automation", "reload", {});
    });

    it("reloads script configuration", async () => {
      const mockClient = {
        callService: jest.fn().mockResolvedValue({}),
      };
      mockHARestClient.mockReturnValue(mockClient as any);

      const result = await validator.reloadConfiguration("script");

      expect(result.success).toBe(true);
      expect(result.reloaded).toContain("script");
      expect(mockClient.callService).toHaveBeenCalledWith("script", "reload", {});
    });

    it("handles unknown domain", async () => {
      const result = await validator.reloadConfiguration("unknown");

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain("Unknown configuration domain");
    });

    it("handles HA service call errors", async () => {
      const mockClient = {
        callService: jest.fn().mockRejectedValue(new Error("HA service error")),
      };
      mockHARestClient.mockReturnValue(mockClient as any);

      const result = await validator.reloadConfiguration("automation");

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
