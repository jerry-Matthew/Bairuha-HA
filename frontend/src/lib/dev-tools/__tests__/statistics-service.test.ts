/**
 * Statistics Service Tests
 * 
 * Tests for the statistics service including:
 * - Entity statistics calculation
 * - Domain statistics calculation
 * - Device statistics calculation
 * - Summary statistics calculation
 */

import { getStatisticsService } from "../statistics-service";
import { query } from "@/lib/db";
import { getEntities } from "@/components/globalAdd/server/entity.registry";

// Mock dependencies
jest.mock("@/lib/db");
jest.mock("@/components/globalAdd/server/entity.registry");
jest.mock("@/lib/home-assistant/rest-client");

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockGetEntities = getEntities as jest.MockedFunction<typeof getEntities>;

describe("StatisticsService", () => {
  let service: ReturnType<typeof getStatisticsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = getStatisticsService();
  });

  describe("getEntityStatistics", () => {
    it("fetches entity statistics with filters", async () => {
      const mockEntities = [
        {
          id: "1",
          entityId: "light.example",
          name: "Example Light",
          domain: "light",
          state: "on",
          deviceId: "device-1",
          lastChanged: new Date("2025-01-15T10:30:00Z"),
          lastUpdated: new Date("2025-01-15T10:30:00Z"),
        },
      ];

      mockGetEntities.mockResolvedValue(mockEntities as any);

      mockQuery
        .mockResolvedValueOnce([
          {
            entity_id: "light.example",
            state_change_count: "45",
            last_recorded: new Date("2025-01-15T10:30:00Z"),
            unique_states: "2",
          },
        ])
        .mockResolvedValueOnce([
          { state: "on", count: "30" },
          { state: "off", count: "15" },
        ]);

      const result = await service.getEntityStatistics({
        domain: "light",
        timeRange: "24h",
        limit: 10,
        offset: 0,
      });

      expect(result.statistics).toHaveLength(1);
      expect(result.statistics[0].entityId).toBe("light.example");
      expect(result.statistics[0].stateChangeCount).toBe(45);
      expect(result.total).toBe(1);
      expect(result.timeRange).toBeDefined();
    });

    it("handles empty statistics", async () => {
      mockGetEntities.mockResolvedValue([]);
      mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.getEntityStatistics({
        timeRange: "24h",
      });

      expect(result.statistics).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("filters by domain", async () => {
      const mockEntities = [
        {
          id: "1",
          entityId: "light.example",
          domain: "light",
          state: "on",
          deviceId: "device-1",
          lastChanged: new Date(),
          lastUpdated: new Date(),
        },
        {
          id: "2",
          entityId: "switch.example",
          domain: "switch",
          state: "off",
          deviceId: "device-2",
          lastChanged: new Date(),
          lastUpdated: new Date(),
        },
      ];

      mockGetEntities.mockResolvedValue(mockEntities as any);
      mockQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.getEntityStatistics({
        domain: "light",
        timeRange: "24h",
      });

      // Should only include light entities
      expect(result.statistics.every((s) => s.domain === "light")).toBe(true);
    });
  });

  describe("getDomainStatistics", () => {
    it("calculates domain statistics", async () => {
      const mockEntities = [
        {
          id: "1",
          entityId: "light.example1",
          domain: "light",
          state: "on",
          deviceId: "device-1",
          lastChanged: new Date(),
          lastUpdated: new Date(),
        },
        {
          id: "2",
          entityId: "light.example2",
          domain: "light",
          state: "off",
          deviceId: "device-1",
          lastChanged: new Date(),
          lastUpdated: new Date(),
        },
      ];

      mockGetEntities.mockResolvedValue(mockEntities as any);
      mockQuery
        .mockResolvedValueOnce([{ total: "450" }])
        .mockResolvedValueOnce([{ entity_id: "light.example1", count: "250" }]);

      const result = await service.getDomainStatistics("24h");

      expect(result.length).toBeGreaterThan(0);
      expect(result.find((s) => s.domain === "light")).toBeDefined();
    });
  });

  describe("getDeviceStatistics", () => {
    it("calculates device statistics", async () => {
      const mockEntities = [
        {
          id: "1",
          entityId: "light.example1",
          domain: "light",
          deviceId: "device-1",
          name: "Device 1",
          state: "on",
          lastChanged: new Date(),
          lastUpdated: new Date(),
        },
      ];

      mockGetEntities.mockResolvedValue(mockEntities as any);
      mockQuery.mockResolvedValueOnce([{ total: "200" }]);

      const result = await service.getDeviceStatistics("24h");

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("getSummaryStatistics", () => {
    it("calculates summary statistics", async () => {
      const mockEntities = [
        {
          id: "1",
          entityId: "light.example",
          domain: "light",
          state: "on",
          deviceId: "device-1",
          lastChanged: new Date(),
          lastUpdated: new Date(),
        },
      ];

      mockGetEntities.mockResolvedValue(mockEntities as any);
      mockQuery
        .mockResolvedValueOnce([{ total: "1250" }])
        .mockResolvedValueOnce([{ entity_id: "light.example", count: "100" }]);

      const result = await service.getSummaryStatistics("24h");

      expect(result.totalEntities).toBe(1);
      expect(result.totalStateChanges).toBe(1250);
      expect(result.mostActiveEntity).toBe("light.example");
      expect(result.timeRange).toBeDefined();
    });
  });

  describe("parseTimeRange", () => {
    it("parses 1h time range", async () => {
      mockGetEntities.mockResolvedValue([]);
      mockQuery.mockResolvedValue([]);

      const result = await service.getEntityStatistics({ timeRange: "1h" });

      expect(result.timeRange).toBeDefined();
      const start = new Date(result.timeRange.start);
      const end = new Date(result.timeRange.end);
      const diff = end.getTime() - start.getTime();
      expect(diff).toBeCloseTo(60 * 60 * 1000, -3); // ~1 hour
    });

    it("parses 24h time range", async () => {
      mockGetEntities.mockResolvedValue([]);
      mockQuery.mockResolvedValue([]);

      const result = await service.getEntityStatistics({ timeRange: "24h" });

      const start = new Date(result.timeRange.start);
      const end = new Date(result.timeRange.end);
      const diff = end.getTime() - start.getTime();
      expect(diff).toBeCloseTo(24 * 60 * 60 * 1000, -3); // ~24 hours
    });

    it("defaults to 24h if no time range specified", async () => {
      mockGetEntities.mockResolvedValue([]);
      mockQuery.mockResolvedValue([]);

      const result = await service.getEntityStatistics({});

      const start = new Date(result.timeRange.start);
      const end = new Date(result.timeRange.end);
      const diff = end.getTime() - start.getTime();
      expect(diff).toBeCloseTo(24 * 60 * 60 * 1000, -3);
    });
  });
});
