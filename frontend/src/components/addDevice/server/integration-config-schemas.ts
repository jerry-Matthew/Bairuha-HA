import { query } from '../../../lib/db';

/**
 * Integration Config Schemas
 * 
 * Defines configuration schemas for integrations that require setup.
 * Each integration can define fields that need to be collected during setup.
 */

/**
 * Conditional field configuration
 */
export interface ConditionalConfig {
  field: string; // Field name to watch
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
  value: any | any[]; // Value(s) to compare against
}

/**
 * Dynamic options configuration
 */
export interface DynamicOptionsConfig {
  source: "api" | "field" | "static";
  endpoint?: string; // API endpoint URL (relative or absolute)
  field?: string; // Field name to use as source
  mapping?: { // Map response/field value to options
    label: string; // Property path for label (e.g., "name" or "user.name")
    value: string; // Property path for value (e.g., "id" or "user.id")
  };
}

/**
 * File upload configuration
 */
export interface FileConfig {
  accept?: string[]; // MIME types (e.g., ["image/*", "application/pdf"])
  maxSize?: number; // Max file size in bytes
  multiple?: boolean; // Allow multiple files
}

/**
 * Advanced validation configuration
 */
export interface ValidationConfig {
  pattern?: string; // Regex pattern
  patternMessage?: string; // Error message for pattern mismatch
  customValidator?: string; // Validator function name (server-side)
  minLength?: number; // For strings/arrays
  maxLength?: number; // For strings/arrays
  crossFieldValidation?: {
    dependsOn: string[]; // Fields to compare against
    validator: string; // Validator name (e.g., "password_match", "date_range")
  };
}

/**
 * Configuration field schema definition
 */
export interface ConfigFieldSchema {
  // Field type - extended with new types
  type: "string" | "password" | "number" | "boolean" | "select" | "multiselect" | "file" | "object" | "array";

  // Basic field properties
  description?: string;
  label?: string; // Alternative to description for UI display
  required?: boolean;
  default?: any;
  placeholder?: string;
  min?: number; // For number fields
  max?: number; // For number fields

  // Conditional field support
  conditional?: ConditionalConfig;

  // Field dependencies
  dependsOn?: string[]; // Array of field names this field depends on

  // Dynamic options (for select/multiselect)
  dynamicOptions?: DynamicOptionsConfig;
  options?: Array<{ label: string; value: any }>; // Static options for select/multiselect

  // File upload configuration
  fileConfig?: FileConfig;

  // Nested object/array configuration
  properties?: Record<string, ConfigFieldSchema>; // For "object" type
  items?: ConfigFieldSchema; // For "array" type

  // Advanced validation
  validation?: ValidationConfig;

  // Enhanced help/documentation
  helpText?: string; // Extended help text (shown below field)
  tooltip?: string; // Short tooltip (shown on hover)
  documentation?: string; // Link to documentation

  // Field grouping and layout
  group?: string; // Group name for field grouping
  section?: string; // Section name for field sections
  order?: number; // Display order within group/section
}

/**
 * Integration configuration schema
 * Maps field names to their schema definitions
 */
export type IntegrationConfigSchema = Record<string, ConfigFieldSchema>;

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Integration configuration schemas registry
 * Add schemas for integrations that require configuration
 * 
 * Advanced features supported:
 * - Conditional fields: Show/hide based on other field values
 * - Dynamic options: Load select options from API or other fields
 * - File uploads: Upload certificates, images, etc.
 * - Nested objects: Complex nested configuration structures
 * - Nested arrays: Multiple items with the same structure
 * - Advanced validation: Regex patterns, cross-field validation, custom validators
 * - Field help: Help text, tooltips, documentation links
 * - Field grouping: Group fields by group or section
 */
