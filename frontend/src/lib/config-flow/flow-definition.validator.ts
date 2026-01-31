/**
 * Flow Definition Validator
 * 
 * Validates flow definition structure and ensures it conforms to the expected schema
 */

import type {
  FlowDefinition,
  StepDefinition,
  FieldDefinition,
  StepCondition,
  ValidatorDefinition,
  ValidationError,
  FlowDefinitionValidationResult,
} from "./flow-definition.types";
import type { FlowType } from "./flow-type-resolver";

/**
 * Validate a complete flow definition
 */
export function validateFlowDefinition(definition: FlowDefinition): FlowDefinitionValidationResult {
  const errors: ValidationError[] = [];

  // Validate flow_type
  const validFlowTypes: FlowType[] = ['none', 'manual', 'discovery', 'oauth', 'wizard', 'hybrid'];
  if (!validFlowTypes.includes(definition.flow_type)) {
    errors.push({
      field: 'flow_type',
      message: `Invalid flow_type: ${definition.flow_type}. Must be one of: ${validFlowTypes.join(', ')}`,
      code: 'INVALID_FLOW_TYPE',
    });
  }

  // Validate name
  if (!definition.name || typeof definition.name !== 'string' || definition.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Flow name is required and must be a non-empty string',
      code: 'REQUIRED_FIELD',
    });
  }

  // Validate steps
  if (!Array.isArray(definition.steps) || definition.steps.length === 0) {
    errors.push({
      field: 'steps',
      message: 'Flow must have at least one step',
      code: 'REQUIRED_FIELD',
    });
  } else {
    // Validate each step
    definition.steps.forEach((step, index) => {
      const stepErrors = validateStepDefinition(step, index);
      errors.push(...stepErrors);
    });

    // Validate step IDs are unique
    const stepIds = definition.steps.map(s => s.step_id);
    const duplicateIds = stepIds.filter((id, index) => stepIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push({
        field: 'steps',
        message: `Duplicate step IDs found: ${duplicateIds.join(', ')}`,
        code: 'DUPLICATE_STEP_ID',
      });
    }

    // Validate initial_step if specified
    if (definition.initial_step) {
      if (!stepIds.includes(definition.initial_step)) {
        errors.push({
          field: 'initial_step',
          message: `Initial step '${definition.initial_step}' not found in steps array`,
          code: 'INVALID_STEP_REFERENCE',
        });
      }
    }
  }

  // Validate navigation references
  definition.steps.forEach((step, index) => {
    if (step.navigation?.next_step) {
      const stepIds = definition.steps.map(s => s.step_id);
      if (!stepIds.includes(step.navigation!.next_step!)) {
        errors.push({
          field: `steps[${index}].navigation.next_step`,
          message: `Next step '${step.navigation!.next_step}' not found in steps array`,
          code: 'INVALID_STEP_REFERENCE',
        });
      }
    }
    if (step.navigation?.skip_to_step) {
      const stepIds = definition.steps.map(s => s.step_id);
      if (!stepIds.includes(step.navigation!.skip_to_step!)) {
        errors.push({
          field: `steps[${index}].navigation.skip_to_step`,
          message: `Skip to step '${step.navigation!.skip_to_step}' not found in steps array`,
          code: 'INVALID_STEP_REFERENCE',
        });
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a step definition
 */
function validateStepDefinition(step: StepDefinition, index: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate step_id
  if (!step.step_id || typeof step.step_id !== 'string' || step.step_id.trim().length === 0) {
    errors.push({
      field: `steps[${index}].step_id`,
      message: 'Step ID is required and must be a non-empty string',
      code: 'REQUIRED_FIELD',
    });
  }

  // Validate step_type
  const validStepTypes = ['manual', 'discovery', 'oauth', 'wizard', 'confirm'];
  if (!validStepTypes.includes(step.step_type)) {
    errors.push({
      field: `steps[${index}].step_type`,
      message: `Invalid step_type: ${step.step_type}. Must be one of: ${validStepTypes.join(', ')}`,
      code: 'INVALID_STEP_TYPE',
    });
  }

  // Validate title
  if (!step.title || typeof step.title !== 'string' || step.title.trim().length === 0) {
    errors.push({
      field: `steps[${index}].title`,
      message: 'Step title is required and must be a non-empty string',
      code: 'REQUIRED_FIELD',
    });
  }

  // Validate schema
  if (!step.schema || typeof step.schema !== 'object') {
    errors.push({
      field: `steps[${index}].schema`,
      message: 'Step schema is required and must be an object',
      code: 'REQUIRED_FIELD',
    });
  } else {
    if (step.schema.type !== 'object') {
      errors.push({
        field: `steps[${index}].schema.type`,
        message: 'Step schema type must be "object"',
        code: 'INVALID_SCHEMA_TYPE',
      });
    }

    if (step.schema.properties && typeof step.schema.properties !== 'object') {
      errors.push({
        field: `steps[${index}].schema.properties`,
        message: 'Step schema properties must be an object',
        code: 'INVALID_SCHEMA_PROPERTIES',
      });
    } else if (step.schema.properties) {
      // Validate each field
      Object.entries(step.schema.properties).forEach(([fieldName, fieldDef]) => {
        const fieldErrors = validateFieldDefinition(fieldDef as FieldDefinition, index, fieldName);
        errors.push(...fieldErrors);
      });
    }
  }

  // Validate condition if present
  if (step.condition) {
    const conditionErrors = validateStepCondition(step.condition, index);
    errors.push(...conditionErrors);
  }

  // Validate validators if present
  if (step.validation?.validators) {
    step.validation.validators.forEach((validator, validatorIndex) => {
      const validatorErrors = validateValidatorDefinition(validator, index, validatorIndex);
      errors.push(...validatorErrors);
    });
  }

  return errors;
}

/**
 * Validate a field definition
 */
function validateFieldDefinition(field: FieldDefinition, stepIndex: number, fieldName: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate type
  const validFieldTypes = ['string', 'number', 'boolean', 'select', 'multiselect', 'password', 'url', 'email', 'file', 'object', 'array'];
  if (!validFieldTypes.includes(field.type)) {
    errors.push({
      field: `steps[${stepIndex}].schema.properties[${fieldName}].type`,
      message: `Invalid field type: ${field.type}. Must be one of: ${validFieldTypes.join(', ')}`,
      code: 'INVALID_FIELD_TYPE',
    });
  }

  // Validate title
  if (!field.title || typeof field.title !== 'string' || field.title.trim().length === 0) {
    errors.push({
      field: `steps[${stepIndex}].schema.properties[${fieldName}].title`,
      message: 'Field title is required and must be a non-empty string',
      code: 'REQUIRED_FIELD',
    });
  }

  // Validate options for select/multiselect
  if ((field.type === 'select' || field.type === 'multiselect') && !field.options) {
    errors.push({
      field: `steps[${stepIndex}].schema.properties[${fieldName}].options`,
      message: 'Select and multiselect fields must have options defined',
      code: 'REQUIRED_FIELD',
    });
  }

  // Validate min/max for number fields
  if (field.type === 'number') {
    if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
      errors.push({
        field: `steps[${stepIndex}].schema.properties[${fieldName}].min`,
        message: 'Field min value must be less than or equal to max value',
        code: 'INVALID_RANGE',
      });
    }
  }

  // Validate nested properties for object/array types
  if (field.type === 'object' && field.properties) {
    Object.entries(field.properties).forEach(([nestedFieldName, nestedField]) => {
      const nestedErrors = validateFieldDefinition(nestedField as FieldDefinition, stepIndex, `${fieldName}.${nestedFieldName}`);
      errors.push(...nestedErrors);
    });
  }

  if (field.type === 'array' && field.items) {
    const arrayErrors = validateFieldDefinition(field.items, stepIndex, `${fieldName}[]`);
    errors.push(...arrayErrors);
  }

  return errors;
}

/**
 * Validate a step condition
 */
function validateStepCondition(condition: StepCondition, stepIndex: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate depends_on
  if (!condition.depends_on || typeof condition.depends_on !== 'string') {
    errors.push({
      field: `steps[${stepIndex}].condition.depends_on`,
      message: 'Condition depends_on is required and must be a string',
      code: 'REQUIRED_FIELD',
    });
  }

  // Validate operator
  const validOperators = ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'exists', 'not_exists', 'in', 'not_in'];
  if (!validOperators.includes(condition.operator)) {
    errors.push({
      field: `steps[${stepIndex}].condition.operator`,
      message: `Invalid operator: ${condition.operator}. Must be one of: ${validOperators.join(', ')}`,
      code: 'INVALID_OPERATOR',
    });
  }

  // Validate value is present for operators that need it
  const operatorsNeedingValue = ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in'];
  if (operatorsNeedingValue.includes(condition.operator) && condition.value === undefined) {
    errors.push({
      field: `steps[${stepIndex}].condition.value`,
      message: `Operator '${condition.operator}' requires a value`,
      code: 'REQUIRED_FIELD',
    });
  }

  // Validate nested conditions if present
  if (condition.conditions && Array.isArray(condition.conditions)) {
    condition.conditions.forEach((nestedCondition, nestedIndex) => {
      const nestedErrors = validateStepCondition(nestedCondition, stepIndex);
      errors.push(...nestedErrors.map(err => ({
        ...err,
        field: `steps[${stepIndex}].condition.conditions[${nestedIndex}].${err.field.split('.').pop()}`,
      })));
    });
  }

  return errors;
}

/**
 * Validate a validator definition
 */
function validateValidatorDefinition(validator: ValidatorDefinition, stepIndex: number, validatorIndex: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate type
  const validValidatorTypes = ['required', 'min', 'max', 'pattern', 'email', 'url', 'custom'];
  if (!validValidatorTypes.includes(validator.type)) {
    errors.push({
      field: `steps[${stepIndex}].validation.validators[${validatorIndex}].type`,
      message: `Invalid validator type: ${validator.type}. Must be one of: ${validValidatorTypes.join(', ')}`,
      code: 'INVALID_VALIDATOR_TYPE',
    });
  }

  // Validate custom validator has validator_function
  if (validator.type === 'custom' && !validator.validator_function) {
    errors.push({
      field: `steps[${stepIndex}].validation.validators[${validatorIndex}].validator_function`,
      message: 'Custom validators must specify a validator_function',
      code: 'REQUIRED_FIELD',
    });
  }

  return errors;
}

/**
 * Validate flow definition structure (basic structure check)
 */
export function validateFlowDefinitionStructure(definition: any): boolean {
  if (!definition || typeof definition !== 'object') {
    return false;
  }

  if (!definition.flow_type || typeof definition.flow_type !== 'string') {
    return false;
  }

  if (!definition.name || typeof definition.name !== 'string') {
    return false;
  }

  if (!Array.isArray(definition.steps) || definition.steps.length === 0) {
    return false;
  }

  return true;
}
