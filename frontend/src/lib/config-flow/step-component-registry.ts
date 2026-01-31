/**
 * Step Component Registry
 * 
 * Registry for all available step components with lazy loading support
 */

import type { ComponentType } from "react";

// Component type to import path mapping
// Maps component type to a loader function that returns the component
const STEP_COMPONENT_MAP: Record<string, () => Promise<any>> = {
  'manual': () => import('@/components/addDevice/client/ConfigureStep.client'),
  'discovery': () => import('@/components/addDevice/client/DeviceDiscovery.client'),
  'oauth': () => import('@/components/addDevice/client/OAuthStep.client'),
  'wizard': () => import('@/components/addDevice/client/WizardStep.client'),
  'confirm': () => import('@/components/addDevice/client/DeviceConfirm.client'),
};

// Component name mapping for named exports
const COMPONENT_NAME_MAP: Record<string, string> = {
  'manual': 'ConfigureStep',
  'discovery': 'DeviceDiscovery',
  'oauth': 'OAuthStep',
  'wizard': 'WizardStep',
  'confirm': 'DeviceConfirm',
};

// Cache for loaded components
const componentCache = new Map<string, ComponentType<any>>();


/**
 * Register a step component
 */
export function registerStepComponent(
  type: string,
  component: ComponentType<any>
): void {
  componentCache.set(type, component);
}

/**
 * Get step component by type with lazy loading
 */
export async function getStepComponent(
  type: string
): Promise<ComponentType<any>> {
  // Check cache first
  const cached = componentCache.get(type);
  if (cached) {
    return cached;
  }

  // Load from standard component map
  const loader = STEP_COMPONENT_MAP[type];
  if (!loader) {
    console.warn(`[StepComponentRegistry] No component loader found for type "${type}", falling back to manual`);
    // Fallback to manual component
    const fallbackLoader = STEP_COMPONENT_MAP['manual'];
    if (fallbackLoader) {
      const module = await fallbackLoader();
      const componentName = COMPONENT_NAME_MAP['manual'];
      const component = module.default || module[componentName];
      if (!component) {
        throw new Error(`Component "${componentName}" not found in module`);
      }
      componentCache.set(type, component);
      return component;
    }
    throw new Error(`No component found for type: ${type}`);
  }

  try {
    const module = await loader();
    const componentName = COMPONENT_NAME_MAP[type];
    // Try named export first, then default export
    const component = module[componentName] || module.default;
    if (!component) {
      throw new Error(`Component "${componentName}" not found in module. Available exports: ${Object.keys(module).join(', ')}`);
    }
    componentCache.set(type, component);
    return component;
  } catch (error) {
    console.error(`[StepComponentRegistry] Failed to load component "${type}":`, error);
    throw new Error(`Failed to load component: ${type} - ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Clear component cache
 */
export function clearComponentCache(): void {
  componentCache.clear();
}

/**
 * Clear specific component from cache
 */
export function clearComponentCacheForType(type: string): void {
  componentCache.delete(type);
}

/**
 * Get all registered component types
 */
export function getRegisteredComponentTypes(): string[] {
  return Object.keys(STEP_COMPONENT_MAP);
}

/**
 * Get custom component by name
 */
export async function getCustomComponent(
  name: string
): Promise<ComponentType<any>> {
  console.warn(`[StepComponentRegistry] Custom component loading not fully implemented: ${name}`);
  // Fallback to manual step until dynamic custom component loading is implemented
  return getStepComponent('manual');
}

