/**
 * OAuth Provider Configuration Tests
 */

import {
  getProviderConfig,
  registerProvider,
  getProviderConfigFromFlowConfig,
  getClientId,
  getClientSecret,
} from "../oauth-provider-config";
import type { OAuthProviderConfig } from "../oauth-provider-config";

describe("OAuth Provider Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getProviderConfig", () => {
    it("returns Google provider config", () => {
      const config = getProviderConfig("google");
      expect(config).toBeDefined();
      expect(config?.providerId).toBe("google");
      expect(config?.name).toBe("Google");
      expect(config?.authorizationUrl).toBe("https://accounts.google.com/o/oauth2/v2/auth");
      expect(config?.tokenUrl).toBe("https://oauth2.googleapis.com/token");
    });

    it("returns Spotify provider config", () => {
      const config = getProviderConfig("spotify");
      expect(config).toBeDefined();
      expect(config?.providerId).toBe("spotify");
      expect(config?.name).toBe("Spotify");
      expect(config?.requiresPKCE).toBe(true);
    });

    it("returns Nest provider config", () => {
      const config = getProviderConfig("nest");
      expect(config).toBeDefined();
      expect(config?.providerId).toBe("nest");
      expect(config?.name).toBe("Nest");
    });

    it("returns null for unknown provider", () => {
      const config = getProviderConfig("unknown");
      expect(config).toBeNull();
    });
  });

  describe("registerProvider", () => {
    it("registers a custom provider", () => {
      const customConfig: OAuthProviderConfig = {
        providerId: "custom",
        name: "Custom Provider",
        authorizationUrl: "https://custom.com/auth",
        tokenUrl: "https://custom.com/token",
        clientIdEnvVar: "CUSTOM_CLIENT_ID",
        clientSecretEnvVar: "CUSTOM_CLIENT_SECRET",
      };

      registerProvider("custom", customConfig);
      const config = getProviderConfig("custom");
      expect(config).toEqual(customConfig);
    });
  });

  describe("getProviderConfigFromFlowConfig", () => {
    it("returns built-in provider config when providerId matches", () => {
      const flowConfig = {
        oauth_provider: "google",
      };

      const config = getProviderConfigFromFlowConfig(flowConfig);
      expect(config).toBeDefined();
      expect(config?.providerId).toBe("google");
      expect(config?.name).toBe("Google");
    });

    it("creates generic provider config from flow_config", () => {
      const flowConfig = {
        oauth_provider: "custom_provider",
        authorization_url: "https://custom.com/auth",
        token_url: "https://custom.com/token",
        revocation_url: "https://custom.com/revoke",
        scopes: ["read", "write"],
        requires_pkce: true,
        token_endpoint_auth_method: "client_secret_basic",
      };

      const config = getProviderConfigFromFlowConfig(flowConfig);
      expect(config).toBeDefined();
      expect(config?.providerId).toBe("custom_provider");
      expect(config?.name).toBe("Custom_provider");
      expect(config?.authorizationUrl).toBe("https://custom.com/auth");
      expect(config?.tokenUrl).toBe("https://custom.com/token");
      expect(config?.revocationUrl).toBe("https://custom.com/revoke");
      expect(config?.defaultScopes).toEqual(["read", "write"]);
      expect(config?.requiresPKCE).toBe(true);
      expect(config?.tokenEndpointAuthMethod).toBe("client_secret_basic");
    });

    it("returns null when oauth_provider is missing", () => {
      const flowConfig = {};
      const config = getProviderConfigFromFlowConfig(flowConfig);
      expect(config).toBeNull();
    });

    it("returns null when authorization_url or token_url is missing", () => {
      const flowConfig = {
        oauth_provider: "unknown_provider",
        authorization_url: "https://custom.com/auth",
        // token_url missing
      };
      const config = getProviderConfigFromFlowConfig(flowConfig);
      expect(config).toBeNull();
    });
  });

  describe("getClientId", () => {
    it("returns client ID from environment variable for built-in provider", () => {
      process.env.GOOGLE_OAUTH_CLIENT_ID = "test_google_client_id";
      const clientId = getClientId("google");
      expect(clientId).toBe("test_google_client_id");
    });

    it("returns client ID from environment variable for custom provider", () => {
      process.env.CUSTOM_PROVIDER_OAUTH_CLIENT_ID = "test_custom_client_id";
      const flowConfig = {
        oauth_provider: "custom_provider",
        authorization_url: "https://custom.com/auth",
        token_url: "https://custom.com/token",
      };
      const clientId = getClientId("custom_provider", flowConfig);
      expect(clientId).toBe("test_custom_client_id");
    });

    it("returns null when environment variable is not set", () => {
      delete process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientId = getClientId("google");
      expect(clientId).toBeNull();
    });

    it("returns null for unknown provider", () => {
      const clientId = getClientId("unknown");
      expect(clientId).toBeNull();
    });
  });

  describe("getClientSecret", () => {
    it("returns client secret from environment variable for built-in provider", () => {
      process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test_google_client_secret";
      const clientSecret = getClientSecret("google");
      expect(clientSecret).toBe("test_google_client_secret");
    });

    it("returns client secret from environment variable for custom provider", () => {
      process.env.CUSTOM_PROVIDER_OAUTH_CLIENT_SECRET = "test_custom_client_secret";
      const flowConfig = {
        oauth_provider: "custom_provider",
        authorization_url: "https://custom.com/auth",
        token_url: "https://custom.com/token",
      };
      const clientSecret = getClientSecret("custom_provider", flowConfig);
      expect(clientSecret).toBe("test_custom_client_secret");
    });

    it("returns null when environment variable is not set", () => {
      delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      const clientSecret = getClientSecret("google");
      expect(clientSecret).toBeNull();
    });

    it("returns null for unknown provider", () => {
      const clientSecret = getClientSecret("unknown");
      expect(clientSecret).toBeNull();
    });
  });
});