const INTEGRATION_SCHEMAS: Record<string, IntegrationConfigSchema> = {
  // Example: Home Assistant integration (basic)
  // homeassistant: {
  //   base_url: {
  //     type: "string",
  //     description: "Home Assistant base URL",
  //     required: true,
  //     placeholder: "http://homeassistant.local:8123",
  //     validation: {
  //       pattern: "^https?://.+",
  //       patternMessage: "Must be a valid HTTP/HTTPS URL",
  //     },
  //   },
  //   access_token: {
  //     type: "password",
  //     description: "Long-lived access token",
  //     required: true,
  //     helpText: "Create a long-lived access token in Home Assistant's profile settings",
  //   },
  // },

  // Example: Integration with conditional fields
  // weather_conditional: {
  //   connection_type: {
  //     type: "select",
  //     label: "Connection Type",
  //     required: true,
  //     options: [
  //       { label: "Local", value: "local" },
  //       { label: "Cloud", value: "cloud" }
  //     ],
  //     default: "local",
  //   },
  //   cloud_api_key: {
  //     type: "password",
  //     label: "Cloud API Key",
  //     required: true,
  //     conditional: {
  //       field: "connection_type",
  //       operator: "equals",
  //       value: "cloud",
  //     },
  //   },
  //   local_ip_address: {
  //     type: "string",
  //     label: "Local IP Address",
  //     required: true,
  //     placeholder: "192.168.1.100",
  //     validation: {
  //       pattern: "^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$",
  //       patternMessage: "Must be a valid IP address",
  //     },
  //     conditional: {
  //       field: "connection_type",
  //       operator: "equals",
  //       value: "local",
  //     },
  //   },
  // },

  // Example: Integration with dynamic options
  // weather_dynamic: {
  //   region: {
  //     type: "select",
  //     label: "Region",
  //     required: true,
  //     dynamicOptions: {
  //       source: "api",
  //       endpoint: "/api/integrations/weather/regions",
  //       mapping: {
  //         label: "name",
  //         value: "code",
  //       },
  //     },
  //   },
  //   device: {
  //     type: "select",
  //     label: "Device",
  //     required: true,
  //     dependsOn: ["region"],
  //     dynamicOptions: {
  //       source: "api",
  //       endpoint: "/api/integrations/weather/devices",
  //       mapping: {
  //         label: "device_name",
  //         value: "device_id",
  //       },
  //     },
  //   },
  // },

  // Example: Integration with file upload
  // ssl_integration: {
  //   ssl_certificate: {
  //     type: "file",
  //     label: "SSL Certificate",
  //     required: true,
  //     helpText: "Upload your SSL certificate file (.pem or .crt)",
  //     fileConfig: {
  //       accept: ["application/x-x509-ca-cert", "application/pkix-cert"],
  //       maxSize: 1024 * 1024, // 1MB
  //       multiple: false,
  //     },
  //   },
  //   custom_icons: {
  //     type: "file",
  //     label: "Custom Icons",
  //     required: false,
  //     fileConfig: {
  //       accept: ["image/*"],
  //       maxSize: 5 * 1024 * 1024, // 5MB
  //       multiple: true,
  //     },
  //   },
  // },

  // Example: Integration with nested object
  // mqtt_nested: {
  //   mqtt_config: {
  //     type: "object",
  //     label: "MQTT Configuration",
  //     properties: {
  //       broker_host: {
  //         type: "string",
  //         label: "Broker Host",
  //         required: true,
  //       },
  //       broker_port: {
  //         type: "number",
  //         label: "Broker Port",
  //         required: true,
  //         default: 1883,
  //         min: 1,
  //         max: 65535,
  //       },
  //       authentication: {
  //         type: "object",
  //         label: "Authentication",
  //         properties: {
  //           username: {
  //             type: "string",
  //             label: "Username",
  //             required: true,
  //           },
  //           password: {
  //             type: "password",
  //             label: "Password",
  //             required: true,
  //           },
  //         },
  //       },
  //     },
  //   },
  // },

  // Example: Integration with nested array
  // zones_array: {
  //   zones: {
  //     type: "array",
  //     label: "Zones",
  //     helpText: "Configure multiple zones for your system",
  //     items: {
  //       type: "object",
  //       properties: {
  //         name: {
  //           type: "string",
  //           label: "Zone Name",
  //           required: true,
  //         },
  //         temperature_sensor: {
  //           type: "select",
  //           label: "Temperature Sensor",
  //           required: true,
  //           dynamicOptions: {
  //             source: "api",
  //             endpoint: "/api/entities",
  //             mapping: {
  //               label: "name",
  //               value: "entity_id",
  //             },
  //           },
  //         },
  //         target_temperature: {
  //           type: "number",
  //           label: "Target Temperature",
  //           required: true,
  //           min: 0,
  //           max: 100,
  //         },
  //       },
  //     },
  //   },
  // },

  // Example: Integration with advanced validation and cross-field validation
  // password_example: {
  //   password: {
  //     type: "password",
  //     label: "Password",
  //     required: true,
  //     validation: {
  //       minLength: 8,
  //       pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)",
  //       patternMessage: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  //     },
  //   },
  //   confirm_password: {
  //     type: "password",
  //     label: "Confirm Password",
  //     required: true,
  //     validation: {
  //       crossFieldValidation: {
  //         dependsOn: ["password"],
  //         validator: "password_match",
  //       },
  //     },
  //   },
  // },

  // Matter integration
  matter: {
    url: {
      type: "string",
      label: "Matter Server URL",
      description: "The WebSocket URL of the Matter server",
      required: true,
      default: "ws://localhost:5580/ws",
      validation: {
        pattern: "^wss?://.+",
        patternMessage: "Must be a valid WebSocket URL (ws:// or wss://)",
      },
    },
  },

  // Add more integration schemas here as needed
};

