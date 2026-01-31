/**
 * Step Resolver Service
 * 
 * Resolves which step component should be rendered based on flow definition and current flow state
 */

import { loadFlowDefinition, getStepDefinition, getInitialStepId } from "./flow-definition.loader";
import { shouldSkipStep } from "./conditional-step-engine";
import type { FlowDefinition, StepDefinition, StepCondition } from "./flow-definition.types";
import { getFlowById } from "@/components/addDevice/server/config-flow.registry";

/**
 * Step component information
 */
export interface StepComponentInfo {
  componentType: 'manual' | 'discovery' | 'oauth' | 'wizard' | 'confirm' | 'custom';
  componentName?: string; // For custom components
  stepDefinition: StepDefinition;
  stepMetadata: StepMetadata;
  props: Record<string, any>; // Component-specific props
  validationRules?: any[];
  conditionalLogic?: StepCondition;
}

/**
 * Step metadata for UI display
 */
export interface StepMetadata {
  stepId: string;
  title: string;
  description?: string;
  icon?: string;
  stepNumber?: number;
  totalSteps?: number;
  canGoBack: boolean;
  canSkip: boolean;
  isLastStep: boolean;
  helpText?: string;
}

/**
 * Resolve step component for a flow step
 */
export async function resolveStepComponent(
  flowId: string,
  stepId: string
): Promise<StepComponentInfo> {
  // Get flow to determine integration domain
  const flow = await getFlowById(flowId);
  if (!flow) {
    throw new Error(`Flow not found: ${flowId}`);
  }

  // Load flow definition
  if (!flow.integrationDomain) {
    throw new Error(`Flow has no integration domain`);
  }

  const definition = await loadFlowDefinition(flow.integrationDomain);
  if (!definition) {
    throw new Error(`Flow definition not found for domain: ${flow.integrationDomain}`);
  }

  // Normalize step ID (remove prefixes like "wizard_step_")
  const normalizedStepId = normalizeStepId(stepId);
  
  // Get step definition
  let stepDef = getStepDefinition(definition, normalizedStepId);
  
  // If not found with normalized ID, try original ID
  if (!stepDef) {
    stepDef = getStepDefinition(definition, stepId);
  }
  
  if (!stepDef) {
    throw new Error(`Step definition not found: ${stepId} (tried normalized: ${normalizedStepId})`);
  }

  // Determine component type from step type
  const componentType = mapStepTypeToComponentType(stepDef.step_type, stepDef);

  // Get step metadata
  const metadata = await getStepMetadata(flowId, stepId, definition, stepDef);

  // Extract component props from step definition
  const props = extractComponentProps(stepDef, definition);

  // Get flow data for conditional logic
  const flowData = flow.data || {};

  return {
    componentType,
    componentName: stepDef.ui?.component,
    stepDefinition: stepDef,
    stepMetadata: metadata,
    props,
    validationRules: stepDef.validation?.validators,
    conditionalLogic: stepDef.condition,
  };
}

/**
 * Get step definition by flow ID and step ID
 */
export async function getStepDefinitionFromFlow(
  flowId: string,
  stepId: string
): Promise<StepDefinition | null> {
  const flow = await getFlowById(flowId);
  if (!flow) {
    return null;
  }

  if (!flow.integrationDomain) {
    return null;
  }

  const definition = await loadFlowDefinition(flow.integrationDomain);
  if (!definition) {
    return null;
  }

  // Normalize step ID (remove prefixes like "wizard_step_")
  const normalizedStepId = normalizeStepId(stepId);
  
  // Try normalized ID first, then original ID
  let stepDef = getStepDefinition(definition, normalizedStepId);
  if (!stepDef) {
    stepDef = getStepDefinition(definition, stepId);
  }
  
  return stepDef;
}

/**
 * Evaluate step conditions to determine if step should be shown
 */
