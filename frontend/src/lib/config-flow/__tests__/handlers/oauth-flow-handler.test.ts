/**
 * OAuth Flow Handler Tests
 */

import { OAuthFlowHandler } from "../../handlers/oauth-flow-handler";
import { getConfigSchema } from "@/components/addDevice/server/integration-config-schemas";
import { getTokens } from "@/lib/oauth/oauth-token-storage";
import { generateAuthorizationUrl } from "@/lib/oauth/oauth-service";

jest.mock("@/components/addDevice/server/integration-config-schemas");
jest.mock("@/lib/oauth/oauth-token-storage");
jest.mock("@/lib/oauth/oauth-service");

const mockGetConfigSchema = getConfigSchema as jest.MockedFunction<typeof getConfigSchema>;
const mockGetTokens = getTokens as jest.MockedFunction<typeof getTokens>;
const mockGenerateAuthorizationUrl = generateAuthorizationUrl as jest.MockedFunction<typeof generateAuthorizationUrl>;

describe("OAuthFlowHandler", () => {
  let handler: OAuthFlowHandler;

  beforeEach(() => {
    handler = new OAuthFlowHandler();
    jest.clearAllMocks();
  });

  describe("getInitialStep", () => {
    it("returns pick_integration as initial step", async () => {
      const step = await handler.getInitialStep("test_integration");
      expect(step).toBe("pick_integration");
    });
  });

  describe("getNextStep", () => {
    it("moves from pick_integration to oauth_authorize", async () => {
      const nextStep = await handler.getNextStep(
        "pick_integration",
        {},
        "test_integration"
      );

      expect(nextStep).toBe("oauth_authorize");
    });

    it("moves from oauth_authorize to oauth_callback", async () => {
      const nextStep = await handler.getNextStep(
        "oauth_authorize",
        {},
        "test_integration"
      );

      expect(nextStep).toBe("oauth_callback");
    });

    it("moves from oauth_callback to configure when schema has fields", async () => {
      mockGetConfigSchema.mockReturnValue({
        region: { type: "string", required: true },
      });
      mockGetTokens.mockResolvedValue({
        access_token: "test_token",
      });

      const nextStep = await handler.getNextStep(
        "oauth_callback",
        { configEntryId: "config_entry_123" },
        "test_integration"
      );

      expect(nextStep).toBe("configure");
      expect(mockGetTokens).toHaveBeenCalledWith("config_entry_123");
    });

    it("moves from oauth_callback to confirm when schema is empty", async () => {
      mockGetConfigSchema.mockReturnValue({});
      mockGetTokens.mockResolvedValue({
        access_token: "test_token",
      });

      const nextStep = await handler.getNextStep(
        "oauth_callback",
        { configEntryId: "config_entry_123" },
        "test_integration"
      );

      expect(nextStep).toBe("confirm");
    });

    it("throws error when tokens not stored in oauth_callback", async () => {
      await expect(
        handler.getNextStep(
          "oauth_callback",
          {},
          "test_integration"
        )
      ).rejects.toThrow("OAuth tokens not stored");
    });

    it("throws error when tokens not found in oauth_callback", async () => {
      mockGetTokens.mockResolvedValue(null);

      await expect(
        handler.getNextStep(
          "oauth_callback",
          { configEntryId: "config_entry_123" },
          "test_integration"
        )
      ).rejects.toThrow("OAuth tokens not found");
    });

    it("moves from configure to confirm", async () => {
      const nextStep = await handler.getNextStep(
        "configure",
        {},
        "test_integration"
      );

      expect(nextStep).toBe("confirm");
    });

    it("throws error when flow is already completed", async () => {
      await expect(
        handler.getNextStep("confirm", {}, "test_integration")
      ).rejects.toThrow("Flow already completed");
    });
  });

  describe("generateAuthorizationUrl", () => {
    it("generates authorization URL successfully", async () => {
      const flowConfig = {
        oauth_provider: "google",
        scopes: ["openid", "email"],
      };

      mockGenerateAuthorizationUrl.mockResolvedValue({
        url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=test&...",
        state: "state_123",
      });

      const url = await handler.generateAuthorizationUrl(
        "flow_123",
        "test_integration",
        flowConfig
      );

      expect(url).toBeDefined();
      expect(mockGenerateAuthorizationUrl).toHaveBeenCalledWith(
        "google",
        "flow_123",
        ["openid", "email"],
        expect.stringContaining("/api/oauth/callback"),
        flowConfig
      );
    });

    it("throws error when OAuth provider not configured", async () => {
      await expect(
        handler.generateAuthorizationUrl("flow_123", "test_integration", {})
      ).rejects.toThrow("OAuth provider not configured");
    });
  });
});
