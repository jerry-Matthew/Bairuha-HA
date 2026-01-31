/**
 * OAuth Token Storage Service
 * 
 * Secure token storage in config entries with encryption
 */

import { getConfigEntryById, updateConfigEntry } from '@/components/globalAdd/server/config-entry.registry';
import type { OAuthTokens } from './oauth-service';
import crypto from 'crypto';

// Simple encryption key (in production, use environment variable or key management service)
const ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Encrypt token data
 */
function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex').slice(0, 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt token data
 */
function decryptToken(encryptedToken: string): string {
  const [ivHex, encrypted] = encryptedToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY, 'hex').slice(0, 32);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Store OAuth tokens in config entry
 */
export async function storeTokens(
  configEntryId: string,
  tokens: OAuthTokens
): Promise<void> {
  const configEntry = await getConfigEntryById(configEntryId);
  if (!configEntry) {
    throw new Error('Config entry not found');
  }

  // Encrypt sensitive tokens
  const encryptedTokens = {
    access_token: encryptToken(tokens.access_token),
    refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : undefined,
    expires_in: tokens.expires_in,
    token_type: tokens.token_type,
    scope: tokens.scope,
    expires_at: tokens.expires_at,
  };

  // Store in config entry data
  const updatedData = {
    ...configEntry.data,
    oauth_tokens: encryptedTokens,
  };

  await updateConfigEntry(configEntryId, {
    data: updatedData,
  });
}

/**
 * Get OAuth tokens from config entry
 */
export async function getTokens(configEntryId: string): Promise<OAuthTokens | null> {
  const configEntry = await getConfigEntryById(configEntryId);
  if (!configEntry) {
    return null;
  }

  const encryptedTokens = configEntry.data?.oauth_tokens;
  if (!encryptedTokens) {
    return null;
  }

  try {
    // Decrypt tokens
    return {
      access_token: decryptToken(encryptedTokens.access_token),
      refresh_token: encryptedTokens.refresh_token ? decryptToken(encryptedTokens.refresh_token) : undefined,
      expires_in: encryptedTokens.expires_in,
      token_type: encryptedTokens.token_type,
      scope: encryptedTokens.scope,
      expires_at: encryptedTokens.expires_at,
    };
  } catch (error) {
    console.error('[OAuth Token Storage] Failed to decrypt tokens:', error);
    return null;
  }
}

/**
 * Update OAuth tokens in config entry
 */
export async function updateTokens(
  configEntryId: string,
  tokens: OAuthTokens
): Promise<void> {
  await storeTokens(configEntryId, tokens);
}

/**
 * Delete OAuth tokens from config entry
 */
export async function deleteTokens(configEntryId: string): Promise<void> {
  const configEntry = await getConfigEntryById(configEntryId);
  if (!configEntry) {
    return;
  }

  const updatedData = { ...configEntry.data };
  delete updatedData.oauth_tokens;

  await updateConfigEntry(configEntryId, {
    data: updatedData,
  });
}

/**
 * Check if tokens are expired
 */
export function areTokensExpired(tokens: OAuthTokens): boolean {
  if (!tokens.expires_at) {
    return false; // No expiration info, assume valid
  }

  // Add 5 minute buffer before expiration
  const buffer = 5 * 60 * 1000; // 5 minutes
  return Date.now() >= tokens.expires_at - buffer;
}
