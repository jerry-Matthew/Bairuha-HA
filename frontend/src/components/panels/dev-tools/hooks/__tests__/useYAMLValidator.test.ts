/**
 * useYAMLValidator Hook Tests
 * 
 * Tests for the YAML validator hook including:
 * - YAML validation
 * - Configuration checking
 * - Configuration reloading
 * - Error handling
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useYAMLValidator } from "../useYAMLValidator";

// Mock fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("useYAMLValidator", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("initializes with empty state", () => {
    const { result } = renderHook(() => useYAMLValidator());

    expect(result.current.validating).toBe(false);
    expect(result.current.checking).toBe(false);
    expect(result.current.reloading).toBe(false);
    expect(result.current.validationResult).toBeNull();
    expect(result.current.checkResult).toBeNull();
    expect(result.current.reloadResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("validates YAML successfully", async () => {
    const mockResponse = {
      valid: true,
      errors: [],
      warnings: [],
      data: { homeassistant: { name: "Home" } },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useYAMLValidator());

    await result.current.validateYAML({
      yaml: "homeassistant:\n  name: Home",
      fileType: "configuration",
    });

    await waitFor(() => {
      expect(result.current.validating).toBe(false);
      expect(result.current.validationResult).toEqual(mockResponse);
      expect(result.current.error).toBeNull();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/yaml/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        yaml: "homeassistant:\n  name: Home",
        fileType: "configuration",
      }),
    });
  });

  it("validates YAML with errors", async () => {
    const mockResponse = {
      valid: false,
      errors: [
        {
          message: "YAML syntax error",
          line: 2,
          column: 3,
          detail: "expected mapping key",
        },
      ],
      warnings: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useYAMLValidator());

    await result.current.validateYAML({
      yaml: "invalid: yaml: content",
      fileType: "custom",
    });

    await waitFor(() => {
      expect(result.current.validating).toBe(false);
      expect(result.current.validationResult).toEqual(mockResponse);
    });
  });

  it("checks configuration successfully", async () => {
    const mockResponse = {
      valid: true,
      errors: [],
      warnings: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useYAMLValidator());

    await result.current.checkConfiguration({
      yaml: "homeassistant:\n  name: Home",
      fileType: "configuration",
    });

    await waitFor(() => {
      expect(result.current.checking).toBe(false);
      expect(result.current.checkResult).toEqual(mockResponse);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/yaml/check-config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        yaml: "homeassistant:\n  name: Home",
        fileType: "configuration",
      }),
    });
  });

  it("reloads configuration successfully", async () => {
    const mockResponse = {
      success: true,
      reloaded: ["automation"],
      errors: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useYAMLValidator());

    await result.current.reloadConfiguration("automation");

    await waitFor(() => {
      expect(result.current.reloading).toBe(false);
      expect(result.current.reloadResult).toEqual(mockResponse);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/yaml/reload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: "automation",
      }),
    });
  });

  it("handles validation API errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Validation failed" }),
    } as Response);

    const { result } = renderHook(() => useYAMLValidator());

    await result.current.validateYAML({
      yaml: "test",
      fileType: "custom",
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain("Failed to validate YAML");
      expect(result.current.validationResult).toBeNull();
    });
  });

  it("handles network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useYAMLValidator());

    await result.current.validateYAML({
      yaml: "test",
      fileType: "custom",
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Network error");
    });
  });

  it("clears results", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true, errors: [], warnings: [] }),
    } as Response);

    const { result } = renderHook(() => useYAMLValidator());

    await result.current.validateYAML({
      yaml: "test",
      fileType: "custom",
    });

    await waitFor(() => {
      expect(result.current.validationResult).not.toBeNull();
    });

    result.current.clearResults();

    await waitFor(() => {
      expect(result.current.validationResult).toBeNull();
      expect(result.current.checkResult).toBeNull();
      expect(result.current.reloadResult).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
