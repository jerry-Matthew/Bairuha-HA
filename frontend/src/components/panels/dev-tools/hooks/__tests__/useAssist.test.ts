/**
 * useAssist Hook Tests
 * 
 * Tests for the Assist hook including:
 * - Message processing
 * - Conversation management
 * - Settings fetching and updating
 * - Examples fetching
 * - Error handling
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useAssist } from "../useAssist";

// Mock fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("useAssist", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("initializes with empty state", () => {
    const { result } = renderHook(() => useAssist());

    expect(result.current.processing).toBe(false);
    expect(result.current.loadingSettings).toBe(false);
    expect(result.current.loadingExamples).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.conversationResponse).toBeNull();
    expect(result.current.conversation).toBeNull();
    expect(result.current.settings).toBeNull();
    expect(result.current.examples).toBeNull();
    expect(result.current.currentConversationId).toBeNull();
  });

  it("processes message successfully", async () => {
    const mockResponse = {
      success: true,
      response: {
        speech: {
          plain: {
            speech: "I've turned on the living room light.",
          },
        },
        data: {
          conversation_id: "conv-123",
        },
      },
      conversationId: "conv-123",
    };

    const mockConversation = {
      conversationId: "conv-123",
      messages: [
        {
          role: "user" as const,
          message: "Turn on the living room light",
          timestamp: "2025-01-15T10:30:00Z",
        },
        {
          role: "assistant" as const,
          message: "I've turned on the living room light.",
          timestamp: "2025-01-15T10:30:00Z",
        },
      ],
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockConversation,
      } as Response);

    const { result } = renderHook(() => useAssist());

    await result.current.processMessage({
      message: "Turn on the living room light",
      language: "en",
    });

    await waitFor(() => {
      expect(result.current.processing).toBe(false);
      expect(result.current.conversationResponse).toEqual(mockResponse);
      expect(result.current.currentConversationId).toBe("conv-123");
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/assist/conversation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Turn on the living room light",
        language: "en",
        conversationId: null,
      }),
    });
  });

  it("processes message with existing conversation ID", async () => {
    const mockResponse = {
      success: true,
      response: {
        speech: { plain: { speech: "Response" } },
      },
      conversationId: "conv-123",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const { result } = renderHook(() => useAssist());

    // Set conversation ID first
    (result.current as any).currentConversationId = "conv-123";

    await result.current.processMessage({
      message: "What's the temperature?",
      language: "en",
      conversationId: "conv-123",
    });

    await waitFor(() => {
      expect(result.current.conversationResponse).toEqual(mockResponse);
    });
  });

  it("handles message processing errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Failed to process message" }),
    } as Response);

    const { result } = renderHook(() => useAssist());

    await result.current.processMessage({
      message: "Test message",
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to process message");
    });
  });

  it("fetches conversation history", async () => {
    const mockConversation = {
      conversationId: "conv-123",
      messages: [
        {
          role: "user" as const,
          message: "Hello",
          timestamp: "2025-01-15T10:30:00Z",
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockConversation,
    } as Response);

    const { result } = renderHook(() => useAssist());

    await result.current.fetchConversation("conv-123");

    await waitFor(() => {
      expect(result.current.conversation).toEqual(mockConversation);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/dev-tools/assist/conversation/conv-123");
  });

  it("handles conversation not found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Conversation not found" }),
    } as Response);

    const { result } = renderHook(() => useAssist());

    await result.current.fetchConversation("conv-123");

    // Should not throw, just log error
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it("clears conversation", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const { result } = renderHook(() => useAssist());

    // Clear a conversation
    await result.current.clearConversation("conv-123");
    
    // Verify the clear API was called
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/dev-tools/assist/conversation/conv-123/clear",
      expect.objectContaining({ method: "POST" })
    );
    
    // After clearing, conversation should be null
    expect(result.current.conversation).toBeNull();
    expect(result.current.currentConversationId).toBeNull();
  });

  it("fetches settings successfully", async () => {
    const mockSettings = {
      enabled: true,
      language: "en",
      supportedLanguages: ["en", "es", "fr", "de"],
      voiceEnabled: false,
      conversationAgents: [
        {
          id: "homeassistant",
          name: "Home Assistant",
          enabled: true,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSettings,
    } as Response);

    const { result } = renderHook(() => useAssist());

    await result.current.fetchSettings();

    await waitFor(() => {
      expect(result.current.loadingSettings).toBe(false);
      expect(result.current.settings).toEqual(mockSettings);
    });
  });

  it("updates settings successfully", async () => {
    const mockSettings = {
      enabled: true,
      language: "es",
      supportedLanguages: ["en", "es"],
      voiceEnabled: false,
      conversationAgents: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, settings: mockSettings }),
    } as Response);

    const { result } = renderHook(() => useAssist());

    await result.current.updateSettings({ language: "es" });

    await waitFor(() => {
      expect(result.current.loadingSettings).toBe(false);
      expect(result.current.settings).toEqual(mockSettings);
    });
  });

  it("fetches examples successfully", async () => {
    const mockExamples = {
      examples: [
        {
          category: "Light Control",
          commands: ["Turn on the light", "Turn off the light"],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockExamples,
    } as Response);

    const { result } = renderHook(() => useAssist());

    await result.current.fetchExamples();

    await waitFor(() => {
      expect(result.current.loadingExamples).toBe(false);
      expect(result.current.examples).toEqual(mockExamples);
    });
  });

  it("handles network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useAssist());

    await result.current.processMessage({
      message: "Test",
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Network error");
    });
  });
});
