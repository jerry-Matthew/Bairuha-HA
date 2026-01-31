/**
 * OAuth Provider Configuration
 * 
 * Defines and manages OAuth provider configurations
 * Supports built-in providers (Google, Spotify, Nest) and custom providers
 */

export interface OAuthProviderConfig {
  providerId: string;
  name: string;
  authorizationUrl: string;
  tokenUrl: string;
  revocationUrl?: string;
  clientIdEnvVar: string; // Environment variable name for client ID
  clientSecretEnvVar: string; // Environment variable name for client secret
  defaultScopes?: string[];
  requiresPKCE?: boolean; // Whether provider requires PKCE
  tokenEndpointAuthMethod?: 'client_secret_basic' | 'client_secret_post' | 'none';
  responseType?: string; // Usually 'code' for authorization code flow
}

// Built-in OAuth provider configurations
const BUILT_IN_PROVIDERS: Record<string, OAuthProviderConfig> = {
  google: {
    providerId: 'google',
    name: 'Google',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revocationUrl: 'https://oauth2.googleapis.com/revoke',
    clientIdEnvVar: 'GOOGLE_OAUTH_CLIENT_ID',
    clientSecretEnvVar: 'GOOGLE_OAUTH_CLIENT_SECRET',
    defaultScopes: ['openid', 'email', 'profile'],
    requiresPKCE: false,
    tokenEndpointAuthMethod: 'client_secret_post',
    responseType: 'code',
  },
  spotify: {
    providerId: 'spotify',
    name: 'Spotify',
    authorizationUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    clientIdEnvVar: 'SPOTIFY_OAUTH_CLIENT_ID',
    clientSecretEnvVar: 'SPOTIFY_OAUTH_CLIENT_SECRET',
    defaultScopes: ['user-read-email', 'user-read-private'],
    requiresPKCE: true, // Spotify requires PKCE for public clients
    tokenEndpointAuthMethod: 'client_secret_basic',
    responseType: 'code',
  },
  nest: {
    providerId: 'nest',
    name: 'Nest',
    authorizationUrl: 'https://nest.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://www.googleapis.com/oauth2/v4/token',
    clientIdEnvVar: 'NEST_OAUTH_CLIENT_ID',
    clientSecretEnvVar: 'NEST_OAUTH_CLIENT_SECRET',
    defaultScopes: ['https://www.googleapis.com/auth/sdm.service'],
    requiresPKCE: false,
    tokenEndpointAuthMethod: 'client_secret_post',
    responseType: 'code',
  },
};

const customProviders = new Map<string, OAuthProviderConfig>();

/**
 * Get OAuth provider configuration
 */
export function getProviderConfig(providerId: string): OAuthProviderConfig | null {
  // Check built-in providers first
  if (BUILT_IN_PROVIDERS[providerId]) {
    return BUILT_IN_PROVIDERS[providerId];
  }
  
  // Check custom providers
  if (customProviders.has(providerId)) {
    return customProviders.get(providerId)!;
  }
  
  return null;
}

/**
 * Register a custom OAuth provider
 */
export function registerProvider(providerId: string, config: OAuthProviderConfig): void {
  customProviders.set(providerId, config);
}

/**
 * Get provider config from flow_config (for generic providers)
 */
export function getProviderConfigFromFlowConfig(flowConfig: any): OAuthProviderConfig | null {
  if (!flowConfig?.oauth_provider) {
    return null;
  }

  const providerId = flowConfig.oauth_provider;
  
  // Check if it's a built-in provider
  const builtIn = getProviderConfig(providerId);
  if (builtIn) {
    return builtIn;
  }

  // Create generic provider config from flow_config
  if (flowConfig.authorization_url && flowConfig.token_url) {
    return {
      providerId: providerId,
      name: providerId.charAt(0).toUpperCase() + providerId.slice(1),
      authorizationUrl: flowConfig.authorization_url,
      tokenUrl: flowConfig.token_url,
      revocationUrl: flowConfig.revocation_url,
      clientIdEnvVar: `${providerId.toUpperCase()}_OAUTH_CLIENT_ID`,
      clientSecretEnvVar: `${providerId.toUpperCase()}_OAUTH_CLIENT_SECRET`,
      defaultScopes: flowConfig.scopes || [],
      requiresPKCE: flowConfig.requires_pkce || false,
      tokenEndpointAuthMethod: flowConfig.token_endpoint_auth_method || 'client_secret_post',
      responseType: 'code',
    };
  }

  return null;
}

/**
 * Get client ID for provider from environment variables
 */
export function getClientId(providerId: string, flowConfig?: any): string | null {
  const config = flowConfig 
    ? getProviderConfigFromFlowConfig(flowConfig) 
    : getProviderConfig(providerId);
  
  if (!config) {
    return null;
  }

  return process.env[config.clientIdEnvVar] || null;
}

/**
 * Get client secret for provider from environment variables
 */
export function getClientSecret(providerId: string, flowConfig?: any): string | null {
  const config = flowConfig 
    ? getProviderConfigFromFlowConfig(flowConfig) 
    : getProviderConfig(providerId);
  
  if (!config) {
    return null;
  }

  return process.env[config.clientSecretEnvVar] || null;
}
