/**
 * Dynamic Options Resolver
 * 
 * Resolves dynamic options for select/multiselect fields
 */

import type { DynamicOptionsConfig, ConfigFieldSchema } from "@/components/addDevice/server/integration-config-schemas";

/**
 * Option item format
 */
export interface OptionItem {
  label: string;
  value: any;
}

/**
 * Context for resolving dynamic options
 */
export interface DynamicOptionsContext {
  integrationId: string;
  fieldName: string;
  formValues?: Record<string, any>;
}

/**
 * Cache for dynamic options
 */
const optionsCache = new Map<string, { options: OptionItem[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get property value from object using dot notation path
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

/**
 * Map API response to options using mapping configuration
 */
function mapResponseToOptions(
  data: any,
  mapping: { label: string; value: string }
): OptionItem[] {
  // Handle array of items
  if (Array.isArray(data)) {
    return data.map(item => ({
      label: String(getNestedValue(item, mapping.label)),
      value: getNestedValue(item, mapping.value),
    }));
  }
  
  // Handle single object
  if (typeof data === "object" && data !== null) {
    // If data itself is an object with nested structure, try to extract array
    const keys = Object.keys(data);
    if (keys.length === 1 && Array.isArray(data[keys[0]])) {
      return mapResponseToOptions(data[keys[0]], mapping);
    }
    
    // Return as single option
    return [{
      label: String(getNestedValue(data, mapping.label)),
      value: getNestedValue(data, mapping.value),
    }];
  }
  
  return [];
}

/**
 * Resolve options from API endpoint
 */
async function resolveFromAPI(
  endpoint: string,
  mapping: { label: string; value: string },
  context?: Record<string, any>
): Promise<OptionItem[]> {
  const cacheKey = `api:${endpoint}:${JSON.stringify(context || {})}`;
  const cached = optionsCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.options;
  }
  
  try {
    // Build URL with context parameters if provided
    let url = endpoint;
    if (context && Object.keys(context).length > 0) {
      const params = new URLSearchParams();
      Object.entries(context).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      url += `?${params.toString()}`;
    }
    
    // Make request (handle both relative and absolute URLs)
    let fullUrl = url;
    if (!url.startsWith("http")) {
      // For server-side requests, use environment variable or default
      // For client-side requests, use current origin
      if (typeof window === "undefined") {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : "http://localhost:3000";
        fullUrl = `${baseUrl}${url}`;
      } else {
        fullUrl = `${window.location.origin}${url}`;
      }
    }
    
    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch options: ${response.statusText}`);
    }
    
    const data = await response.json();
    const options = mapResponseToOptions(data, mapping);
    
    // Cache options
    optionsCache.set(cacheKey, {
      options,
      timestamp: Date.now(),
    });
    
    return options;
  } catch (error) {
    console.error(`Error fetching dynamic options from ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Resolve options from another field's value
 */
function resolveFromField(
  fieldName: string,
  mapping: { label: string; value: string },
  formValues?: Record<string, any>
): OptionItem[] {
  const fieldValue = formValues?.[fieldName];
  
  if (!fieldValue) {
    return [];
  }
  
  // If field value is already an array of options, use it directly
  if (Array.isArray(fieldValue) && fieldValue.every(item => 
    typeof item === "object" && "label" in item && "value" in item
  )) {
    return fieldValue as OptionItem[];
  }
  
  // Try to map field value using mapping config
  if (typeof fieldValue === "object" && fieldValue !== null) {
    return mapResponseToOptions(fieldValue, mapping);
  }
  
  return [];
}

/**
 * Resolve static options
 */
function resolveStaticOptions(fieldSchema: ConfigFieldSchema): OptionItem[] {
  if (fieldSchema.options && Array.isArray(fieldSchema.options)) {
    return fieldSchema.options;
  }
  
  return [];
}

/**
 * Resolve dynamic options for a field
 */
export async function resolveOptions(
  fieldSchema: ConfigFieldSchema,
  context: DynamicOptionsContext
): Promise<OptionItem[]> {
  // If no dynamic options config, use static options
  if (!fieldSchema.dynamicOptions) {
    return resolveStaticOptions(fieldSchema);
  }
  
  const { source, endpoint, field, mapping } = fieldSchema.dynamicOptions;
  
  // Default mapping if not provided
  const defaultMapping = mapping || { label: "label", value: "value" };
  
  try {
    switch (source) {
      case "api":
        if (!endpoint) {
          throw new Error("API source requires endpoint");
        }
        return await resolveFromAPI(
          endpoint,
          defaultMapping,
          context.formValues
        );
        
      case "field":
        if (!field) {
          throw new Error("Field source requires field name");
        }
        return resolveFromField(field, defaultMapping, context.formValues);
        
      case "static":
      default:
        return resolveStaticOptions(fieldSchema);
    }
  } catch (error) {
    console.error(`Error resolving dynamic options for ${context.fieldName}:`, error);
    // Fallback to static options on error
    return resolveStaticOptions(fieldSchema);
  }
}

/**
 * Clear options cache
 */
export function clearOptionsCache(): void {
  optionsCache.clear();
}

/**
 * Invalidate cache for a specific endpoint
 */
export function invalidateCache(endpoint: string): void {
  const keysToDelete: string[] = [];
  optionsCache.forEach((_, key) => {
    if (key.startsWith(`api:${endpoint}:`)) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => optionsCache.delete(key));
}