/**
 * Get configuration schema for an integration
 * Returns empty object if integration doesn't require configuration
 */
export async function getConfigSchema(integrationId: string): Promise<IntegrationConfigSchema> {
  // First check hardcoded schemas (for overrides/testing)
  if (INTEGRATION_SCHEMAS[integrationId]) {
    return INTEGRATION_SCHEMAS[integrationId];
  }

  // Then check database
  try {
    const rows = await query(
      "SELECT flow_config FROM integration_catalog WHERE domain = $1",
      [integrationId]
    );

    if (rows.length > 0 && rows[0].flow_config) {
      const flowConfig = rows[0].flow_config;
      // flow_config is stored as { steps: [{ schema: ... }] }
      // We return the schema of the first step for now
      if (flowConfig.steps && flowConfig.steps.length > 0) {
        return flowConfig.steps[0].schema || {};
      }
    }
  } catch (err) {
    console.warn(`Failed to load schema for ${integrationId} from DB:`, err);
  }

  return {};
}

/**
 * Apply default values to configuration data (recursive for nested structures)
 */
function applyFieldDefaults(
  value: any,
  fieldSchema: ConfigFieldSchema
): any {
  // If value is already set, return it
  if (value !== undefined && value !== null && value !== "") {
    // For nested structures, recursively apply defaults
    if (fieldSchema.type === "object" && fieldSchema.properties && typeof value === "object" && !Array.isArray(value)) {
      const result: Record<string, any> = { ...value };
      Object.entries(fieldSchema.properties).forEach(([propName, propSchema]) => {
        result[propName] = applyFieldDefaults(result[propName], propSchema);
      });
      return result;
    }

    if (fieldSchema.type === "array" && fieldSchema.items && Array.isArray(value)) {
      return value.map(item => applyFieldDefaults(item, fieldSchema.items!));
    }

    return value;
  }

  // Apply default value
  if (fieldSchema.default !== undefined) {
    return fieldSchema.default;
  }

  // Apply type-specific defaults
  if (fieldSchema.type === "boolean") {
    return false;
  }

  if (fieldSchema.type === "object" && fieldSchema.properties) {
    const result: Record<string, any> = {};
    Object.entries(fieldSchema.properties).forEach(([propName, propSchema]) => {
      result[propName] = applyFieldDefaults(undefined, propSchema);
    });
    return result;
  }

  if (fieldSchema.type === "array") {
    return [];
  }

  return "";
}

/**
 * Apply default values to configuration data
 */
export async function applyConfigDefaults(
  integrationId: string,
  configData: Record<string, any>
): Promise<Record<string, any>> {
  const schema = await getConfigSchema(integrationId);
  const result = { ...configData };

  // Apply defaults from schema
  Object.entries(schema).forEach(([fieldName, fieldSchema]) => {
    result[fieldName] = applyFieldDefaults(result[fieldName], fieldSchema);
  });

  return result;
}

/**
 * Helper function to get nested property value using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

/**
 * Validate field against regex pattern
 */
function validateFieldAgainstPattern(
  value: any,
  pattern: string,
  patternMessage?: string,
  fieldName?: string
): string | null {
  if (typeof value !== "string") {
    return null; // Let type validation handle this
  }

  try {
    const regex = new RegExp(pattern);
    if (!regex.test(value)) {
      return patternMessage || `${fieldName || "Field"} does not match required pattern`;
    }
  } catch (error) {
    return `Invalid regex pattern: ${pattern}`;
  }

  return null;
}

/**
 * Validate nested field recursively
 */
