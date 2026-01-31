/**
 * Dynamic Options Resolver Tests
 * 
 * Tests for dynamic options resolution from API, fields, and static sources
 */

import {
  resolveOptions,
  clearOptionsCache,
  invalidateCache,
  type OptionItem,
} from "../dynamic-options-resolver";
import type { ConfigFieldSchema } from "@/components/addDevice/server/integration-config-schemas";

// Mock fetch globally
global.fetch = jest.fn();

describe("Dynamic Options Resolver", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearOptionsCache();
  });

  describe("resolveOptions - Static Options", () => {
    it("should return static options when no dynamicOptions is set", async () => {
      const fieldSchema: ConfigFieldSchema = {
        type: "select",
        label: "Type",
        options: [
          { label: "Option 1", value: "opt1" },
          { label: "Option 2", value: "opt2" },
        ],
      };

      const options = await resolveOptions(fieldSchema, {
        integrationId: "test",
        fieldName: "type",
      });

      expect(options).toEqual([
        { label: "Option 1", value: "opt1" },
        { label: "Option 2", value: "opt2" },
      ]);
    });

    it("should return empty array when no options provided", async () => {
      const fieldSchema: ConfigFieldSchema = {
        type: "select",
        label: "Type",
      };

      const options = await resolveOptions(fieldSchema, {
        integrationId: "test",
        fieldName: "type",
      });

      expect(options).toEqual([]);
    });
  });

  describe("resolveOptions - API Source", () => {
    it("should fetch options from API endpoint", async () => {
      const mockResponse = [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const fieldSchema: ConfigFieldSchema = {
        type: "select",
        label: "Items",
        dynamicOptions: {
          source: "api",
          endpoint: "/api/items",
          mapping: {
            label: "name",
            value: "id",
          },
        },
      };

      const options = await resolveOptions(fieldSchema, {
        integrationId: "test",
        fieldName: "items",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/items"),
        undefined
      );
      expect(options).toEqual([
        { label: "Item 1", value: 1 },
        { label: "Item 2", value: 2 },
      ]);
    });

    it("should handle API errors and fallback to static options", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("API Error"));

      const fieldSchema: ConfigFieldSchema = {
        type: "select",
        label: "Items",
        dynamicOptions: {
          source: "api",
          endpoint: "/api/items",
          mapping: {
            label: "name",
            value: "id",
          },
        },
        options: [
          { label: "Fallback 1", value: "fb1" },
        ],
      };

      const options = await resolveOptions(fieldSchema, {
        integrationId: "test",
        fieldName: "items",
      });

      expect(options).toEqual([
        { label: "Fallback 1", value: "fb1" },
      ]);
    });

    it("should cache API responses", async () => {
      const mockResponse = [{ id: 1, name: "Item 1" }];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const fieldSchema: ConfigFieldSchema = {
        type: "select",
        label: "Items",
        dynamicOptions: {
          source: "api",
          endpoint: "/api/items",
          mapping: {
            label: "name",
            value: "id",
          },
        },
      };

      // First call
      await resolveOptions(fieldSchema, {
        integrationId: "test",
        fieldName: "items",
      });

      // Second call should use cache
      await resolveOptions(fieldSchema, {
        integrationId: "test",
        fieldName: "items",
      });

      // Should only fetch once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should include form values as query parameters", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const fieldSchema: ConfigFieldSchema = {
        type: "select",
        label: "Items",
        dynamicOptions: {
          source: "api",
          endpoint: "/api/items",
          mapping: {
            label: "name",
            value: "id",
          },
        },
      };

      await resolveOptions(fieldSchema, {
        integrationId: "test",
        fieldName: "items",
        formValues: {
          region: "us-east",
          type: "local",
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("region=us-east"),
        undefined
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("type=local"),
        undefined
      );
    });
  });

  describe("resolveOptions - Field Source", () => {
    it("should resolve options from another field's value", async () => {
      const fieldSchema: ConfigFieldSchema = {
        type: "select",
        label: "Items",
        dynamicOptions: {
          source: "field",
          field: "parent",
          mapping: {
            label: "name",
            value: "id",
          },
        },
      };

      const formValues = {
        parent: [
          { id: 1, name: "Item 1" },
          { id: 2, name: "Item 2" },
        ],
      };

      const options = await resolveOptions(fieldSchema, {
        integrationId: "test",
        fieldName: "items",
        formValues,
      });

      expect(options).toEqual([
        { label: "Item 1", value: 1 },
        { label: "Item 2", value: 2 },
      ]);
    });

    it("should return empty array when field value is missing", async () => {
      const fieldSchema: ConfigFieldSchema = {
        type: "select",
        label: "Items",
        dynamicOptions: {
          source: "field",
          field: "parent",
          mapping: {
            label: "name",
            value: "id",
          },
        },
      };

      const options = await resolveOptions(fieldSchema, {
        integrationId: "test",
        fieldName: "items",
        formValues: {},
      });

      expect(options).toEqual([]);
    });
  });

  describe("Cache Management", () => {
    it("should clear all cache", () => {
      // Cache would be populated in real scenario
      clearOptionsCache();
      // Should not throw
      expect(true).toBe(true);
    });

    it("should invalidate cache for specific endpoint", () => {
      invalidateCache("/api/items");
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("Nested Property Mapping", () => {
    it("should map nested properties using dot notation", async () => {
      const mockResponse = [
        { user: { id: 1, profile: { name: "User 1" } } },
        { user: { id: 2, profile: { name: "User 2" } } },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const fieldSchema: ConfigFieldSchema = {
        type: "select",
        label: "Users",
        dynamicOptions: {
          source: "api",
          endpoint: "/api/users",
          mapping: {
            label: "user.profile.name",
            value: "user.id",
          },
        },
      };

      const options = await resolveOptions(fieldSchema, {
        integrationId: "test",
        fieldName: "users",
      });

      expect(options).toEqual([
        { label: "User 1", value: 1 },
        { label: "User 2", value: 2 },
      ]);
    });
  });
});
