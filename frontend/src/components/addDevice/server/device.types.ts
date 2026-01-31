/**
 * Device Flow Types
 * 
 * Defines types for the step-based device setup flow
 */

export type FlowStep =
  | "pick_integration"
  | "configure"
  | "confirm"
  | "enter_connection"    // Home Assistant flow step
  | "validate_connection" // Home Assistant flow step
  | "discover"            // Discovery flow step
  | "oauth_authorize"     // OAuth authorization step
  | "oauth_callback"      // OAuth callback step
  | `wizard_step_${string}`; // Wizard step (template literal type)

export interface DeviceSetupFlow {
  flowId: string;
  integrationId?: string;
  step: FlowStep;
  data?: Record<string, any>;
}

export interface Integration {
  id: string;
  domain: string;
  name: string;
  description?: string;
  icon?: string;
  supportsDeviceCreation: boolean;
  // Select brand format fields (from catalog + registry merge)
  isCloud?: boolean;
  isConfigured?: boolean;
  brandImageUrl?: string;
  metadata?: {
    integration_type?: string;
    supported_by?: string;
    [key: string]: any;
  };
}


export interface Device {
  id: string;
  name: string;
  integrationId: string;
  manufacturer?: string;
  model?: string;
  areaId?: string;
  createdAt: string;
  status: "online" | "offline";
}

export interface FlowStartResponse {
  flowId: string;
  step: FlowStep;
  integrations: Integration[];
}

export interface FlowStepResponse {
  step: FlowStep;
  schema?: any; // For configuration step
  data?: Record<string, any>;
  oauthProvider?: string; // For OAuth authorization step
  oauthScopes?: string[]; // For OAuth authorization step
  // Wizard-specific fields
  stepTitle?: string;
  stepDescription?: string;
  stepNumber?: number;
  totalSteps?: number;
  canGoBack?: boolean;
  isLastStep?: boolean;
  integrations?: Integration[];
}

export interface FlowConfirmResponse {
  deviceId: string;
  status: "registered";
}

export interface DiscoveredDevice {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  integrationDomain?: string;
  integrationName?: string;
  protocol?: string; // Protocol that discovered this device
  viaDeviceId?: string; // Device ID if discovered via another device (hub)
  identifiers?: Record<string, string>; // Device identifiers
  connections?: Array<[string, string]>; // Device connections (e.g., ["mac", "aa:bb:cc:dd:ee:ff"])
  config?: Record<string, any>; // Protocol-specific configuration
  discoveredAt?: Date; // When the device was discovered
}
