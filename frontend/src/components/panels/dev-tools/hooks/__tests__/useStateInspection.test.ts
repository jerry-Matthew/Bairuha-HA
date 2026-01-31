/**
 * useStateInspection Hook Tests
 * 
 * Tests for the entity state inspection hook including:
 * - Entity fetching with filters
 * - Pagination
 * - Error handling
 * - Entity detail fetching
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useStateInspection } from "../useStateInspection";

// Mock fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("useStateInspection", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("initializes with empty state", () => {
    const { result } = renderHook(() => useStateInspection());

    expect(result.current.entities).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("fetches entities successfully", async () => {
    const mockEntities = [
      {
        id: "1",
        entityId: "light.living_room",
        domain: "light",
        name: "Living Room Light",
        state: "on",
        attributes: {},
        lastUpdated: "2024-01-01T00:00:00Z",
        createdAt: "2024-01-01T00:00:00Z",
        deviceId: "device1",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        entities: mockEntities,
        total: 1,
        filters: {},
      }),
    } as Response);

    const { result } = renderHook(() => useStateInspection());

    await result.current.fetchEntities();

    await waitFor(() => {
      expect(result.current.entities).toEqual(mockEntities);
      expect(result.current.total).toBe(1);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/entities");
  });

  it("applies filters when fetching entities", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        entities: [],
        total: 0,
        filters: { domain: "light", state: "on" },
      }),
    } as Response);

    const { result } = renderHook(() => useStateInspection());

    await result.current.fetchEntities({
      domain: "light",
      state: "on",
      source: "ha",
      limit: 25,
      offset: 0,
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
      const callUrl = (mockFetch.mock.calls[0][0] as string);
      expect(callUrl).toContain("domain=light");
      expect(callUrl).toContain("state=on");
      expect(callUrl).toContain("source=ha");
      expect(callUrl).toContain("limit=25");
      // offset=0 might be omitted, so we check if it exists OR if offset is not in URL when it's 0
      if (callUrl.includes("offset")) {
        expect(callUrl).toContain("offset=0");
      }
    });
  });

  it("handles fetch errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useStateInspection());

    await result.current.fetchEntities();

    await waitFor(() => {
      expect(result.current.error).toBe("Network error");
      expect(result.current.entities).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });

  it("handles API error responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const { result } = renderHook(() => useStateInspection());

    await result.current.fetchEntities();

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to fetch entities");
      expect(result.current.entities).toEqual([]);
    });
  });

  it("fetches entity detail successfully", async () => {
    const mockEntity = {
      id: "1",
      entityId: "light.living_room",
      domain: "light",
      name: "Living Room Light",
      state: "on",
      attributes: { brightness: 255 },
      lastUpdated: "2024-01-01T00:00:00Z",
      createdAt: "2024-01-01T00:00:00Z",
      deviceId: "device1",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entity: mockEntity }),
    } as Response);

    const { result } = renderHook(() => useStateInspection());

    const entity = await result.current.fetchEntityDetail("light.living_room");

    expect(entity).toEqual(mockEntity);
    expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/entities/light.living_room");
  });

  it("returns null when entity detail not found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const { result } = renderHook(() => useStateInspection());

    const entity = await result.current.fetchEntityDetail("light.nonexistent");

    expect(entity).toBeNull();
  });

  it("handles entity detail fetch errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useStateInspection());

    const entity = await result.current.fetchEntityDetail("light.living_room");

    expect(entity).toBeNull();
  });
});
