/**
 * Flow Type Resolver
 * 
 * Resolves integration domain to flow type from catalog
 * Caches lookups for performance
 * Now supports flow definitions from integration_flow_definitions table
 */

import { query } from "@/lib/db";
import { loadFlowDefinitionRecord } from "./flow-definition.loader";

export type FlowType = 'none' | 'manual' | 'discovery' | 'oauth' | 'wizard' | 'hybrid';

export interface FlowConfig {
  discovery_protocols?: {
    dhcp?: any[];
    zeroconf?: any[];
    ssdp?: any[];
    homekit?: any;
    mqtt?: any;
    esphome?: any;
    zigbee?: any;
    zwave?: any;
  };
  oauth_provider?: string;
  scopes?: string[];
  authorization_url?: string;
  token_url?: string;
  steps?: Array<{
    step_id: string;
    title: string;
    description?: string;
    schema: any;
    condition?: {
      depends_on: string;
      field: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
      value?: any;
    };
  }>;
  [key: string]: any;
}

// Cache for flow type lookups (in-memory cache)
const flowTypeCache = new Map<string, { flowType: FlowType; flowConfig?: FlowConfig; metadata?: Record<string, any> }>();

/**
 * Get flow type for an integration domain
 * Checks flow definitions table first, then falls back to catalog
 */
export async function getFlowType(domain: string): Promise<FlowType> {
  // Check cache first
  const cached = flowTypeCache.get(domain);
  if (cached) {
    return cached.flowType;
  }

  try {
    // Try to load from flow definitions table first
    const flowDefinitionRecord = await loadFlowDefinitionRecord(domain);

    if (flowDefinitionRecord) {
      const flowType = flowDefinitionRecord.flow_type;
      // Convert flow definition to flow config format for backward compatibility
      const flowConfig = convertFlowDefinitionToConfig(flowDefinitionRecord.definition);
      const metadata = flowDefinitionRecord.handler_config || {};

      // Cache result
      flowTypeCache.set(domain, { flowType, flowConfig, metadata });

      return flowType;
    }

    // Fallback to catalog
    const rows = await query<any>(
      `SELECT flow_type, flow_config, metadata 
       FROM integration_catalog 
       WHERE domain = $1`,
      [domain]
    );

    if (rows.length === 0) {
      // Integration not in catalog
      // Check forced list before defaulting to manual
      if (FORCED_OAUTH_DOMAINS.includes(domain)) {
        flowTypeCache.set(domain, { flowType: 'oauth' });
        return 'oauth';
      }

      // Default to manual
      flowTypeCache.set(domain, { flowType: 'manual' });
      return 'manual';
    }

    const row = rows[0];
    let flowType = (row.flow_type || 'manual') as FlowType;
    let flowConfig = row.flow_config ? (typeof row.flow_config === 'string' ? JSON.parse(row.flow_config) : row.flow_config) : undefined;
    const metadata = row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined;

    // Check forced list to override catalog if needed
    if (FORCED_OAUTH_DOMAINS.includes(domain) && flowType !== 'oauth') {
      flowType = 'oauth';
    }

    // Inject default oauth config if missing for forced domains
    if (flowType === 'oauth' && (!flowConfig || !flowConfig.oauth_provider || !flowConfig.scopes)) {
      const provider = domain.startsWith('google') ? 'google' : domain;

      // Get default scopes for this domain
      const scopes = DEFAULT_OAUTH_SCOPES[domain as keyof typeof DEFAULT_OAUTH_SCOPES] || [];

      flowConfig = {
        ...(flowConfig || {}),
        oauth_provider: provider,
        scopes: flowConfig?.scopes || scopes,
      };
    }

    // Cache result
    flowTypeCache.set(domain, { flowType, flowConfig, metadata });

    return flowType;
  } catch (error) {
    console.error(`[FlowTypeResolver] Error getting flow type for ${domain}:`, error);
    // Default to manual on error, unless forced
    if (FORCED_OAUTH_DOMAINS.includes(domain)) {
      // Inject default config for error case too
      const provider = domain.startsWith('google') ? 'google' : domain;
      const scopes = DEFAULT_OAUTH_SCOPES[domain as keyof typeof DEFAULT_OAUTH_SCOPES] || [];
      const flowConfig = { oauth_provider: provider, scopes, steps: [] };
      flowTypeCache.set(domain, { flowType: 'oauth', flowConfig });
      return 'oauth';
    }
    return 'manual';
  }
}

/**
 * Convert flow definition to flow config format (for backward compatibility)
 */
function convertFlowDefinitionToConfig(definition: any): FlowConfig {
  if (!definition || !definition.steps) {
    return {};
  }

  return {
    ...definition, // Preserve all other properties like oauth_provider
    steps: definition.steps.map((step: any) => ({
      step_id: step.step_id,
      title: step.title,
      description: step.description,
      schema: step.schema,
      condition: step.condition,
    })),
  };
}

/**
 * Get flow config for an integration domain
 * Checks flow definitions table first, then falls back to catalog
 */
export async function getFlowConfig(domain: string): Promise<FlowConfig | null> {
  const cached = flowTypeCache.get(domain);
  if (cached?.flowConfig) {
    return cached.flowConfig;
  }

  // Try to load from flow definitions table first
  const flowDefinitionRecord = await loadFlowDefinitionRecord(domain);

  if (flowDefinitionRecord) {
    const flowConfig = convertFlowDefinitionToConfig(flowDefinitionRecord.definition);
    const metadata = flowDefinitionRecord.handler_config || {};

    // Cache result
    flowTypeCache.set(domain, {
      flowType: flowDefinitionRecord.flow_type,
      flowConfig,
      metadata,
    });

    return flowConfig;
  }

  // Trigger cache load (falls back to catalog)
  await getFlowType(domain);

  return flowTypeCache.get(domain)?.flowConfig || null;
}

/**
 * Get flow metadata for an integration domain
 */
export async function getFlowMetadata(domain: string): Promise<Record<string, any> | null> {
  const cached = flowTypeCache.get(domain);
  if (cached?.metadata) {
    return cached.metadata;
  }

  // Trigger cache load
  await getFlowType(domain);

  return flowTypeCache.get(domain)?.metadata || null;
}


/**
 * Clear flow type cache (useful for testing or after catalog updates)
 */
export function clearFlowTypeCache(): void {
  flowTypeCache.clear();
}

/**
 * Clear specific domain from cache
 */
export function clearFlowTypeCacheForDomain(domain: string): void {
  flowTypeCache.delete(domain);
}

// Domains that are known to be OAuth but might be misconfigured in catalog/DB
export const FORCED_OAUTH_DOMAINS = [
  'google_assistant', // Added based on user report
  'google_calendar',
  'google',
  'spotify',
  'nest',
  'withings',
  'fitbit',
  'netatmo',
  'todoist',
  'somfy_mylink',
  'smartthings'
];

export const DEFAULT_OAUTH_SCOPES = {
  google_assistant: ['https://www.googleapis.com/auth/assistant-sdk-prototype'],
  google_calendar: ['https://www.googleapis.com/auth/calendar'],
  google: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
  nest: ['https://www.googleapis.com/auth/sdm.service'],
  spotify: ['user-read-private', 'user-read-email'],
};
