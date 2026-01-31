/**
 * Step Validation Engine
 * 
 * Dynamic validation engine that validates step data based on flow definition validation rules
 */

import type { StepDefinition, FieldDefinition, ValidatorDefinition } from "./flow-definition.types";

/**
 * Validation result for a single field
 */
export interface FieldValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Validation result for a complete step
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>; // field path -> error message
  warnings?: Record<string, string>;
}

/**
 * Validate step data against step definition
 */
export async function validateStepData(
  stepDefinition: StepDefinition,
  stepData: Record<string, any>
): Promise<ValidationResult> {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // Validate against schema
  const schema = stepDefinition.schema;
  if (schema && schema.properties) {
    // Check required fields
    if (schema.required) {
      for (const fieldName of schema.required) {
        if (stepData[fieldName] === undefined || stepData[fieldName] === null || stepData[fieldName] === '') {
          errors[fieldName] = `${fieldName} is required`;
        }
      }
    }

    // Validate each field
    for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
      const value = stepData[fieldName];
      if (value !== undefined && value !== null) {
        const fieldResult = await validateField(fieldDef, value, stepData);
        if (!fieldResult.valid) {
          errors[fieldName] = fieldResult.error || `${fieldName} is invalid`;
        }
        if (fieldResult.warning) {
          warnings[fieldName] = fieldResult.warning;
        }
      }
    }
  }

  // Validate using step-level validators
  if (stepDefinition.validation?.validators) {
    for (const validator of stepDefinition.validation.validators) {
      const fieldName = validator.field || 'root';
      const result = await executeValidator(validator, stepData, fieldName);

      if (!result.valid) {
        errors[fieldName] = result.error || validator.message || 'Validation failed';
      }
      if (result.warning) {
        warnings[fieldName] = result.warning;
      }
    }
  }

  // Execute custom validator if specified
  if (stepDefinition.validation?.custom_validator) {
    const result = await executeCustomValidator(
      stepDefinition.validation.custom_validator,
      stepData
    );
    if (!result.valid) {
      errors['_custom'] = result.error || 'Custom validation failed';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
  };
}

/**
 * Validate individual field
 */
export async function validateField(
  fieldDefinition: FieldDefinition,
  value: any,
  allData: Record<string, any>
): Promise<FieldValidationResult> {
  // Type validation
  if (fieldDefinition.type === 'string' && typeof value !== 'string') {
    return { valid: false, error: 'Must be a string' };
  }
  if (fieldDefinition.type === 'number' && typeof value !== 'number') {
    return { valid: false, error: 'Must be a number' };
  }
  if (fieldDefinition.type === 'boolean' && typeof value !== 'boolean') {
    return { valid: false, error: 'Must be a boolean' };
  }

  // String-specific validations
  if (fieldDefinition.type === 'string') {
    const strValue = String(value);

    if (fieldDefinition.min !== undefined && strValue.length < fieldDefinition.min) {
      return {
        valid: false,
        error: `Must be at least ${fieldDefinition.min} characters`
      };
    }

    if (fieldDefinition.max !== undefined && strValue.length > fieldDefinition.max) {
      return {
        valid: false,
        error: `Must be at most ${fieldDefinition.max} characters`
      };
    }

    // Pattern validation
    if (fieldDefinition.pattern) {
      const regex = new RegExp(fieldDefinition.pattern);
      if (!regex.test(strValue)) {
        return {
          valid: false,
          error: fieldDefinition.description || 'Invalid format'
        };
      }
    }

    // Format validation
    if (fieldDefinition.format === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(strValue)) {
        return { valid: false, error: 'Invalid email format' };
      }
    }

    if (fieldDefinition.format === 'url') {
      try {
        new URL(strValue);
      } catch {
        return { valid: false, error: 'Invalid URL format' };
      }
    }
  }

  // Number-specific validations
  if (fieldDefinition.type === 'number') {
    const numValue = Number(value);

    if (fieldDefinition.min !== undefined && numValue < fieldDefinition.min) {
      return {
        valid: false,
        error: `Must be at least ${fieldDefinition.min}`
      };
    }

    if (fieldDefinition.max !== undefined && numValue > fieldDefinition.max) {
      return {
        valid: false,
        error: `Must be at most ${fieldDefinition.max}`
      };
    }
  }

  // Field dependencies
  if (fieldDefinition.depends_on) {
    const dependentValue = getFieldValue(fieldDefinition.depends_on.field, allData);
    const conditionMet = evaluateDependencyCondition(
      dependentValue,
      fieldDefinition.depends_on.operator,
      fieldDefinition.depends_on.value
    );

    if (!conditionMet && value !== undefined && value !== null) {
      // Field should be hidden, but has a value - might be a warning
      return { valid: true, warning: 'Field should be empty based on dependencies' };
    }
  }

  return { valid: true };
}

/**
 * Execute a validator definition
 */