function validateNestedField(
  value: any,
  schema: ConfigFieldSchema,
  fieldName: string,
  errors: Record<string, string>
): void {
  if (schema.type === "object" && schema.properties) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      errors[fieldName] = `${schema.label || schema.description || fieldName} must be an object`;
      return;
    }

    Object.entries(schema.properties).forEach(([propName, propSchema]) => {
      const propValue = value[propName];
      const fullFieldName = `${fieldName}.${propName}`;

      // Check required fields
      if (propSchema.required) {
        if (propValue === undefined || propValue === null || propValue === "") {
          errors[fullFieldName] = `${propSchema.label || propSchema.description || propName} is required`;
          return;
        }
      }

      // Skip validation if field is not required and not provided
      if (propValue === undefined || propValue === null || propValue === "") {
        return;
      }

      // Recursively validate nested fields
      validateNestedField(propValue, propSchema, fullFieldName, errors);
      // Also run type validation
      validateFieldType(propValue, propSchema, fullFieldName, errors);
    });
  } else if (schema.type === "array" && schema.items) {
    if (!Array.isArray(value)) {
      errors[fieldName] = `${schema.label || schema.description || fieldName} must be an array`;
      return;
    }

    // Validate each array item
    value.forEach((item, index) => {
      const itemFieldName = `${fieldName}[${index}]`;
      validateNestedField(item, schema.items!, itemFieldName, errors);
      validateFieldType(item, schema.items!, itemFieldName, errors);
    });
  }
}

/**
 * Validate field type and basic constraints
 */
function validateFieldType(
  value: any,
  fieldSchema: ConfigFieldSchema,
  fieldName: string,
  errors: Record<string, string>
): void {
  const fieldLabel = fieldSchema.label || fieldSchema.description || fieldName;

  switch (fieldSchema.type) {
    case "string":
    case "password":
      if (typeof value !== "string") {
        errors[fieldName] = `${fieldLabel} must be a string`;
        return;
      }

      // Min/Max length validation
      if (fieldSchema.validation?.minLength !== undefined && value.length < fieldSchema.validation.minLength) {
        errors[fieldName] = `${fieldLabel} must be at least ${fieldSchema.validation.minLength} characters`;
      }
      if (fieldSchema.validation?.maxLength !== undefined && value.length > fieldSchema.validation.maxLength) {
        errors[fieldName] = `${fieldLabel} must be at most ${fieldSchema.validation.maxLength} characters`;
      }

      // Regex pattern validation
      if (fieldSchema.validation?.pattern) {
        const patternError = validateFieldAgainstPattern(
          value,
          fieldSchema.validation.pattern,
          fieldSchema.validation.patternMessage,
          fieldLabel
        );
        if (patternError) {
          errors[fieldName] = patternError;
        }
      }
      break;

    case "number":
      const numValue = typeof value === "string" ? Number(value) : value;
      if (isNaN(numValue) || typeof numValue !== "number") {
        errors[fieldName] = `${fieldLabel} must be a number`;
      } else {
        if (fieldSchema.min !== undefined && numValue < fieldSchema.min) {
          errors[fieldName] = `${fieldLabel} must be at least ${fieldSchema.min}`;
        }
        if (fieldSchema.max !== undefined && numValue > fieldSchema.max) {
          errors[fieldName] = `${fieldLabel} must be at most ${fieldSchema.max}`;
        }
      }
      break;

    case "boolean":
      if (typeof value !== "boolean") {
        errors[fieldName] = `${fieldLabel} must be a boolean`;
      }
      break;

    case "select":
      // Validate that value exists in options (if static options provided)
      if (fieldSchema.options && fieldSchema.options.length > 0) {
        const validValues = fieldSchema.options.map(opt => opt.value);
        if (!validValues.includes(value)) {
          errors[fieldName] = `${fieldLabel} must be one of the allowed options`;
        }
      }
      // Dynamic options validation happens on the frontend
      break;

    case "multiselect":
      if (!Array.isArray(value)) {
        errors[fieldName] = `${fieldLabel} must be an array`;
      } else {
        // Validate min/max length for arrays
        if (fieldSchema.validation?.minLength !== undefined && value.length < fieldSchema.validation.minLength) {
          errors[fieldName] = `${fieldLabel} must have at least ${fieldSchema.validation.minLength} items`;
        }
        if (fieldSchema.validation?.maxLength !== undefined && value.length > fieldSchema.validation.maxLength) {
          errors[fieldName] = `${fieldLabel} must have at most ${fieldSchema.validation.maxLength} items`;
        }

        // Validate that all values exist in options (if static options provided)
        if (fieldSchema.options && fieldSchema.options.length > 0) {
          const validValues = fieldSchema.options.map(opt => opt.value);
          const invalidValues = value.filter(v => !validValues.includes(v));
          if (invalidValues.length > 0) {
            errors[fieldName] = `${fieldLabel} contains invalid options`;
          }
        }
      }
      break;

    case "file":
      // File validation happens during upload - here we just check if file ID is provided
      if (typeof value !== "string" && value !== null) {
        errors[fieldName] = `${fieldLabel} must be a file ID or null`;
      }
      break;

    case "object":
    case "array":
      // Nested validation handled by validateNestedField
      break;
  }
}

