/**
 * Dynamic Options API Tests
 * 
 * Tests for dynamic options API endpoints
 */

import { GET } from "../dynamic-options/[integrationId]/[fieldName]/route";
import { NextRequest } from "next/server";

// Mock dependencies
jest.mock("@/lib/config-flow/dynamic-options-resolver", () => ({
  resolveOptions: jest.fn(),
}));

jest.mock("@/components/addDevice/server/integration-config-schemas", () => ({
  getConfigSchema: jest.fn(),
}));

import { resolveOptions } from "@/lib/config-flow/dynamic-options-resolver";
import { getConfigSchema } from "@/components/addDevice/server/integration-config-schemas";

describe("Dynamic Options API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/config/dynamic-options/[integrationId]/[fieldName]", () => {
    it("should return options successfully", async () => {
      (getConfigSchema as jest.Mock).mockReturnValue({
        region: {
          type: "select",
          label: "Region",
        },
      });
      (resolveOptions as jest.Mock).mockResolvedValue([
        { label: "US East", value: "us-east" },
        { label: "US West", value: "us-west" },
      ]);

      const request = new NextRequest("http://localhost:3000/api/config/dynamic-options/test/region");
      const response = await GET(request, {
        params: { integrationId: "test", fieldName: "region" },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.options).toHaveLength(2);
      expect(data.options[0].label).toBe("US East");
    });

    it("should return 404 when field not found in schema", async () => {
      (getConfigSchema as jest.Mock).mockReturnValue({});

      const request = new NextRequest("http://localhost:3000/api/config/dynamic-options/test/invalid");
      const response = await GET(request, {
        params: { integrationId: "test", fieldName: "invalid" },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("not found");
    });

    it("should pass query parameters as form values", async () => {
      (getConfigSchema as jest.Mock).mockReturnValue({
        device: {
          type: "select",
          label: "Device",
          dynamicOptions: {
            source: "api",
            endpoint: "/api/devices",
          },
        },
      });
      (resolveOptions as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/config/dynamic-options/test/device?region=us-east&type=local"
      );
      await GET(request, {
        params: { integrationId: "test", fieldName: "device" },
      });

      expect(resolveOptions).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          formValues: expect.objectContaining({
            region: "us-east",
            type: "local",
          }),
        })
      );
    });

    it("should handle errors gracefully", async () => {
      (getConfigSchema as jest.Mock).mockReturnValue({
        region: {
          type: "select",
          label: "Region",
        },
      });
      (resolveOptions as jest.Mock).mockRejectedValue(new Error("API Error"));

      const request = new NextRequest("http://localhost:3000/api/config/dynamic-options/test/region");
      const response = await GET(request, {
        params: { integrationId: "test", fieldName: "region" },
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
