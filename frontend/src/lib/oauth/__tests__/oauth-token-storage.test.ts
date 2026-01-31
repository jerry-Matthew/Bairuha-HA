/**
 * OAuth Token Storage Tests
 */

import {
  storeTokens,
  getTokens,
  updateTokens,
  deleteTokens,
  areTokensExpired,
} from "../oauth-token-storage";
import { getConfigEntryById, updateConfigEntry, createConfigEntry } from "@/components/globalAdd/server/config-entry.registry";
import type { OAuthTokens } from "../oauth-service";

jest.mock("@/components/globalAdd/server/config-entry.registry");

const mockGetConfigEntryById = getConfigEntryById as jest.MockedFunction<typeof getConfigEntryById>;
const mockUpdateConfigEntry = updateConfigEntry as jest.MockedFunction<typeof updateConfigEntry>;
const mockCreateConfigEntry = createConfigEntry as jest.MockedFunction<typeof createConfigEntry>;

describe("OAuth Token Storage", () => {
  const originalEnv = process.env;
  const testConfigEntryId = "config_entry_123";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Set a test encryption key
    process.env.OAUTH_ENCRYPTION_KEY = "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("storeTokens", () => {
    it("stores and encrypts tokens", async () => {
      const existingConfigEntry = {
        id: testConfigEntryId,
        integrationDomain: "test_integration",
        title: "Test Config",
        data: {},
        status: "loaded" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGetConfigEntryById.mockResolvedValue(existingConfigEntry);
      mockUpdateConfigEntry.mockResolvedValue({
        ...existingConfigEntry,
        data: {
          oauth_tokens: expect.objectContaining({
            access_token: expect.any(String),
            refresh_token: expect.any(String),
          }),
        },
      });

      const tokens: OAuthTokens = {
        access_token: "test_access_token",
        refresh_token: "test_refresh_token",
        expires_in: 3600,
        token_type: "Bearer",
        scope: "openid email",
        expires_at: Date.now() + 3600 * 1000,
      };

      await storeTokens(testConfigEntryId, tokens);

      expect(mockGetConfigEntryById).toHaveBeenCalledWith(testConfigEntryId);
      expect(mockUpdateConfigEntry).toHaveBeenCalled();
      
      const updateCall = mockUpdateConfigEntry.mock.calls[0];
      expect(updateCall[1].data).toBeDefined();
      expect(updateCall[1].data.oauth_tokens).toBeDefined();
      expect(updateCall[1].data.oauth_tokens.access_token).not.toBe("test_access_token"); // Should be encrypted
    });

    it("throws error when config entry not found", async () => {
      mockGetConfigEntryById.mockResolvedValue(null);

      const tokens: OAuthTokens = {
        access_token: "test_access_token",
      };

      await expect(storeTokens(testConfigEntryId, tokens)).rejects.toThrow("Config entry not found");
    });
  });

  describe("getTokens", () => {
    it("retrieves and decrypts tokens", async () => {
      // First, store tokens to get encrypted format
      const existingConfigEntry = {
        id: testConfigEntryId,
        integrationDomain: "test_integration",
        title: "Test Config",
        data: {},
        status: "loaded" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGetConfigEntryById.mockResolvedValueOnce(existingConfigEntry);
      
      const tokens: OAuthTokens = {
        access_token: "test_access_token",
        refresh_token: "test_refresh_token",
        expires_in: 3600,
        token_type: "Bearer",
      };

      // Store tokens first
      await storeTokens(testConfigEntryId, tokens);

      // Now retrieve them
      const storedConfigEntry = {
        ...existingConfigEntry,
        data: mockUpdateConfigEntry.mock.calls[0][1].data,
      };

      mockGetConfigEntryById.mockResolvedValueOnce(storedConfigEntry);

      const retrievedTokens = await getTokens(testConfigEntryId);

      expect(retrievedTokens).toBeDefined();
      expect(retrievedTokens?.access_token).toBe("test_access_token");
      expect(retrievedTokens?.refresh_token).toBe("test_refresh_token");
      expect(retrievedTokens?.expires_in).toBe(3600);
    });

    it("returns null when config entry not found", async () => {
      mockGetConfigEntryById.mockResolvedValue(null);

      const tokens = await getTokens(testConfigEntryId);
      expect(tokens).toBeNull();
    });

    it("returns null when no tokens stored", async () => {
      const configEntry = {
        id: testConfigEntryId,
        integrationDomain: "test_integration",
        title: "Test Config",
        data: {},
        status: "loaded" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGetConfigEntryById.mockResolvedValue(configEntry);

      const tokens = await getTokens(testConfigEntryId);
      expect(tokens).toBeNull();
    });
  });

  describe("updateTokens", () => {
    it("updates existing tokens", async () => {
      const existingConfigEntry = {
        id: testConfigEntryId,
        integrationDomain: "test_integration",
        title: "Test Config",
        data: {},
        status: "loaded" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGetConfigEntryById.mockResolvedValue(existingConfigEntry);
      mockUpdateConfigEntry.mockResolvedValue(existingConfigEntry);

      const newTokens: OAuthTokens = {
        access_token: "new_access_token",
        refresh_token: "new_refresh_token",
        expires_in: 7200,
      };

      await updateTokens(testConfigEntryId, newTokens);

      expect(mockUpdateConfigEntry).toHaveBeenCalled();
    });
  });

  describe("deleteTokens", () => {
    it("deletes tokens from config entry", async () => {
      const configEntry = {
        id: testConfigEntryId,
        integrationDomain: "test_integration",
        title: "Test Config",
        data: {
          oauth_tokens: {
            access_token: "encrypted_token",
            refresh_token: "encrypted_refresh",
          },
        },
        status: "loaded" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockGetConfigEntryById.mockResolvedValue(configEntry);
      mockUpdateConfigEntry.mockResolvedValue({
        ...configEntry,
        data: {},
      });

      await deleteTokens(testConfigEntryId);

      expect(mockUpdateConfigEntry).toHaveBeenCalled();
      const updateCall = mockUpdateConfigEntry.mock.calls[0];
      expect(updateCall[1].data.oauth_tokens).toBeUndefined();
    });

    it("does nothing when config entry not found", async () => {
      mockGetConfigEntryById.mockResolvedValue(null);

      await deleteTokens(testConfigEntryId);

      expect(mockUpdateConfigEntry).not.toHaveBeenCalled();
    });
  });

  describe("areTokensExpired", () => {
    it("returns false when tokens have no expiration", () => {
      const tokens: OAuthTokens = {
        access_token: "test_token",
      };

      expect(areTokensExpired(tokens)).toBe(false);
    });

    it("returns false when tokens are not expired", () => {
      const tokens: OAuthTokens = {
        access_token: "test_token",
        expires_at: Date.now() + 10 * 60 * 1000, // 10 minutes from now
      };

      expect(areTokensExpired(tokens)).toBe(false);
    });

    it("returns true when tokens are expired", () => {
      const tokens: OAuthTokens = {
        access_token: "test_token",
        expires_at: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      };

      expect(areTokensExpired(tokens)).toBe(true);
    });

    it("returns true when tokens expire within 5 minute buffer", () => {
      const tokens: OAuthTokens = {
        access_token: "test_token",
        expires_at: Date.now() + 3 * 60 * 1000, // 3 minutes from now (within 5 min buffer)
      };

      expect(areTokensExpired(tokens)).toBe(true);
    });
  });
});