/**
 * Validate cross-field validation rules
 */
function validateCrossField(
  value: any,
  fieldName: string,
  fieldSchema: ConfigFieldSchema,
  allValues: Record<string, any>
): string | null {
  if (!fieldSchema.validation?.crossFieldValidation) {
    return null;
  }

  const { dependsOn, validator } = fieldSchema.validation.crossFieldValidation;
  const dependentValues = dependsOn.map(dep => allValues[dep]);

  switch (validator) {
    case "password_match":
      if (dependsOn.length === 1 && value !== dependentValues[0]) {
        return `${fieldSchema.label || fieldSchema.description || fieldName} must match ${dependsOn[0]}`;
      }
      break;

    case "date_range":
      if (dependsOn.length === 1) {
        const startDate = new Date(dependentValues[0]);
        const endDate = new Date(value);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return "Invalid date format";
        }
        if (endDate < startDate) {
          return "End date must be after start date";
        }
      }
      break;

    // Add more cross-field validators as needed
  }

  return null;
}

/**
 * Validate configuration data against schema
 */
export async function validateConfig(
  integrationId: string,
  configData: Record<string, any>
): Promise<ValidationResult> {
  const schema = await getConfigSchema(integrationId);
  const errors: Record<string, string> = {};

  // If no schema defined, validation passes (integration doesn't require config)
  if (Object.keys(schema).length === 0) {
    return { valid: true, errors: {} };
  }

  // Validate each field in schema
  Object.entries(schema).forEach(([fieldName, fieldSchema]) => {
    const value = configData[fieldName];

    // Check required fields (skip if conditional field should be hidden)
    if (fieldSchema.required) {
      // Check if field should be visible based on conditional
      if (fieldSchema.conditional) {
        const conditionValue = configData[fieldSchema.conditional.field];
        let shouldShow = false;

        switch (fieldSchema.conditional.operator) {
          case "equals":
            shouldShow = conditionValue === fieldSchema.conditional.value;
            break;
          case "not_equals":
            shouldShow = conditionValue !== fieldSchema.conditional.value;
            break;
          case "contains":
            shouldShow = Array.isArray(fieldSchema.conditional.value)
              ? fieldSchema.conditional.value.includes(conditionValue)
              : String(conditionValue).includes(String(fieldSchema.conditional.value));
            break;
          case "greater_than":
            shouldShow = Number(conditionValue) > Number(fieldSchema.conditional.value);
            break;
          case "less_than":
            shouldShow = Number(conditionValue) < Number(fieldSchema.conditional.value);
            break;
          case "in":
            shouldShow = Array.isArray(fieldSchema.conditional.value)
              ? fieldSchema.conditional.value.includes(conditionValue)
              : false;
            break;
          case "not_in":
            shouldShow = Array.isArray(fieldSchema.conditional.value)
              ? !fieldSchema.conditional.value.includes(conditionValue)
              : true;
            break;
        }

        // Skip required validation if field should be hidden
        if (!shouldShow) {
          return;
        }
      }

      if (value === undefined || value === null || value === "") {
        errors[fieldName] = `${fieldSchema.label || fieldSchema.description || fieldName} is required`;
        return;
      }
    }

    // Skip validation if field is not required and not provided
    if (value === undefined || value === null || value === "") {
      return;
    }

    // Type-specific validation
    validateFieldType(value, fieldSchema, fieldName, errors);

    // Nested field validation
    if (fieldSchema.type === "object" || fieldSchema.type === "array") {
      validateNestedField(value, fieldSchema, fieldName, errors);
    }

    // Cross-field validation
    if (fieldSchema.validation?.crossFieldValidation) {
      const crossFieldError = validateCrossField(value, fieldName, fieldSchema, configData);
      if (crossFieldError) {
        errors[fieldName] = crossFieldError;
      }
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
