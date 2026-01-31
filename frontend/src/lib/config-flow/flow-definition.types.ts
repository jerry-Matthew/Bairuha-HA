/**
 * Flow Definition Types
 * 
 * TypeScript types for flow definitions stored in integration_flow_definitions table
 * These types define the structure of flow definitions that enable dynamic flow rendering
 */

import type { FlowType } from "./flow-type-resolver";

/**
 * Main flow definition structure
 */
export interface FlowDefinition {
  // Flow metadata
  flow_type: FlowType;
  name: string; // Human-readable flow name
  description?: string;
  
  // Step definitions
  steps: StepDefinition[];
  
  // Initial step configuration
  initial_step?: string; // Step ID to start from (default: first step)
  
  // Flow-level validation
  validation?: {
    global_validators?: ValidatorDefinition[];
    required_fields?: string[]; // Field paths across all steps
  };
  
  // UI configuration
  ui?: {
    progress_indicator?: boolean;
    show_step_numbers?: boolean;
    allow_step_navigation?: boolean; // Allow back/forward navigation
    step_summary_before_confirm?: boolean;
  };
  
  // Completion configuration
  completion?: {
    success_message?: string;
    redirect_url?: string;
    auto_redirect?: boolean;
  };
}

/**
 * Step definition within a flow
 */
export interface StepDefinition {
  step_id: string; // Unique identifier within flow
  step_type: 'manual' | 'discovery' | 'oauth' | 'wizard' | 'confirm';
  title: string;
  description?: string;
  icon?: string; // Icon identifier
  
  // Step schema (JSON Schema format)
  schema: {
    type: 'object';
    properties: Record<string, FieldDefinition>;
    required?: string[];
  };
  
  // Step validation rules
  validation?: {
    validators?: ValidatorDefinition[];
    custom_validator?: string; // Custom validator function name
  };
  
  // Conditional step logic
  condition?: StepCondition;
  
  // UI rendering hints
  ui?: {
    component?: string; // Custom component name
    layout?: 'form' | 'grid' | 'wizard' | 'custom';
    fields?: FieldUIHint[];
    help_text?: string;
  };
  
  // Step-specific actions
  actions?: {
    on_enter?: ActionDefinition[]; // Actions when step is entered
    on_exit?: ActionDefinition[]; // Actions when step is exited
    on_submit?: ActionDefinition[]; // Actions when step is submitted
  };
  
  // Navigation
  navigation?: {
    next_step?: string; // Explicit next step ID (overrides auto-detection)
    can_skip?: boolean;
    skip_to_step?: string; // Step to skip to if skipped
  };
}

/**
 * Field definition within a step schema
 */
export interface FieldDefinition {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'password' | 'url' | 'email' | 'file' | 'object' | 'array';
  title: string;
  description?: string;
  default?: any;
  placeholder?: string;
  
  // Field-specific options
  options?: Array<{ label: string; value: any }> | string; // Static options or API endpoint
  min?: number;
  max?: number;
  pattern?: string; // Regex pattern
  format?: string; // Format hint (email, url, etc.)
  
  // Conditional field visibility
  depends_on?: {
    field: string; // Field path
    operator: 'equals' | 'not_equals' | 'contains' | 'exists' | 'not_exists';
    value?: any;
  };
  
  // Nested fields (for object/array types)
  properties?: Record<string, FieldDefinition>;
  items?: FieldDefinition; // For array types
  
  // UI hints
  ui?: {
    component?: string; // Custom component
    widget?: string; // Widget type (text, textarea, select, etc.)
    help_text?: string;
    tooltip?: string;
  };
}

/**
 * Step condition for conditional step logic
 */
export interface StepCondition {
  depends_on: string; // Previous step ID or field path
  field?: string; // Field name in previous step (if depends_on is step ID)
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists' | 'in' | 'not_in';
  value?: any;
  logic?: 'and' | 'or'; // For multiple conditions
  conditions?: StepCondition[]; // Nested conditions
}

/**
 * Validator definition
 */
export interface ValidatorDefinition {
  type: 'required' | 'min' | 'max' | 'pattern' | 'email' | 'url' | 'custom';
  field?: string; // Field path (for field-specific validators)
  message?: string; // Error message
  value?: any; // Validator-specific value (e.g., min length, regex pattern)
  validator_function?: string; // Custom validator function name
}

/**
 * Action definition for step actions
 */
export interface ActionDefinition {
  type: 'api_call' | 'discovery' | 'oauth_redirect' | 'custom';
  endpoint?: string; // API endpoint for api_call
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: Record<string, any> | string; // Payload template or static payload
  on_success?: ActionDefinition[]; // Actions to run on success
  on_error?: ActionDefinition[]; // Actions to run on error
}

/**
 * UI hint for field rendering
 */
export interface FieldUIHint {
  field: string; // Field path
  component?: string; // Custom component override
  layout?: 'row' | 'column' | 'grid';
  width?: number; // Grid width (1-12)
  order?: number; // Display order
}

/**
 * Database record for flow definition
 */
export interface FlowDefinitionRecord {
  id: string;
  integration_domain: string;
  version: number;
  flow_type: FlowType;
  definition: FlowDefinition;
  handler_class?: string | null;
  handler_config?: Record<string, any> | null;
  is_active: boolean;
  is_default: boolean;
  description?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create flow definition input
 */
export interface CreateFlowDefinitionInput {
  integration_domain: string;
  flow_type: FlowType;
  definition: FlowDefinition;
  handler_class?: string;
  handler_config?: Record<string, any>;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
  created_by?: string;
}

/**
 * Update flow definition input
 */
export interface UpdateFlowDefinitionInput {
  definition?: FlowDefinition;
  handler_class?: string;
  handler_config?: Record<string, any>;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
}

/**
 * Flow definition query filters
 */
export interface FlowDefinitionFilters {
  domain?: string;
  flow_type?: FlowType;
  is_active?: boolean;
  is_default?: boolean;
  version?: number;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validation result
 */
export interface FlowDefinitionValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
