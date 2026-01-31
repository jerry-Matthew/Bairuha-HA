import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationCatalog } from '../integrations/entities/integration-catalog.entity';

export interface ConditionalConfig {
    field: string;
    operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in" | "not_in";
    value: any | any[];
}

export interface DynamicOptionsConfig {
    source: "api" | "field" | "static";
    endpoint?: string;
    field?: string;
    mapping?: {
        label: string;
        value: string;
    };
}

export interface FileConfig {
    accept?: string[];
    maxSize?: number;
    multiple?: boolean;
}

export interface ValidationConfig {
    pattern?: string;
    patternMessage?: string;
    customValidator?: string;
    minLength?: number;
    maxLength?: number;
    crossFieldValidation?: {
        dependsOn: string[];
        validator: string;
    };
}

export interface ConfigFieldSchema {
    type: "string" | "password" | "number" | "boolean" | "select" | "multiselect" | "file" | "object" | "array";
    description?: string;
    label?: string;
    required?: boolean;
    default?: any;
    placeholder?: string;
    min?: number;
    max?: number;
    conditional?: ConditionalConfig;
    dependsOn?: string[];
    dynamicOptions?: DynamicOptionsConfig;
    options?: Array<{ label: string; value: any }>;
    fileConfig?: FileConfig;
    properties?: Record<string, ConfigFieldSchema>;
    items?: ConfigFieldSchema;
    validation?: ValidationConfig;
    helpText?: string;
    tooltip?: string;
    documentation?: string;
    group?: string;
    section?: string;
    order?: number;
}

export type IntegrationConfigSchema = Record<string, ConfigFieldSchema>;

export interface ValidationResult {
    valid: boolean;
    errors: Record<string, string>;
}

const INTEGRATION_SCHEMAS: Record<string, IntegrationConfigSchema> = {
    ewelink: {
        email: {
            type: "string",
            label: "Email",
            required: true,
            order: 1
        },
        password: {
            type: "password",
            label: "Password",
            required: true,
            order: 2
        },
        areaCode: {
            type: "string",
            label: "Country Code (e.g. +1)",
            required: true,
            default: "+1",
            order: 3
        },
        region: {
            type: "select",
            label: "Region",
            required: true,
            order: 3,
            options: [
                { label: "US", value: "us" },
                { label: "EU", value: "eu" },
                { label: "CN", value: "cn" },
                { label: "AS", value: "as" }
            ],
            default: "us"
        }
    }
};

@Injectable()
export class ConfigSchemaService {
    private readonly logger = new Logger(ConfigSchemaService.name);

    constructor(
        @InjectRepository(IntegrationCatalog)
        private readonly catalogRepository: Repository<IntegrationCatalog>
    ) { }

    async getConfigSchema(integrationId: string): Promise<IntegrationConfigSchema> {
        if (INTEGRATION_SCHEMAS[integrationId]) {
            return INTEGRATION_SCHEMAS[integrationId];
        }

        try {
            const catalog = await this.catalogRepository.findOne({
                where: { domain: integrationId },
                select: ['flowConfig']
            });

            if (catalog && catalog.flowConfig) {
                const flowConfig: any = catalog.flowConfig;
                if (flowConfig.steps && flowConfig.steps.length > 0) {
                    return flowConfig.steps[0].schema || {};
                }
            }
        } catch (err) {
            this.logger.warn(`Failed to load schema for ${integrationId} from DB: ${err}`);
        }

        return {};
    }

    async validateConfig(
        integrationId: string,
        configData: Record<string, any>
    ): Promise<ValidationResult> {
        const schema = await this.getConfigSchema(integrationId);
        const errors: Record<string, string> = {};

        if (Object.keys(schema).length === 0) {
            return { valid: true, errors: {} };
        }

        Object.entries(schema).forEach(([fieldName, fieldSchema]) => {
            const value = configData[fieldName];

            if (fieldSchema.required) {
                if (value === undefined || value === null || value === "") {
                    errors[fieldName] = `${fieldSchema.label || fieldSchema.description || fieldName} is required`;
                    return;
                }
            }

            if (value !== undefined && value !== null && value !== "") {
                if (fieldSchema.type === "number" && isNaN(Number(value))) {
                    errors[fieldName] = "Must be a number";
                }
            }
        });

        return {
            valid: Object.keys(errors).length === 0,
            errors,
        };
    }

    async applyConfigDefaults(integrationId: string, configData: Record<string, any>): Promise<Record<string, any>> {
        const schema = await this.getConfigSchema(integrationId);
        const result = { ...configData };

        Object.entries(schema).forEach(([key, field]) => {
            if (result[key] === undefined && field.default !== undefined) {
                result[key] = field.default;
            }
        });
        return result;
    }
}
