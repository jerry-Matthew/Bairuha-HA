/**
 * useTemplateTest Hook Tests
 * 
 * Tests for the template test hook including:
 * - Template testing
 * - Template validation
 * - Error handling
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useTemplateTest } from "../useTemplateTest";

// Mock fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("useTemplateTest", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("initializes with empty state", () => {
    const { result } = renderHook(() => useTemplateTest());

    expect(result.current.testing).toBe(false);
    expect(result.current.validating).toBe(false);
    expect(result.current.testResult).toBeNull();
    expect(result.current.validationResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("tests template successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: "on",
      }),
    } as Response);

    const { result } = renderHook(() => useTemplateTest());

    await result.current.testTemplate({
      template: "{{ states('light.example') }}",
      variables: { name: "World" },
    });

    await waitFor(() => {
      expect(result.current.testing).toBe(false);
      expect(result.current.testResult).toEqual({
        success: true,
        result: "on",
      });
      expect(result.current.error).toBeNull();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/templates/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template: "{{ states('light.example') }}",
        variables: { name: "World" },
      }),
    });
  });

  it("tests template without variables", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: "test" }),
    } as Response);

    const { result } = renderHook(() => useTemplateTest());

    await result.current.testTemplate({
      template: "{{ states('light.example') }}",
    });

    await waitFor(() => {
      expect(result.current.testResult).toBeTruthy();
    });
  });

  it("validates template successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        valid: true,
      }),
    } as Response);

    const { result } = renderHook(() => useTemplateTest());

    await result.current.validateTemplate("{{ states('light.example') }}");

    await waitFor(() => {
      expect(result.current.validating).toBe(false);
      expect(result.current.validationResult).toEqual({
        valid: true,
        error: undefined,
      });
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/templates/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template: "{{ states('light.example') }}",
      }),
    });
  });

  it("handles validation errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        valid: false,
        error: "Syntax error at line 1",
      }),
    } as Response);

    const { result } = renderHook(() => useTemplateTest());

    await result.current.validateTemplate("{{ invalid syntax }}");

    await waitFor(() => {
      expect(result.current.validationResult).toEqual({
        valid: false,
        error: "Syntax error at line 1",
      });
    });
  });

  it("handles test API errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Template test failed" }),
    } as Response);

    const { result } = renderHook(() => useTemplateTest());

    await result.current.testTemplate({
      template: "{{ invalid }}",
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Template test failed");
      expect(result.current.testResult).toEqual({
        success: false,
        error: "Template test failed",
      });
    });
  });

  it("clears results", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: "test" }),
    } as Response);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true }),
    } as Response);

    const { result } = renderHook(() => useTemplateTest());

    // Set some state by testing and validating
    await result.current.testTemplate({
      template: "{{ test }}",
    });

    await waitFor(() => {
      expect(result.current.testResult).not.toBeNull();
    });

    await result.current.validateTemplate("{{ test }}");

    await waitFor(() => {
      expect(result.current.validationResult).not.toBeNull();
    });

    // Clear results
    result.current.clearResults();

    await waitFor(() => {
      expect(result.current.testResult).toBeNull();
      expect(result.current.validationResult).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});
