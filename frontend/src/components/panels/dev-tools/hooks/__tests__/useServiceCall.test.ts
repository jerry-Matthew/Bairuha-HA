/**
 * useServiceCall Hook Tests
 * 
 * Tests for the service call hook including:
 * - Service call execution
 * - Success and error handling
 * - Result management
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useServiceCall } from "../useServiceCall";

// Mock fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("useServiceCall", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("initializes with empty state", () => {
    const { result } = renderHook(() => useServiceCall());

    expect(result.current.loading).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("executes service call successfully", async () => {
    const mockResponse = {
      success: true,
      result: { state: "on" },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useServiceCall());

    await result.current.executeServiceCall({
      domain: "light",
      service: "turn_on",
      serviceData: { entity_id: "light.example" },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.result).toEqual({
        success: true,
        result: mockResponse,
      });
      expect(result.current.error).toBeNull();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/service-call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: "light",
        service: "turn_on",
        serviceData: { entity_id: "light.example" },
      }),
    });
  });

  it("executes service call without serviceData", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const { result } = renderHook(() => useServiceCall());

    await result.current.executeServiceCall({
      domain: "light",
      service: "turn_off",
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/service-call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: "light",
        service: "turn_off",
        serviceData: undefined,
      }),
    });
  });

  it("handles API error responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Service call failed" }),
    } as Response);

    const { result } = renderHook(() => useServiceCall());

    await result.current.executeServiceCall({
      domain: "light",
      service: "turn_on",
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Service call failed");
      expect(result.current.result).toEqual({
        success: false,
        error: "Service call failed",
      });
    });
  });

  it("handles network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useServiceCall());

    await result.current.executeServiceCall({
      domain: "light",
      service: "turn_on",
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Network error");
      expect(result.current.result).toEqual({
        success: false,
        error: "Network error",
      });
    });
  });

  it("clears result", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, result: { state: "on" } }),
    } as Response);

    const { result } = renderHook(() => useServiceCall());

    // Execute a service call to set state
    await result.current.executeServiceCall({
      domain: "light",
      service: "turn_on",
    });

    await waitFor(() => {
      expect(result.current.result).not.toBeNull();
    });

    // Clear the result
    result.current.clearResult();

    await waitFor(() => {
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
