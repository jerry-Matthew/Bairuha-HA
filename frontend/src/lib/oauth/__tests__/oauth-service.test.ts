/**
 * OAuth Service Tests
 */

import {
  generateAuthorizationUrl,
  validateState,
  exchangeAuthorizationCode,
  refreshAccessToken,
  revokeToken,
} from "../oauth-service";
import { getProviderConfig, getClientId, getClientSecret } from "../oauth-provider-config";
import type { FlowConfig } from "@/lib/config-flow/flow-type-resolver";

// Mock fetch globally
global.fetch = jest.fn();

// Mock oauth-provider-config
jest.mock("../oauth-provider-config");

const mockGetProviderConfig = getProviderConfig as jest.MockedFunction<typeof getProviderConfig>;
const mockGetClientId = getClientId as jest.MockedFunction<typeof getClientId>;
const mockGetClientSecret = getClientSecret as jest.MockedFunction<typeof getClientSecret>;

describe("OAuth Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe("generateAuthorizationUrl", () => {
    it("generates authorization URL for Google provider", async () => {
      mockGetProviderConfig.mockReturnValue({
        providerId: "google",
        name: "Google",
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        clientIdEnvVar: "GOOGLE_OAUTH_CLIENT_ID",
        clientSecretEnvVar: "GOOGLE_OAUTH_CLIENT_SECRET",
        responseType: "code",
        requiresPKCE: false,
        tokenEndpointAuthMethod: "client_secret_post",
      });

      mockGetClientId.mockReturnValue("test_client_id");

      const result = await generateAuthorizationUrl(
        "google",
        "flow_123",
        ["openid", "email"],
        "http://localhost:3000/callback"
      );

      expect(result.url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(result.url).toContain("client_id=test_client_id");
      expect(result.url).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback");
      expect(result.url).toContain("response_type=code");
      expect(result.url).toContain("scope=openid+email");
      expect(result.state).toBeDefined();
      expect(result.state.length).toBeGreaterThan(0);
    });

    it("generates authorization URL with PKCE for Spotify", async () => {
      mockGetProviderConfig.mockReturnValue({
        providerId: "spotify",
        name: "Spotify",
        authorizationUrl: "https://accounts.spotify.com/authorize",
        tokenUrl: "https://accounts.spotify.com/api/token",
        clientIdEnvVar: "SPOTIFY_OAUTH_CLIENT_ID",
        clientSecretEnvVar: "SPOTIFY_OAUTH_CLIENT_SECRET",
        responseType: "code",
        requiresPKCE: true,
        tokenEndpointAuthMethod: "client_secret_basic",
      });

      mockGetClientId.mockReturnValue("test_spotify_client_id");

      const result = await generateAuthorizationUrl(
        "spotify",
        "flow_123",
        ["user-read-email"],
        "http://localhost:3000/callback"
      );

      expect(result.url).toContain("code_challenge=");
      expect(result.url).toContain("code_challenge_method=S256");
      expect(result.codeVerifier).toBeDefined();
    });

    it("throws error when provider not found", async () => {
      mockGetProviderConfig.mockReturnValue(null);

      await expect(
        generateAuthorizationUrl("unknown", "flow_123", [], "http://localhost:3000/callback")
      ).rejects.toThrow("OAuth provider not found");
    });

    it("throws error when client ID not configured", async () => {
      mockGetProviderConfig.mockReturnValue({
        providerId: "google",
        name: "Google",
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        clientIdEnvVar: "GOOGLE_OAUTH_CLIENT_ID",
        clientSecretEnvVar: "GOOGLE_OAUTH_CLIENT_SECRET",
        responseType: "code",
      });

      mockGetClientId.mockReturnValue(null);

      await expect(
        generateAuthorizationUrl("google", "flow_123", [], "http://localhost:3000/callback")
      ).rejects.toThrow("OAuth client ID not configured");
    });
  });

  describe("validateState", () => {
    it("validates valid state", async () => {
      mockGetProviderConfig.mockReturnValue({
        providerId: "google",
        name: "Google",
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        clientIdEnvVar: "GOOGLE_OAUTH_CLIENT_ID",
        clientSecretEnvVar: "GOOGLE_OAUTH_CLIENT_SECRET",
        responseType: "code",
      });

      mockGetClientId.mockReturnValue("test_client_id");

      const { state } = await generateAuthorizationUrl(
        "google",
        "flow_123",
        [],
        "http://localhost:3000/callback"
      );

      const validatedState = validateState(state);
      expect(validatedState).toBeDefined();
      expect(validatedState?.flowId).toBe("flow_123");
      expect(validatedState?.providerId).toBe("google");
    });

    it("returns null for invalid state", () => {
      const validatedState = validateState("invalid_state");
      expect(validatedState).toBeNull();
    });

    it("returns null for expired state", async () => {
      mockGetProviderConfig.mockReturnValue({
        providerId: "google",
        name: "Google",
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        clientIdEnvVar: "GOOGLE_OAUTH_CLIENT_ID",
        clientSecretEnvVar: "GOOGLE_OAUTH_CLIENT_SECRET",
        responseType: "code",
      });

      mockGetClientId.mockReturnValue("test_client_id");

      const { state } = await generateAuthorizationUrl(
        "google",
        "flow_123",
        [],
        "http://localhost:3000/callback"
      );

      // Mock expired timestamp (older than 1 hour)
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() + 2 * 60 * 60 * 1000); // 2 hours later

      const validatedState = validateState(state);
      expect(validatedState).toBeNull();

      Date.now = originalDateNow;
    });
  });

  describe("exchangeAuthorizationCode", () => {
    it("exchanges authorization code for tokens", async () => {
      mockGetProviderConfig.mockReturnValue({
        providerId: "google",
        name: "Google",
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        clientIdEnvVar: "GOOGLE_OAUTH_CLIENT_ID",
        clientSecretEnvVar: "GOOGLE_OAUTH_CLIENT_SECRET",
        responseType: "code",
        requiresPKCE: false,
        tokenEndpointAuthMethod: "client_secret_post",
      });

      mockGetClientId.mockReturnValue("test_client_id");
      mockGetClientSecret.mockReturnValue("test_client_secret");

      // Generate state first
      const { state } = await generateAuthorizationUrl(
        "google",
        "flow_123",
        [],
        "http://localhost:3000/callback"
      );

      // Mock token exchange response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "test_access_token",
          refresh_token: "test_refresh_token",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "openid email",
        }),
      });

      const tokens = await exchangeAuthorizationCode(
        "google",
        "auth_code_123",
        "http://localhost:3000/callback",
        state
      );

      expect(tokens.access_token).toBe("test_access_token");
      expect(tokens.refresh_token).toBe("test_refresh_token");
      expect(tokens.expires_in).toBe(3600);
      expect(tokens.token_type).toBe("Bearer");
      expect(tokens.expires_at).toBeDefined();
    });

    it("throws error for invalid state", async () => {
      await expect(
        exchangeAuthorizationCode("google", "auth_code_123", "http://localhost:3000/callback", "invalid_state")
      ).rejects.toThrow("Invalid or expired OAuth state");
    });

    it("throws error when token exchange fails", async () => {
      mockGetProviderConfig.mockReturnValue({
        providerId: "google",
        name: "Google",
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        clientIdEnvVar: "GOOGLE_OAUTH_CLIENT_ID",
        clientSecretEnvVar: "GOOGLE_OAUTH_CLIENT_SECRET",
        responseType: "code",
        requiresPKCE: false,
        tokenEndpointAuthMethod: "client_secret_post",
      });

      mockGetClientId.mockReturnValue("test_client_id");
      mockGetClientSecret.mockReturnValue("test_client_secret");

      const { state } = await generateAuthorizationUrl(
        "google",
        "flow_123",
        [],
        "http://localhost:3000/callback"
      );

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: async () => "Invalid grant",
      });

      await expect(
        exchangeAuthorizationCode("google", "invalid_code", "http://localhost:3000/callback", state)
      ).rejects.toThrow("Token exchange failed");
    });
  });

  describe("refreshAccessToken", () => {
    it("refreshes access token successfully", async () => {
      mockGetProviderConfig.mockReturnValue({
        providerId: "google",
        name: "Google",
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        clientIdEnvVar: "GOOGLE_OAUTH_CLIENT_ID",
        clientSecretEnvVar: "GOOGLE_OAUTH_CLIENT_SECRET",
        responseType: "code",
        tokenEndpointAuthMethod: "client_secret_post",
      });

      mockGetClientId.mockReturnValue("test_client_id");
      mockGetClientSecret.mockReturnValue("test_client_secret");

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "new_access_token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      });

      const tokens = await refreshAccessToken("google", "refresh_token_123");

      expect(tokens.access_token).toBe("new_access_token");
      expect(tokens.expires_in).toBe(3600);
      expect(tokens.expires_at).toBeDefined();
    });

    it("throws error when refresh fails", async () => {
      mockGetProviderConfig.mockReturnValue({
        providerId: "google",
        name: "Google",
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        clientIdEnvVar: "GOOGLE_OAUTH_CLIENT_ID",
        clientSecretEnvVar: "GOOGLE_OAUTH_CLIENT_SECRET",
        responseType: "code",
        tokenEndpointAuthMethod: "client_secret_post",
      });

      mockGetClientId.mockReturnValue("test_client_id");

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: async () => "Invalid refresh token",
      });

      await expect(refreshAccessToken("google", "invalid_refresh_token")).rejects.toThrow(
        "Token refresh failed"
      );
    });
  });

  describe("revokeToken", () => {
    it("revokes token successfully", async () => {
      mockGetProviderConfig.mockReturnValue({
        providerId: "google",
        name: "Google",
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        revocationUrl: "https://oauth2.googleapis.com/revoke",
        clientIdEnvVar: "GOOGLE_OAUTH_CLIENT_ID",
        clientSecretEnvVar: "GOOGLE_OAUTH_CLIENT_SECRET",
        responseType: "code",
      });

      mockGetClientId.mockReturnValue("test_client_id");
      mockGetClientSecret.mockReturnValue("test_client_secret");

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      await expect(revokeToken("google", "token_to_revoke")).resolves.not.toThrow();
    });

    it("throws error when revocation not supported", async () => {
      mockGetProviderConfig.mockReturnValue({
        providerId: "custom",
        name: "Custom",
        authorizationUrl: "https://custom.com/auth",
        tokenUrl: "https://custom.com/token",
        // revocationUrl missing
        clientIdEnvVar: "CUSTOM_CLIENT_ID",
        clientSecretEnvVar: "CUSTOM_CLIENT_SECRET",
        responseType: "code",
      });

      await expect(revokeToken("custom", "token_to_revoke")).rejects.toThrow(
        "Token revocation not supported"
      );
    });
  });
});