async function executeValidator(
  validator: ValidatorDefinition,
  allData: Record<string, any>,
  fieldName: string
): Promise<FieldValidationResult> {
  const value = fieldName === 'root' ? allData : getFieldValue(fieldName, allData);

  switch (validator.type) {
    case 'required':
      if (value === undefined || value === null || value === '') {
        return {
          valid: false,
          error: validator.message || `${fieldName} is required`
        };
      }
      break;

    case 'min':
      if (typeof value === 'string' && value.length < (validator.value || 0)) {
        return {
          valid: false,
          error: validator.message || `Must be at least ${validator.value} characters`
        };
      }
      if (typeof value === 'number' && value < (validator.value || 0)) {
        return {
          valid: false,
          error: validator.message || `Must be at least ${validator.value}`
        };
      }
      break;

    case 'max':
      if (typeof value === 'string' && value.length > (validator.value || Infinity)) {
        return {
          valid: false,
          error: validator.message || `Must be at most ${validator.value} characters`
        };
      }
      if (typeof value === 'number' && value > (validator.value || Infinity)) {
        return {
          valid: false,
          error: validator.message || `Must be at most ${validator.value}`
        };
      }
      break;

    case 'pattern':
      if (typeof value === 'string' && validator.value) {
        const regex = new RegExp(validator.value);
        if (!regex.test(value)) {
          return {
            valid: false,
            error: validator.message || 'Invalid format'
          };
        }
      }
      break;

    case 'email':
      if (typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return {
            valid: false,
            error: validator.message || 'Invalid email format'
          };
        }
      }
      break;

    case 'url':
      if (typeof value === 'string') {
        try {
          new URL(value);
        } catch {
          return {
            valid: false,
            error: validator.message || 'Invalid URL format'
          };
        }
      }
      break;

    case 'custom':
      if (validator.validator_function) {
        return await executeCustomValidator(validator.validator_function, allData);
      }
      break;
  }

  return { valid: true };
}

/**
 * Execute custom validator function
 * Note: In a real implementation, this would need to load and execute custom validators
 * For now, we'll return a placeholder that can be extended
 */
/**
 * Registry of built-in custom validators
 */
const BUILT_IN_VALIDATORS: Record<string, (data: any) => FieldValidationResult> = {
  ip_address: (value: any) => {
    if (typeof value !== 'string') return { valid: false, error: 'Must be a string' };
    // Simple IPv4/IPv6 check
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6 = /^[0-9a-fA-F:]+$/; // Simplified check
    if (!ipv4.test(value) && !ipv6.test(value)) {
      return { valid: false, error: 'Invalid IP address' };
    }
    return { valid: true };
  },
  port: (value: any) => {
    const port = Number(value);
    if (isNaN(port) || port < 1 || port > 65535) {
      return { valid: false, error: 'Port must be between 1 and 65535' };
    }
    return { valid: true };
  },
  url: (value: any) => {
    try {
      new URL(value);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL' };
    }
  }
};

/**
 * Execute custom validator function
 */
async function executeCustomValidator(
  validatorName: string,
  allData: Record<string, any>
): Promise<FieldValidationResult> {
  // Check built-in validators first
  if (BUILT_IN_VALIDATORS[validatorName]) {
    // For single-field validators acting on "root", we might need to pass specific fields.
    // But typically custom step validators look at the whole data object.
    // If the validator is meant for a specific field, it should be called via the field validation path.

    // However, if we are calling this from executeCustomValidator (step level), 
    // we might assume the validator handles the whole object or looks for specific keys.
    // For simplicity in this generic engine, we assume step-level validators
    // might need to check specific fields manually.

    // Let's assume built-ins above are for FIELDS, but here we are in STEP validation context.
    // We will support a convention: "validate_ip:hostname" checks "hostname" field.

    if (validatorName.includes(':')) {
      const [func, field] = validatorName.split(':');
      if (BUILT_IN_VALIDATORS[func]) {
        return BUILT_IN_VALIDATORS[func](allData[field]);
      }
    }
  }

  // TODO: Add support for dynamically loading project-specific validators from a registry

  // Return valid for unknown validators to prevent blocking flow
  console.warn(`[StepValidationEngine] Custom validator "${validatorName}" not found or allowed`);
  return { valid: true };
}

/**
 * Get field value from data object (supports nested paths)
 */
function getFieldValue(fieldPath: string, data: Record<string, any>): any {
  const parts = fieldPath.split('.');
  return parts.reduce((obj: any, part: string) => obj?.[part], data);
}

/**
 * Evaluate dependency condition
 */
function evaluateDependencyCondition(
  value: any,
  operator: 'equals' | 'not_equals' | 'contains' | 'exists' | 'not_exists',
  expectedValue?: any
): boolean {
  switch (operator) {
    case 'equals':
      return value === expectedValue;
    case 'not_equals':
      return value !== expectedValue;
    case 'contains':
      return Array.isArray(value) && value.includes(expectedValue);
    case 'exists':
      return value !== undefined && value !== null;
    case 'not_exists':
      return value === undefined || value === null;
    default:
      return false;
  }
}
