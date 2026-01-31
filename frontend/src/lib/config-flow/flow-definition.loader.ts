/**
 * Flow Definition Loader
 * 
 * Loads flow definitions from the database and provides caching and fallback logic
 * Integrates with existing flow type resolver and handlers
 */

import { getFlowDefinition, getActiveFlowDefinition } from "./flow-definition.registry";
import { getFlowConfig, getFlowType, FORCED_OAUTH_DOMAINS } from "./flow-type-resolver";
import type { FlowDefinition, FlowDefinitionRecord } from "./flow-definition.types";
import type { FlowConfig, FlowType } from "./flow-type-resolver";
import { shouldSkipStep, determineNextStep } from "./conditional-step-engine";

// Cache for flow definitions (in-memory cache)
const flowDefinitionCache = new Map<string, FlowDefinitionRecord>();

/**
 * Load flow definition for an integration domain
 * Falls back to flow_config from catalog if definition not found
 */
export async function loadFlowDefinition(domain: string): Promise<FlowDefinition | null> {
  // Check cache first
  const cached = flowDefinitionCache.get(domain);
  if (cached) {
    return cached.definition;
  }

  try {
    // Try to load from flow definitions table
    const definitionRecord = await getFlowDefinition(domain);

    if (definitionRecord) {
      // Ensure OAuth steps are present if needed
      // This handles cases where the DB definition is missing standard steps
      const enhancedDefinition = ensureOAuthStepsInDefinition(domain, definitionRecord.definition, definitionRecord.flow_type);

      // Update the record with enhanced definition for caching
      const enhancedRecord = { ...definitionRecord, definition: enhancedDefinition };

      // Cache the result
      flowDefinitionCache.set(domain, enhancedRecord);
      return enhancedRecord.definition;
    }

    // Fallback to flow_config from catalog
    const flowConfig = await getFlowConfig(domain);
    const flowType = await getFlowType(domain);

    if (flowConfig) {
      // Convert flow_config to flow definition format
      return convertFlowConfigToDefinition(domain, flowConfig, flowType);
    }

    // If no flow definition found, return a minimal default with a confirm step
    // This allows flows to complete even without a full flow definition
    const defaultDef = createDefaultFlowDefinition(domain);
    return ensureOAuthStepsInDefinition(domain, defaultDef, 'manual');
  } catch (error) {
    console.error(`[FlowDefinitionLoader] Error loading flow definition for ${domain}:`, error);
    // Return default definition as fallback even on error
    const defaultDef = createDefaultFlowDefinition(domain);
    return ensureOAuthStepsInDefinition(domain, defaultDef, 'manual');
  }
}

/**
 * Load flow definition record (includes metadata)
 */
export async function loadFlowDefinitionRecord(domain: string): Promise<FlowDefinitionRecord | null> {
  // Check cache first
  const cached = flowDefinitionCache.get(domain);
  if (cached) {
    return cached;
  }

  try {
    const definitionRecord = await getFlowDefinition(domain);

    if (definitionRecord) {
      // Ensure OAuth steps are present if needed
      const enhancedDefinition = ensureOAuthStepsInDefinition(domain, definitionRecord.definition, definitionRecord.flow_type);
      const enhancedRecord = { ...definitionRecord, definition: enhancedDefinition };

      // Cache the result
      flowDefinitionCache.set(domain, enhancedRecord);
      return enhancedRecord;
    }

    return null;
  } catch (error) {
    console.error(`[FlowDefinitionLoader] Error loading flow definition record for ${domain}:`, error);
    return null;
  }
}

/**
 * Create a default minimal flow definition when none exists
 * Provides at least a confirm step so flows can complete
 */
function createDefaultFlowDefinition(domain: string): FlowDefinition {
  return {
    flow_type: 'manual',
    name: `${domain} Configuration Flow`,
    description: `Configuration flow for ${domain}`,
    steps: [
      {
        step_id: 'confirm',
        step_type: 'confirm',
        title: 'Confirm Device Registration',
        description: 'Review and confirm device registration',
        schema: {
          type: 'object',
          properties: {},
        },
      },
    ],
    initial_step: 'confirm',
  };
}

/**
 * Convert FlowConfig to FlowDefinition format (backward compatibility)
 */
