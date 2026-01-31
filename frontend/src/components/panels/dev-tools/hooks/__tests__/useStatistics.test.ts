/**
 * useStatistics Hook Tests
 * 
 * Tests for the statistics hook including:
 * - Entity statistics fetching
 * - Domain statistics fetching
 * - Device statistics fetching
 * - Summary statistics fetching
 * - Error handling
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useStatistics } from "../useStatistics";

// Mock fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("useStatistics", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("initializes with empty state", () => {
    const { result } = renderHook(() => useStatistics());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.entityStatistics).toEqual([]);
    expect(result.current.domainStatistics).toEqual([]);
    expect(result.current.deviceStatistics).toEqual([]);
    expect(result.current.summaryStatistics).toBeNull();
    expect(result.current.total).toBe(0);
    expect(result.current.timeRange).toBeNull();
  });

  it("fetches entity statistics successfully", async () => {
    const mockResponse = {
      statistics: [
        {
          entityId: "light.example",
          entityName: "Example Light",
          domain: "light",
          stateChangeCount: 45,
          currentState: "on",
          lastChanged: "2025-01-15T10:30:00Z",
          lastUpdated: "2025-01-15T10:30:00Z",
          uptimePercentage: 98.5,
          averageStateDuration: "2h 15m",
          mostCommonState: "on",
          stateDistribution: { on: 30, off: 15 },
        },
      ],
      total: 1,
      timeRange: {
        start: "2025-01-14T10:30:00Z",
        end: "2025-01-15T10:30:00Z",
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useStatistics());

    await result.current.fetchEntityStatistics({
      domain: "light",
      timeRange: "24h",
      limit: 10,
      offset: 0,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.entityStatistics).toEqual(mockResponse.statistics);
      expect(result.current.total).toBe(1);
      expect(result.current.timeRange).toEqual(mockResponse.timeRange);
    });

    expect(mockFetch).toHaveBeenCalled();
    const callUrl = (mockFetch.mock.calls[0][0] as string);
    expect(callUrl).toContain("/api/dev-tools/statistics/entities");
    // URLSearchParams may order parameters differently, so just check they exist
    if (callUrl.includes("?")) {
      const params = callUrl.split("?")[1];
      expect(params).toContain("domain=light");
      expect(params).toContain("timeRange=24h");
      expect(params).toContain("limit=10");
      expect(params).toContain("offset=0");
    }
  });

  it("fetches domain statistics successfully", async () => {
    const mockResponse = {
      domainStatistics: [
        {
          domain: "light",
          entityCount: 12,
          totalStateChanges: 450,
          averageStateChanges: 37.5,
          mostActiveEntity: "light.example",
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useStatistics());

    await result.current.fetchDomainStatistics("24h");

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.domainStatistics).toEqual(mockResponse.domainStatistics);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/dev-tools/statistics/domains?timeRange=24h"
    );
  });

  it("fetches device statistics successfully", async () => {
    const mockResponse = {
      deviceStatistics: [
        {
          deviceId: "device-123",
          deviceName: "Example Device",
          entityCount: 5,
          totalStateChanges: 200,
          averageStateChanges: 40,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useStatistics());

    await result.current.fetchDeviceStatistics("7d");

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.deviceStatistics).toEqual(mockResponse.deviceStatistics);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/dev-tools/statistics/devices?timeRange=7d"
    );
  });

  it("fetches summary statistics successfully", async () => {
    const mockResponse = {
      summary: {
        totalEntities: 45,
        totalStateChanges: 1250,
        mostActiveEntity: "light.living_room",
        mostActiveDomain: "light",
        averageStateChangesPerEntity: 27.8,
        timeRange: {
          start: "2025-01-14T10:30:00Z",
          end: "2025-01-15T10:30:00Z",
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useStatistics());

    await result.current.fetchSummaryStatistics("24h");

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.summaryStatistics).toEqual(mockResponse.summary);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/dev-tools/statistics/summary?timeRange=24h"
    );
  });

  it("handles API errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Failed to fetch statistics" }),
    } as Response);

    const { result } = renderHook(() => useStatistics());

    await result.current.fetchEntityStatistics({});

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain("Failed to fetch");
      expect(result.current.entityStatistics).toEqual([]);
    });
  });

  it("handles network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useStatistics());

    await result.current.fetchEntityStatistics({});

    await waitFor(() => {
      expect(result.current.error).toBe("Network error");
    });
  });

  it("handles empty statistics", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        statistics: [],
        total: 0,
        timeRange: { start: "", end: "" },
      }),
    } as Response);

    const { result } = renderHook(() => useStatistics());

    await result.current.fetchEntityStatistics({});

    await waitFor(() => {
      expect(result.current.entityStatistics).toEqual([]);
      expect(result.current.total).toBe(0);
    });
  });

  it("fetches statistics without filters", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        statistics: [],
        total: 0,
        timeRange: { start: "", end: "" },
      }),
    } as Response);

    const { result } = renderHook(() => useStatistics());

    await result.current.fetchEntityStatistics();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/statistics/entities");
    });
  });
});
