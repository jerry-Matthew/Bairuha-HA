
export class DeviceFlowStartDto {
    // No input needed for start
}

export class DeviceFlowStepDto {
    integrationId?: string;
    selectedDeviceId?: string;
    stepData?: Record<string, any>;
    configData?: Record<string, any>; // legacy support
}

export class DeviceFlowConfirmDto {
    deviceName?: string;
    deviceType?: string;
    model?: string;
    manufacturer?: string;
}

// Response Types
export interface IntegrationDto {
    id: string;
    domain: string;
    name: string;
    description?: string;
    icon?: string;
    supportsDeviceCreation: boolean;
    isCloud?: boolean;
    isConfigured?: boolean;
    brandImageUrl?: string;
}

export interface FlowStartResponseDto {
    flowId: string;
    step: string;
    integrations?: IntegrationDto[];
}

export interface FlowStepResponseDto {
    step: string;
    schema?: any;
    data?: Record<string, any>;
    oauthProvider?: string;
    oauthScopes?: string[];
    stepTitle?: string;
    stepDescription?: string;
    stepNumber?: number;
    totalSteps?: number;
    canGoBack?: boolean;
    isLastStep?: boolean;
    integrations?: IntegrationDto[];
}

export interface DiscoveredDeviceDto {
    id: string;
    name: string;
    manufacturer?: string;
    model?: string;
    integrationDomain?: string;
    integrationName?: string;
}
