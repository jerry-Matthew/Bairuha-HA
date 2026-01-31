/**
 * useSystemInfo Hook Tests
 * 
 * Tests for the system info hook including:
 * - System info fetching
 * - Auto-refresh functionality
 * - Health, info, and config data
 */

import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { useSystemInfo } from "../useSystemInfo";

// Mock fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("useSystemInfo", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.useFakeTimers();
    // Default mocks for initial fetch on mount
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("initializes with empty state", async () => {
    const { result } = renderHook(() => useSystemInfo());

    // The hook fetches on mount, so wait for it to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 3000 });

    // After initial fetch, these should be set (even if empty objects from mock)
    expect(result.current.health).toBeTruthy();
    expect(result.current.info).toBeTruthy();
    expect(result.current.config).toBeTruthy();
    expect(result.current.error).toBeNull();
    expect(result.current.autoRefresh).toBe(false);
  });

  it("fetches all system info on mount", async () => {
    const mockHealth = { status: "healthy", uptime: 3600 };
    const mockInfo = { version: "1.0.0", platform: "linux" };
    const mockConfig = { setting1: "value1" };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealth,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInfo,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      } as Response);

    const { result } = renderHook(() => useSystemInfo());

    await waitFor(() => {
      expect(result.current.health).toEqual({
        ...mockHealth,
        lastChecked: expect.any(String),
      });
      expect(result.current.info).toEqual(mockInfo);
      expect(result.current.config).toEqual(mockConfig);
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/system/health");
    expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/system/info");
    expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/system/config");
  });

  it("handles fetch errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useSystemInfo());

    await waitFor(() => {
      expect(result.current.error).toBe("Network error");
      expect(result.current.loading).toBe(false);
    });
  });

  it("handles partial fetch failures", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "healthy" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Failed" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

    const { result } = renderHook(() => useSystemInfo());

    await waitFor(() => {
      // One of the fetches will fail, so error should be set
      expect(result.current.error).toBeTruthy();
    }, { timeout: 3000 });
  });

  it("refreshes data when refresh is called", async () => {
    const { result } = renderHook(() => useSystemInfo());

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    }, { timeout: 3000 });

    mockFetch.mockClear();

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, { timeout: 3000 });
  });

  it("enables auto-refresh", async () => {
    const { result } = renderHook(() => useSystemInfo());

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    mockFetch.mockClear();

    act(() => {
      result.current.setAutoRefresh(true);
    });

    expect(result.current.autoRefresh).toBe(true);

    // Fast-forward timer
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it("disables auto-refresh", async () => {
    const { result } = renderHook(() => useSystemInfo());

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    act(() => {
      result.current.setAutoRefresh(true);
    });
    expect(result.current.autoRefresh).toBe(true);

    act(() => {
      result.current.setAutoRefresh(false);
    });
    expect(result.current.autoRefresh).toBe(false);

    mockFetch.mockClear();
    
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Should not fetch when auto-refresh is disabled
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
