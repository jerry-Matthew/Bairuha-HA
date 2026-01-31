/**
 * Flow Type Resolver Tests
 * 
 * Tests for the flow type resolver service
 */

import {
  getFlowType,
  getFlowConfig,
  getFlowMetadata,
  clearFlowTypeCache,
  clearFlowTypeCacheForDomain,
  type FlowType,
} from "../flow-type-resolver";
import { query } from "@/lib/db";

// Mock dependencies
jest.mock("@/lib/db");

const mockQuery = query as jest.MockedFunction<typeof query>;

describe("Flow Type Resolver", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearFlowTypeCache();
  });

  describe("getFlowType", () => {
    it("returns flow type from catalog", async () => {
      mockQuery.mockResolvedValueOnce([
        {
          flow_type: "manual",
          flow_config: null,
          metadata: null,
        },
      ]);

      const result = await getFlowType("test_integration");

      expect(result).toBe("manual");
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("SELECT flow_type, flow_config, metadata"),
        ["test_integration"]
      );
    });

    it("defaults to manual when integration not in catalog", async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await getFlowType("unknown_integration");

      expect(result).toBe("manual");
    });

    it("defaults to manual when flow_type is null", async () => {
      mockQuery.mockResolvedValueOnce([
        {
          flow_type: null,
          flow_config: null,
          metadata: null,
        },
      ]);

      const result = await getFlowType("test_integration");

      expect(result).toBe("manual");
    });

    it("caches flow type lookups", async () => {
      mockQuery.mockResolvedValueOnce([
        {
          flow_type: "discovery",
          flow_config: null,
          metadata: null,
        },
      ]);

      const result1 = await getFlowType("test_integration");
      const result2 = await getFlowType("test_integration");

      expect(result1).toBe("discovery");
      expect(result2).toBe("discovery");
      expect(mockQuery).toHaveBeenCalledTimes(1); // Should only query once
    });

    it("handles database errors gracefully", async () => {
      mockQuery.mockRejectedValueOnce(new Error("Database error"));

      const result = await getFlowType("test_integration");

      expect(result).toBe("manual"); // Should default to manual on error
    });

    it("supports all flow types", async () => {
      const flowTypes: FlowType[] = ["none", "manual", "discovery", "oauth", "wizard", "hybrid"];

      for (const flowType of flowTypes) {
        mockQuery.mockResolvedValueOnce([
          {
            flow_type: flowType,
            flow_config: null,
            metadata: null,
          },
        ]);

        clearFlowTypeCache();
        const result = await getFlowType(`test_${flowType}`);
        expect(result).toBe(flowType);
      }
    });
  });

  describe("getFlowConfig", () => {
    it("returns flow config from catalog", async () => {
      const flowConfig = {
        discovery_protocols: {
          dhcp: [{ hostname: "test-device" }],
        },
      };

      mockQuery.mockResolvedValueOnce([
        {
          flow_type: "discovery",
          flow_config: JSON.stringify(flowConfig),
          metadata: null,
        },
      ]);

      const result = await getFlowConfig("test_integration");

      expect(result).toEqual(flowConfig);
    });

    it("returns null when flow config is not set", async () => {
      mockQuery.mockResolvedValueOnce([
        {
          flow_type: "manual",
          flow_config: null,
          metadata: null,
        },
      ]);

      const result = await getFlowConfig("test_integration");

      expect(result).toBeNull();
    });

    it("uses cache when available", async () => {
      const flowConfig = { oauth_provider: "google" };

      mockQuery.mockResolvedValueOnce([
        {
          flow_type: "oauth",
          flow_config: JSON.stringify(flowConfig),
          metadata: null,
        },
      ]);

      // First call loads cache
      await getFlowType("test_integration");
      
      // Second call uses cache
      const result = await getFlowConfig("test_integration");

      expect(result).toEqual(flowConfig);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it("handles string and object flow_config", async () => {
      const flowConfig = { steps: [{ step_id: "step1", title: "Step 1", schema: {} }] };

      // Test with string (JSON)
      mockQuery.mockResolvedValueOnce([
        {
          flow_type: "wizard",
          flow_config: JSON.stringify(flowConfig),
          metadata: null,
        },
      ]);

      const result1 = await getFlowConfig("test_wizard");
      expect(result1).toEqual(flowConfig);

      clearFlowTypeCache();

      // Test with object (already parsed)
      mockQuery.mockResolvedValueOnce([
        {
          flow_type: "wizard",
          flow_config: flowConfig,
          metadata: null,
        },
      ]);

      const result2 = await getFlowConfig("test_wizard2");
      expect(result2).toEqual(flowConfig);
    });
  });

  describe("getFlowMetadata", () => {
    it("returns metadata from catalog", async () => {
      const metadata = {
        requirements: ["package1", "package2"],
        dependencies: ["dep1"],
      };

      mockQuery.mockResolvedValueOnce([
        {
          flow_type: "manual",
          flow_config: null,
          metadata: JSON.stringify(metadata),
        },
      ]);

      const result = await getFlowMetadata("test_integration");

      expect(result).toEqual(metadata);
    });

    it("returns null when metadata is not set", async () => {
      mockQuery.mockResolvedValueOnce([
        {
          flow_type: "manual",
          flow_config: null,
          metadata: null,
        },
      ]);

      const result = await getFlowMetadata("test_integration");

      expect(result).toBeNull();
    });

    it("uses cache when available", async () => {
      const metadata = { codeowners: ["@user1"] };

      mockQuery.mockResolvedValueOnce([
        {
          flow_type: "manual",
          flow_config: null,
          metadata: JSON.stringify(metadata),
        },
      ]);

      // First call loads cache
      await getFlowType("test_integration");
      
      // Second call uses cache
      const result = await getFlowMetadata("test_integration");

      expect(result).toEqual(metadata);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe("Cache Management", () => {
    it("clears entire cache", async () => {
      mockQuery.mockResolvedValue([
        {
          flow_type: "manual",
          flow_config: null,
          metadata: null,
        },
      ]);

      await getFlowType("test1");
      await getFlowType("test2");

      clearFlowTypeCache();

      // After clearing, should query again
      await getFlowType("test1");
      expect(mockQuery).toHaveBeenCalledTimes(3); // 2 initial + 1 after clear
    });

    it("clears specific domain from cache", async () => {
      mockQuery.mockResolvedValue([
        {
          flow_type: "manual",
          flow_config: null,
          metadata: null,
        },
      ]);

      await getFlowType("test1");
      await getFlowType("test2");

      clearFlowTypeCacheForDomain("test1");

      // test1 should query again, test2 should use cache
      await getFlowType("test1");
      await getFlowType("test2");

      expect(mockQuery).toHaveBeenCalledTimes(3); // 2 initial + 1 for test1 after clear
    });
  });
});
