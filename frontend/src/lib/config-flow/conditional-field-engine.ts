/**
 * Conditional Field Engine
 * 
 * Handles conditional field visibility and dependency resolution
 */

import type { ConfigFieldSchema, ConditionalConfig, IntegrationConfigSchema } from "@/components/addDevice/server/integration-config-schemas";

/**
 * Evaluate a conditional expression
 */
export function evaluateCondition(
  condition: ConditionalConfig,
  formValues: Record<string, any>
): boolean {
  const fieldValue = formValues[condition.field];
  const compareValue = condition.value;
  
  switch (condition.operator) {
    case "equals":
      return fieldValue === compareValue;
      
    case "not_equals":
      return fieldValue !== compareValue;
      
    case "contains":
      if (Array.isArray(compareValue)) {
        return compareValue.includes(fieldValue);
      }
      return String(fieldValue || "").includes(String(compareValue || ""));
      
    case "greater_than":
      return Number(fieldValue) > Number(compareValue);
      
    case "less_than":
      return Number(fieldValue) < Number(compareValue);
      
    case "in":
      if (!Array.isArray(compareValue)) {
        return false;
      }
      return compareValue.includes(fieldValue);
      
    case "not_in":
      if (!Array.isArray(compareValue)) {
        return true;
      }
      return !compareValue.includes(fieldValue);
      
    default:
      return true;
  }
}

/**
 * Determine if a field should be visible based on its conditional config
 */
export function shouldShowField(
  fieldName: string,
  fieldSchema: ConfigFieldSchema,
  formValues: Record<string, any>
): boolean {
  // If no conditional, always show
  if (!fieldSchema.conditional) {
    return true;
  }
  
  return evaluateCondition(fieldSchema.conditional, formValues);
}

/**
 * Get all visible fields for current form state
 */
export function getVisibleFields(
  schema: IntegrationConfigSchema,
  formValues: Record<string, any>
): string[] {
  const visibleFields: string[] = [];
  
  Object.entries(schema).forEach(([fieldName, fieldSchema]) => {
    if (shouldShowField(fieldName, fieldSchema, formValues)) {
      visibleFields.push(fieldName);
    }
  });
  
  return visibleFields;
}

/**
 * Get fields that depend on a given field
 */
export function getFieldDependencies(
  fieldName: string,
  schema: IntegrationConfigSchema
): string[] {
  const dependentFields: string[] = [];
  
  Object.entries(schema).forEach(([name, fieldSchema]) => {
    // Check if field has this field in its dependsOn array
    if (fieldSchema.dependsOn && fieldSchema.dependsOn.includes(fieldName)) {
      dependentFields.push(name);
    }
    
    // Check if field has this field in its conditional
    if (fieldSchema.conditional && fieldSchema.conditional.field === fieldName) {
      dependentFields.push(name);
    }
  });
  
  return dependentFields;
}

/**
 * Get all fields that a field depends on (recursive)
 */
export function getFieldDependencyChain(
  fieldName: string,
  schema: IntegrationConfigSchema,
  visited: Set<string> = new Set()
): string[] {
  if (visited.has(fieldName)) {
    return []; // Circular dependency detected
  }
  
  visited.add(fieldName);
  const dependencies: string[] = [];
  const fieldSchema = schema[fieldName];
  
  if (!fieldSchema) {
    return dependencies;
  }
  
  // Get direct dependencies
  if (fieldSchema.dependsOn) {
    fieldSchema.dependsOn.forEach(dep => {
      if (!dependencies.includes(dep)) {
        dependencies.push(dep);
      }
    });
  }
  
  // Get conditional dependencies
  if (fieldSchema.conditional) {
    const condField = fieldSchema.conditional.field;
    if (!dependencies.includes(condField)) {
      dependencies.push(condField);
    }
  }
  
  // Get recursive dependencies
  dependencies.forEach(dep => {
    const chainDeps = getFieldDependencyChain(dep, schema, visited);
    chainDeps.forEach(chainDep => {
      if (!dependencies.includes(chainDep)) {
        dependencies.push(chainDep);
      }
    });
  });
  
  return dependencies;
}
