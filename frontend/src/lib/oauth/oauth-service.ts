/**
 * OAuth Service
 * 
 * Core OAuth flow logic including authorization URL generation,
 * token exchange, token refresh, and PKCE support
 */

import crypto from 'crypto';
import { getProviderConfig, getProviderConfigFromFlowConfig, getClientId, getClientSecret } from './oauth-provider-config';
import type { FlowConfig } from '@/lib/config-flow/flow-type-resolver';

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  expires_at?: number; // Calculated expiration timestamp
}

export interface OAuthState {
  flowId: string;
  providerId: string;
  redirectUri: string;
  nonce: string; // CSRF protection
  timestamp: number;
  codeVerifier?: string; // For PKCE
}

// In-memory state storage (in production, use Redis or database)
const stateStorage = new Map<string, OAuthState>();

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge };
}

/**
 * Generate OAuth authorization URL
 */
export async function generateAuthorizationUrl(
  providerId: string,
  flowId: string,
  scopes: string[],
  redirectUri: string,
  flowConfig?: FlowConfig
): Promise<{ url: string; state: string; codeVerifier?: string }> {
  const config = flowConfig
    ? getProviderConfigFromFlowConfig(flowConfig)
    : getProviderConfig(providerId);

  if (!config) {
    throw new Error(`OAuth provider not found: ${providerId}`);
  }

  const clientId = getClientId(providerId, flowConfig);
  if (!clientId) {
    throw new Error(`OAuth client ID not configured for provider: ${providerId}`);
  }

  // Generate state parameter for CSRF protection
  const nonce = crypto.randomBytes(16).toString('hex');
  const state = crypto.createHash('sha256')
    .update(`${flowId}:${nonce}:${Date.now()}`)
    .digest('hex');

  // Store state for validation
  const oauthState: OAuthState = {
    flowId,
    providerId,
    redirectUri,
    nonce,
    timestamp: Date.now(),
  };
  stateStorage.set(state, oauthState);

  // Clean up old states (older than 1 hour)
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, value] of stateStorage.entries()) {
    if (value.timestamp < oneHourAgo) {
      stateStorage.delete(key);
    }
  }

  // Generate PKCE if required
  let codeVerifier: string | undefined;
  let codeChallenge: string | undefined;
  if (config.requiresPKCE) {
    const pkce = generatePKCE();
    codeVerifier = pkce.codeVerifier;
    codeChallenge = pkce.codeChallenge;
    // Store code verifier with state (for token exchange)
    oauthState.codeVerifier = codeVerifier;
    stateStorage.set(state, oauthState);
  }

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: config.responseType || 'code',
    scope: scopes.join(' '),
    state: state,
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Force consent screen to ensure refresh token is returned
    ...(codeChallenge && { code_challenge: codeChallenge, code_challenge_method: 'S256' }),
  });

  const url = `${config.authorizationUrl}?${params.toString()}`;

  return { url, state, codeVerifier };
}

/**
 * Validate OAuth state parameter
 */
export function validateState(state: string): OAuthState | null {
  const oauthState = stateStorage.get(state);
  if (!oauthState) {
    return null;
  }

  // Check if state is expired (older than 1 hour)
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  if (oauthState.timestamp < oneHourAgo) {
    stateStorage.delete(state);
    return null;
  }

  return oauthState;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeAuthorizationCode(
  providerId: string,
  code: string,
  redirectUri: string,
  state: string,
  flowConfig?: FlowConfig
): Promise<OAuthTokens> {
  // Validate state
  const oauthState = validateState(state);
  if (!oauthState) {
    throw new Error('Invalid or expired OAuth state');
  }

  if (oauthState.providerId !== providerId) {
    throw new Error('OAuth state provider mismatch');
  }

  if (oauthState.redirectUri !== redirectUri) {
    throw new Error('OAuth redirect URI mismatch');
  }

  const config = flowConfig
    ? getProviderConfigFromFlowConfig(flowConfig)
    : getProviderConfig(providerId);

  if (!config) {
    throw new Error(`OAuth provider not found: ${providerId}`);
  }

  const clientId = getClientId(providerId, flowConfig);
  const clientSecret = getClientSecret(providerId, flowConfig);

  if (!clientId) {
    throw new Error(`OAuth client ID not configured for provider: ${providerId}`);
  }

  // Prepare token request
  const tokenParams: Record<string, string> = {
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
  };

  if (config.requiresPKCE && oauthState.codeVerifier) {
    tokenParams.code_verifier = oauthState.codeVerifier;
  } else if (clientSecret) {
    // Only include client_secret if not using PKCE
    tokenParams.client_id = clientId;
    tokenParams.client_secret = clientSecret;
  }

  // Make token request
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
  };

  // Add authentication header if required
  if (config.tokenEndpointAuthMethod === 'client_secret_basic' && clientSecret) {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${auth}`;
  } else if (config.tokenEndpointAuthMethod === 'client_secret_post' && clientSecret) {
    tokenParams.client_id = clientId;
    tokenParams.client_secret = clientSecret;
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(tokenParams).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const tokenData = await response.json();

  // Calculate expiration timestamp
  const expiresAt = tokenData.expires_in
    ? Date.now() + tokenData.expires_in * 1000
    : undefined;

  // Clean up state
  stateStorage.delete(state);

  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in,
    token_type: tokenData.token_type || 'Bearer',
    scope: tokenData.scope,
    expires_at: expiresAt,
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  providerId: string,
  refreshToken: string,
  flowConfig?: FlowConfig
): Promise<OAuthTokens> {
  const config = flowConfig
    ? getProviderConfigFromFlowConfig(flowConfig)
    : getProviderConfig(providerId);

  if (!config) {
    throw new Error(`OAuth provider not found: ${providerId}`);
  }

  const clientId = getClientId(providerId, flowConfig);
  const clientSecret = getClientSecret(providerId, flowConfig);

  if (!clientId) {
    throw new Error(`OAuth client ID not configured for provider: ${providerId}`);
  }

  const tokenParams: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  };

  if (clientSecret) {
    tokenParams.client_secret = clientSecret;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
  };

  if (config.tokenEndpointAuthMethod === 'client_secret_basic' && clientSecret) {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${auth}`;
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(tokenParams).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const tokenData = await response.json();

  const expiresAt = tokenData.expires_in
    ? Date.now() + tokenData.expires_in * 1000
    : undefined;

  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || refreshToken, // Provider may not return new refresh token
    expires_in: tokenData.expires_in,
    token_type: tokenData.token_type || 'Bearer',
    scope: tokenData.scope,
    expires_at: expiresAt,
  };
}

/**
 * Revoke token
 */
export async function revokeToken(
  providerId: string,
  token: string,
  flowConfig?: FlowConfig
): Promise<void> {
  const config = flowConfig
    ? getProviderConfigFromFlowConfig(flowConfig)
    : getProviderConfig(providerId);

  if (!config || !config.revocationUrl) {
    throw new Error(`Token revocation not supported for provider: ${providerId}`);
  }

  const clientId = getClientId(providerId, flowConfig);
  const clientSecret = getClientSecret(providerId, flowConfig);

  const params: Record<string, string> = {
    token: token,
  };

  if (clientId) {
    params.client_id = clientId;
  }

  if (clientSecret) {
    params.client_secret = clientSecret;
  }

  const response = await fetch(config.revocationUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token revocation failed: ${error}`);
  }
}