function convertFlowConfigToDefinition(domain: string, flowConfig: FlowConfig, flowType: FlowType = 'manual'): FlowDefinition {
  const steps = flowConfig.steps || [];

  const definition: FlowDefinition = {
    flow_type: flowType === 'oauth' ? 'oauth' : 'wizard', // Respect oauth type
    name: `${domain} Configuration Flow`,
    description: `Configuration flow for ${domain}`,
    steps: steps.map((step, index) => ({
      step_id: step.step_id || `step_${index + 1}`,
      step_type: 'wizard',
      title: step.title || `Step ${index + 1}`,
      description: step.description,
      schema: step.schema ? {
        type: 'object',
        properties: step.schema as any,
      } : {
        type: 'object',
        properties: {},
      },
      condition: step.condition ? {
        depends_on: step.condition.depends_on,
        field: step.condition.field,
        operator: step.condition.operator,
        value: step.condition.value,
      } : undefined,
    })),
    initial_step: steps.length > 0 ? steps[0].step_id : undefined,
  };

  // Compatibility: If we have a 'user' step but no 'configure' step, alias configure -> user
  // This handles cases where older flows (or proxy fallback) used 'configure' but local schema uses 'user'
  const userStep = definition.steps.find(s => s.step_id === 'user');
  if (userStep && !definition.steps.find(s => s.step_id === 'configure')) {
    definition.steps.push({
      ...userStep,
      step_id: 'configure',
      title: userStep.title || 'Configure'
    });
  }

  // Inject OAuth steps if flow type is oauth
  if (flowType === 'oauth') {
    // Inject oauth_authorize if missing
    if (!definition.steps.find(s => s.step_id === 'oauth_authorize')) {
      definition.steps.unshift({
        step_id: 'oauth_authorize',
        step_type: 'oauth',
        title: 'Authorize with Provider',
        description: `Authorize ${domain} account`,
        schema: {
          type: 'object',
          properties: {},
        },
      });
    }

    // Inject oauth_callback if missing
    if (!definition.steps.find(s => s.step_id === 'oauth_callback')) {
      definition.steps.splice(1, 0, {
        step_id: 'oauth_callback',
        step_type: 'oauth', // Callback is also oauth type for now, or could be manual/invisible
        title: 'Authorization Callback',
        description: 'Processing authorization...',
        schema: {
          type: 'object',
          properties: {},
        },
      });
    }

    // Set initial step to oauth_authorize
    // For OAuth flows, authorization is typically the first step
    // Existing steps fromcatalog are usually for post-auth configuration
    definition.initial_step = 'oauth_authorize';
  }

  // Ensure confirm step exists
  if (!definition.steps.find(s => s.step_id === 'confirm')) {
    definition.steps.push({
      step_id: 'confirm',
      step_type: 'confirm',
      title: 'Confirm Device Registration',
      description: 'Review and confirm device registration',
      schema: {
        type: 'object',
        properties: {},
      },
    });
  }

  return definition;
}

/**
 * Get step definitions from flow definition
 */
export function getStepDefinitions(definition: FlowDefinition): FlowDefinition['steps'] {
  return definition.steps || [];
}

/**
 * Get step definition by step ID
 */
export function getStepDefinition(definition: FlowDefinition, stepId: string): FlowDefinition['steps'][0] | null {
  return definition.steps.find(step => step.step_id === stepId) || null;
}

/**
 * Get initial step ID from flow definition
 */
export function getInitialStepId(definition: FlowDefinition): string | null {
  if (definition.initial_step) {
    return definition.initial_step;
  }

  if (definition.steps.length > 0) {
    return definition.steps[0].step_id;
  }

  return null;
}

/**
 * Get next step ID based on current step and flow data
 */
export function getNextStepId(
  definition: FlowDefinition,
  currentStepId: string,
  flowData: Record<string, any>
): string | null {
  const currentIndex = definition.steps.findIndex(step => step.step_id === currentStepId);

  if (currentIndex === -1) {
    return null;
  }

  // Check if current step has explicit next_step
  const currentStep = definition.steps[currentIndex];
  if (currentStep.navigation?.next_step) {
    return currentStep.navigation.next_step;
  }

  // Use the conditional step engine to determine next step
  return determineNextStep(definition, currentStepId, flowData);
}

/**
 * Clear flow definition cache
 */
export function clearFlowDefinitionCache(): void {
  flowDefinitionCache.clear();
}

/**
 * Clear specific domain from cache
 */
export function clearFlowDefinitionCacheForDomain(domain: string): void {
  flowDefinitionCache.delete(domain);
}

/**
 * Invalidate cache for a domain (useful after updates)
 */
export async function invalidateFlowDefinitionCache(domain: string): Promise<void> {
  await loadFlowDefinition(domain);
}


/**
 * Ensure OAuth steps are present in the definition if the flow type is OAuth
 */
function ensureOAuthStepsInDefinition(domain: string, definition: FlowDefinition, flowType: FlowType): FlowDefinition {
  const isForcedOAuth = FORCED_OAUTH_DOMAINS.includes(domain);

  // Only modify if flow type is oauth or forced
  if (flowType !== 'oauth' && definition.flow_type !== 'oauth' && !isForcedOAuth) {
    return definition;
  }

  // Update definition flow type if forced
  const resultFlowType = isForcedOAuth ? 'oauth' : (definition.flow_type || flowType);

  // Clone definition to avoid mutating original if needed (though locally created usually)
  // For DB records we should be careful not to mutate cached objects if we weren't replacing the cache entry
  const enhancedDef = {
    ...definition,
    flow_type: resultFlowType,
    steps: [...definition.steps]
  };

  // Inject oauth_authorize if missing
  if (!enhancedDef.steps.find(s => s.step_id === 'oauth_authorize')) {
    enhancedDef.steps.unshift({
      step_id: 'oauth_authorize',
      step_type: 'oauth',
      title: 'Authorize with Provider',
      description: `Authorize ${domain} account`,
      schema: {
        type: 'object',
        properties: {},
      },
    });
  }

  // Inject oauth_callback if missing
  if (!enhancedDef.steps.find(s => s.step_id === 'oauth_callback')) {
    // Find index of authorize step to insert after
    const authIndex = enhancedDef.steps.findIndex(s => s.step_id === 'oauth_authorize');
    const insertIndex = authIndex >= 0 ? authIndex + 1 : 1;

    enhancedDef.steps.splice(insertIndex, 0, {
      step_id: 'oauth_callback',
      step_type: 'oauth', // Callback is also oauth type for now
      title: 'Authorization Callback',
      description: 'Processing authorization...',
      schema: {
        type: 'object',
        properties: {},
      },
    });
  }

  // Set initial step to oauth_authorize
  // For OAuth flows, authorization is typically the first step
  // Existing steps from catalog are usually for post-auth configuration
  if (!enhancedDef.initial_step || enhancedDef.initial_step === 'confirm' || enhancedDef.steps[0].step_id === 'oauth_authorize') {
    enhancedDef.initial_step = 'oauth_authorize';
  }

  return enhancedDef;
}