export async function evaluateStepConditions(
  flowId: string,
  stepId: string,
  flowData: Record<string, any>
): Promise<boolean> {
  const flow = await getFlowById(flowId);
  if (!flow) {
    return false;
  }

  if (!flow.integrationDomain) {
    return false;
  }

  const definition = await loadFlowDefinition(flow.integrationDomain);
  if (!definition) {
    return false;
  }

  // Normalize step ID (remove prefixes like "wizard_step_")
  const normalizedStepId = normalizeStepId(stepId);
  
  // Try normalized ID first, then original ID
  let stepDef = getStepDefinition(definition, normalizedStepId);
  if (!stepDef) {
    stepDef = getStepDefinition(definition, stepId);
  }
  
  if (!stepDef) {
    return false;
  }

  return !shouldSkipStep(stepDef, flowData, definition);
}

/**
 * Get step metadata
 */
async function getStepMetadata(
  flowId: string,
  stepId: string,
  definition: FlowDefinition,
  stepDef: StepDefinition
): Promise<StepMetadata> {
  // Get flow to access flow data
  const flow = await getFlowById(flowId);
  const flowData = flow?.data || {};

  // Normalize step ID for matching
  const normalizedStepId = normalizeStepId(stepId);

  // Calculate step number and total steps
  const visibleSteps = definition.steps.filter(
    step => !shouldSkipStep(step, flowData, definition)
  );
  const stepIndex = visibleSteps.findIndex(
    step => step.step_id === normalizedStepId || step.step_id === stepId
  );
  const stepNumber = stepIndex >= 0 ? stepIndex + 1 : undefined;
  const totalSteps = visibleSteps.length;

  // Determine if this is the last step
  const isLastStep = stepIndex >= 0 && stepIndex === visibleSteps.length - 1;

  // Determine if can go back
  const canGoBack = stepIndex > 0;

  // Check if step can be skipped
  const canSkip = stepDef.navigation?.can_skip || false;

  return {
    stepId: stepDef.step_id,
    title: stepDef.title,
    description: stepDef.description,
    icon: stepDef.icon,
    stepNumber,
    totalSteps,
    canGoBack,
    canSkip,
    isLastStep,
    helpText: stepDef.ui?.help_text,
  };
}

/**
 * Normalize step ID by removing common prefixes
 */
function normalizeStepId(stepId: string): string {
  // Remove common prefixes
  if (stepId.startsWith("wizard_step_")) {
    return stepId.replace("wizard_step_", "");
  }
  if (stepId.startsWith("discovery_")) {
    return stepId.replace("discovery_", "");
  }
  if (stepId.startsWith("oauth_")) {
    return stepId.replace("oauth_", "");
  }
  return stepId;
}

/**
 * Map step type to component type
 */
function mapStepTypeToComponentType(
  stepType: StepDefinition['step_type'],
  stepDef: StepDefinition
): StepComponentInfo['componentType'] {
  // Check for custom component first
  if (stepDef.ui?.component) {
    return 'custom';
  }

  // Map step types to component types
  switch (stepType) {
    case 'manual':
      return 'manual';
    case 'discovery':
      return 'discovery';
    case 'oauth':
      return 'oauth';
    case 'wizard':
      return 'wizard';
    case 'confirm':
      return 'confirm';
    default:
      return 'manual'; // Default fallback
  }
}

/**
 * Extract component-specific props from step definition
 */
function extractComponentProps(
  stepDef: StepDefinition,
  definition: FlowDefinition
): Record<string, any> {
  const props: Record<string, any> = {
    showProgress: definition.ui?.progress_indicator ?? true,
    allowNavigation: definition.ui?.allow_step_navigation ?? true,
  };

  // Add step-specific props
  if (stepDef.ui?.layout) {
    props.layout = stepDef.ui.layout;
  }

  if (stepDef.ui?.help_text) {
    props.helpText = stepDef.ui.help_text;
  }

  return props;
}

