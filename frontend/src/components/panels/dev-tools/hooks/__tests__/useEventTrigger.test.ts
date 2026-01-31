/**
 * useEventTrigger Hook Tests
 * 
 * Tests for the event trigger hook including:
 * - Event type fetching
 * - Event triggering
 * - Error handling
 */

import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { useEventTrigger } from "../useEventTrigger";

// Mock fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("useEventTrigger", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Default mock for event types fetch on mount
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ eventTypes: [] }),
    } as Response);
  });

  it("initializes with empty state", async () => {
    const { result } = renderHook(() => useEventTrigger());

    // Event types may be loading initially, so wait for fetch to complete
    await waitFor(() => {
      expect(result.current.loadingEventTypes).toBe(false);
    });

    expect(result.current.eventTypes).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("fetches event types on mount", async () => {
    const mockEventTypes = ["entity_state_changed", "automation_triggered"];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ eventTypes: mockEventTypes }),
    } as Response);

    const { result } = renderHook(() => useEventTrigger());

    await waitFor(() => {
      expect(result.current.eventTypes).toEqual(mockEventTypes);
      expect(result.current.loadingEventTypes).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/events/types");
  });

  it("triggers event successfully", async () => {
    const { result } = renderHook(() => useEventTrigger());

    // Wait for initial event types fetch
    await waitFor(() => {
      expect(result.current.loadingEventTypes).toBe(false);
    });

    // Now mock the trigger call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        eventId: "event-123",
      }),
    } as Response);

    await act(async () => {
      await result.current.triggerEvent({
        eventType: "entity_state_changed",
        eventData: { entity_id: "light.example", state: "on" },
        metadata: { source: "manual" },
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.result).toEqual({
        success: true,
        eventId: "event-123",
        result: {
          success: true,
          eventId: "event-123",
        },
      });
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/events/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType: "entity_state_changed",
        eventData: { entity_id: "light.example", state: "on" },
        metadata: { source: "manual" },
      }),
    });
  });

  it("triggers event without metadata", async () => {
    const { result } = renderHook(() => useEventTrigger());

    await waitFor(() => {
      expect(result.current.loadingEventTypes).toBe(false);
    });

    // Now mock the trigger call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await act(async () => {
      await result.current.triggerEvent({
        eventType: "entity_state_changed",
        eventData: { entity_id: "light.example" },
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("handles trigger errors", async () => {
    const { result } = renderHook(() => useEventTrigger());

    // Wait for initial event types fetch
    await waitFor(() => {
      expect(result.current.loadingEventTypes).toBe(false);
    });

    // Now mock the failed trigger call
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Trigger failed" }),
    } as Response);

    await act(async () => {
      await result.current.triggerEvent({
        eventType: "test_event",
        eventData: {},
      });
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Trigger failed");
      expect(result.current.result).toEqual({
        success: false,
        error: "Trigger failed",
      });
    });
  });

  it("clears result", async () => {
    const { result } = renderHook(() => useEventTrigger());

    // Wait for event types to load
    await waitFor(() => {
      expect(result.current.loadingEventTypes).toBe(false);
    });

    // Mock the trigger call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, eventId: "event-123" }),
    } as Response);

    // Trigger an event to set state
    await act(async () => {
      await result.current.triggerEvent({
        eventType: "test_event",
        eventData: {},
      });
    });

    await waitFor(() => {
      expect(result.current.result).not.toBeNull();
    });

    // Clear the result
    act(() => {
      result.current.clearResult();
    });

    await waitFor(() => {
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
