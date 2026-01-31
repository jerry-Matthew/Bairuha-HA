/**
 * Step Component Router
 * 
 * Routes step component types to appropriate React components
 * Thin wrapper around step component registry for routing logic
 */

import { getStepComponent, getCustomComponent } from "./step-component-registry";
import type { StepComponentInfo } from "./step-resolver";
import type { ComponentType } from "react";

/**
 * Step component route information
 */
export interface StepComponentRoute {
  componentPath: string;
  componentType: string;
  importPath: string; // For dynamic imports
  props: Record<string, any>;
}

/**
 * Route to step component
 */
export async function routeToStepComponent(
  componentInfo: StepComponentInfo
): Promise<ComponentType<any>> {
  // If custom component, use custom component loader
  if (componentInfo.componentType === 'custom' && componentInfo.componentName) {
    return await getCustomComponent(componentInfo.componentName);
  }

  // Route to standard component type
  return await getStepComponent(componentInfo.componentType);
}

/**
 * Resolve component path for a component type
 */
export function resolveComponentPath(
  componentType: string,
  componentName?: string
): string {
  if (componentType === 'custom' && componentName) {
    return `@/components/custom/${componentName}`;
  }

  // Standard component paths
  const componentPaths: Record<string, string> = {
    'manual': '@/components/addDevice/client/ConfigureStep.client',
    'discovery': '@/components/addDevice/client/DeviceDiscovery.client',
    'oauth': '@/components/addDevice/client/OAuthStep.client',
    'wizard': '@/components/addDevice/client/WizardStep.client',
    'confirm': '@/components/addDevice/client/DeviceConfirm.client',
  };

  return componentPaths[componentType] || componentPaths['manual'];
}
