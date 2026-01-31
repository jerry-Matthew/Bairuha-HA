/**
 * Assist Service Tests
 * 
 * Tests for the Assist service including:
 * - Message processing
 * - Conversation management
 * - Settings management
 * - Examples
 */

import { getAssistService } from "../assist-service";
import { createHARestClient } from "@/lib/home-assistant/rest-client";

// Mock dependencies
jest.mock("@/lib/home-assistant/rest-client");
jest.mock("@/lib/db");
jest.mock("@/components/globalAdd/server/config-entry.registry");

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
const mockHARestClient = createHARestClient as jest.MockedFunction<typeof createHARestClient>;

describe("AssistService", () => {
  let service: ReturnType<typeof getAssistService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = getAssistService();
    mockFetch.mockClear();
  });

  describe("processMessage", () => {
    it("processes message successfully", async () => {
      const mockClient = {
        getCredentials: jest.fn().mockResolvedValue({
          baseUrl: "http://ha:8123",
          accessToken: "test-token",
        }),
      };
      mockHARestClient.mockReturnValue(mockClient as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          speech: {
            plain: {
              speech: "I've turned on the light.",
            },
          },
          conversation_id: "conv-123",
        }),
      } as Response);

      const result = await service.processMessage({
        message: "Turn on the light",
        language: "en",
      });

      expect(result.success).toBe(true);
      expect(result.conversationId).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        "http://ha:8123/api/conversation/process",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });

    it("handles conversation errors", async () => {
      const mockClient = {
        getCredentials: jest.fn().mockResolvedValue({
          baseUrl: "http://ha:8123",
          accessToken: "test-token",
        }),
      };
      mockHARestClient.mockReturnValue(mockClient as any);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          message: "Conversation processing failed",
        }),
      } as Response);

      const result = await service.processMessage({
        message: "Test message",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("handles network errors", async () => {
      const mockClient = {
        getCredentials: jest.fn().mockResolvedValue({
          baseUrl: "http://ha:8123",
          accessToken: "test-token",
        }),
      };
      mockHARestClient.mockReturnValue(mockClient as any);

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.processMessage({
        message: "Test message",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("continues conversation with existing conversation ID", async () => {
      const mockClient = {
        getCredentials: jest.fn().mockResolvedValue({
          baseUrl: "http://ha:8123",
          accessToken: "test-token",
        }),
      };
      mockHARestClient.mockReturnValue(mockClient as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          speech: { plain: { speech: "Response" } },
          conversation_id: "conv-123",
        }),
      } as Response);

      const result = await service.processMessage({
        message: "Follow up",
        conversationId: "conv-123",
      });

      expect(result.success).toBe(true);
      const requestBody = JSON.parse(
        (mockFetch.mock.calls[0][1] as RequestInit).body as string
      );
      expect(requestBody.conversation_id).toBe("conv-123");
    });
  });

  describe("getConversation", () => {
    it("returns conversation if exists", async () => {
      // First create a conversation
      const mockClient = {
        getCredentials: jest.fn().mockResolvedValue({
          baseUrl: "http://ha:8123",
          accessToken: "test-token",
        }),
      };
      mockHARestClient.mockReturnValue(mockClient as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          speech: { plain: { speech: "Response" } },
          conversation_id: "conv-123",
        }),
      } as Response);

      await service.processMessage({ message: "Test" });
      const conversationId = (await service.processMessage({ message: "Test" })).conversationId;

      const conversation = await service.getConversation(conversationId);

      expect(conversation).not.toBeNull();
      expect(conversation?.conversationId).toBe(conversationId);
    });

    it("returns null if conversation does not exist", async () => {
      const conversation = await service.getConversation("non-existent");

      expect(conversation).toBeNull();
    });
  });

  describe("clearConversation", () => {
    it("clears conversation successfully", async () => {
      // First create a conversation
      const mockClient = {
        getCredentials: jest.fn().mockResolvedValue({
          baseUrl: "http://ha:8123",
          accessToken: "test-token",
        }),
      };
      mockHARestClient.mockReturnValue(mockClient as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          speech: { plain: { speech: "Response" } },
          conversation_id: "conv-123",
        }),
      } as Response);

      const conversationId = (await service.processMessage({ message: "Test" })).conversationId;

      const result = await service.clearConversation(conversationId);

      expect(result.success).toBe(true);
      const conversation = await service.getConversation(conversationId);
      expect(conversation).toBeNull();
    });
  });

  describe("getSettings", () => {
    it("returns default settings when HA API unavailable", async () => {
      const mockClient = {
        getCredentials: jest.fn().mockResolvedValue({
          baseUrl: "http://ha:8123",
          accessToken: "test-token",
        }),
      };
      mockHARestClient.mockReturnValue(mockClient as any);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const settings = await service.getSettings();

      expect(settings).toBeDefined();
      expect(settings.enabled).toBeDefined();
      expect(settings.language).toBeDefined();
    });

    it("returns settings from HA API if available", async () => {
      const mockClient = {
        getCredentials: jest.fn().mockResolvedValue({
          baseUrl: "http://ha:8123",
          accessToken: "test-token",
        }),
      };
      mockHARestClient.mockReturnValue(mockClient as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: "pipeline-1", name: "Default Pipeline" },
        ],
      } as Response);

      const settings = await service.getSettings();

      expect(settings).toBeDefined();
      expect(settings.conversationAgents.length).toBeGreaterThan(0);
    });
  });

  describe("updateSettings", () => {
    it("updates settings", async () => {
      const newSettings = { language: "es" };
      const result = await service.updateSettings(newSettings);

      expect(result.language).toBe("es");
    });
  });

  describe("getExamples", () => {
    it("returns example commands", () => {
      const examples = service.getExamples();

      expect(examples).toBeDefined();
      expect(examples.examples.length).toBeGreaterThan(0);
      expect(examples.examples[0].category).toBeDefined();
      expect(examples.examples[0].commands.length).toBeGreaterThan(0);
    });
  });
});
