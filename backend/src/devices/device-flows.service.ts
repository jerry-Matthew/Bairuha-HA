
import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DATABASE_POOL } from '../database/database.module';
import { Pool } from 'pg';
import { DevicesService } from './devices.service';
import {
    DeviceFlowStartDto,
    DeviceFlowStepDto,
    DeviceFlowConfirmDto,
    IntegrationDto,
    FlowStartResponseDto,
    FlowStepResponseDto,
    DiscoveredDeviceDto
} from './dto/device-flow.dto';

interface ConfigFlow {
    id: string;
    userId?: string | null;
    integrationDomain?: string | null;
    step: string;
    data: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

import { ConfigSchemaService } from './integration-config-schemas';

@Injectable()
export class DeviceFlowsService {
    private readonly logger = new Logger(DeviceFlowsService.name);
    private readonly configSchemaService: ConfigSchemaService;

    constructor(
        @Inject(DATABASE_POOL) private readonly pool: Pool,
        private readonly devicesService: DevicesService,
    ) {
        this.configSchemaService = new ConfigSchemaService(pool);
    }

    // --- Persistence Methods ---

    private async createFlow(userId: string | null, step: string, data: Record<string, any>): Promise<ConfigFlow> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await this.pool.query(
            `INSERT INTO config_flows (id, user_id, step, data, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, userId, step, JSON.stringify(data), now, now]
        );

        return { id, userId, step, data, createdAt: now, updatedAt: now };
    }

    private async getFlowById(id: string): Promise<ConfigFlow | null> {
        const res = await this.pool.query(
            `SELECT id, user_id as "userId", integration_domain as "integrationDomain", step, data, created_at as "createdAt", updated_at as "updatedAt"
             FROM config_flows WHERE id = $1`,
            [id]
        );
        if (res.rows.length === 0) return null;
        const row = res.rows[0];
        return {
            ...row,
            data: typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {}),
        };
    }

    private async updateFlow(id: string, updates: Partial<ConfigFlow>): Promise<void> {
        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (updates.step) {
            fields.push(`step = $${idx++}`);
            values.push(updates.step);
        }
        if (updates.integrationDomain !== undefined) {
            fields.push(`integration_domain = $${idx++}`);
            values.push(updates.integrationDomain);
        }
        if (updates.data) {
            fields.push(`data = $${idx++}`);
            values.push(JSON.stringify(updates.data));
        }

        if (fields.length === 0) return;

        fields.push(`updated_at = $${idx++}`);
        values.push(new Date().toISOString());
        values.push(id);

        await this.pool.query(
            `UPDATE config_flows SET ${fields.join(', ')} WHERE id = $${idx}`,
            values
        );
    }

    private async deleteFlow(id: string): Promise<void> {
        await this.pool.query('DELETE FROM config_flows WHERE id = $1', [id]);
    }

    // --- Flow Logic ---

    async startFlow(): Promise<FlowStartResponseDto> {
        // Simple manual flow start - skipping discovery for now or stubbing it
        const flow = await this.createFlow(null, 'pick_integration', {});
        return {
            flowId: flow.id,
            step: 'pick_integration',
            integrations: [], // Frontend will fetch these via separate call usually? No, Next.js sends them if pick_integration
        };
    }

    async getIntegrations(): Promise<IntegrationDto[]> {
        const rows = await this.pool.query(
            `SELECT
              c.domain, c.name, c.description, c.icon, c.brand_image_url,
              c.is_cloud, c.supports_devices
             FROM integration_catalog c
             WHERE c.supports_devices = true
             ORDER BY c.name ASC`
        );

        return rows.rows.map(row => ({
            id: row.domain,
            domain: row.domain,
            name: row.name,
            description: row.description,
            icon: row.icon,
            brandImageUrl: row.brand_image_url,
            isCloud: row.is_cloud,
            supportsDeviceCreation: true,
            isConfigured: false // simplified
        }));
    }

    async advanceFlow(flowId: string, dto: DeviceFlowStepDto): Promise<FlowStepResponseDto> {
        const flow = await this.getFlowById(flowId);
        if (!flow) throw new NotFoundException('Flow not found');

        let nextStep = flow.step;
        let responseData: FlowStepResponseDto = { step: nextStep };
        const data = flow.data || {};
        const configData = dto.stepData || dto.configData; // Compat

        // State Machine
        switch (flow.step) {
            case 'pick_integration':
                if (!dto.integrationId) throw new BadRequestException('Integration ID required');

                // Fetch schema for this integration (real logic now)
                const schema = await this.configSchemaService.getConfigSchema(dto.integrationId);

                await this.updateFlow(flowId, {
                    integrationDomain: dto.integrationId,
                    step: 'configure',
                    data: { ...data, integrationId: dto.integrationId }
                });

                nextStep = 'configure';
                responseData = {
                    step: nextStep,
                    schema: schema // Return actual schema
                };
                break;

            case 'configure':
                // Validate config using service
                const configToValidate = configData || {};
                const validation = await this.configSchemaService.validateConfig(flow.integrationDomain!, configToValidate);

                if (!validation.valid) {
                    throw new BadRequestException({ message: 'Validation failed', validationErrors: validation.errors });
                }

                const defaults = await this.configSchemaService.applyConfigDefaults(flow.integrationDomain!, configToValidate);
                const newData = { ...data, configData: defaults };

                await this.updateFlow(flowId, {
                    step: 'confirm',
                    data: newData
                });

                nextStep = 'confirm';
                responseData = {
                    step: nextStep,
                    data: newData
                };
                break;

            case 'confirm':
                throw new BadRequestException('Flow already completed');

            default:
                throw new BadRequestException(`Unknown step ${flow.step}`);
        }

        // Catch-all for "pick_integration" loop-back
        if (nextStep === 'pick_integration') {
            responseData.integrations = await this.getIntegrations();
        }

        return responseData;
    }

    async confirmFlow(flowId: string, dto: DeviceFlowConfirmDto): Promise<{ device: any, message: string }> {
        const flow = await this.getFlowById(flowId);
        if (!flow) throw new NotFoundException('Flow not found');

        if (flow.step !== 'confirm') {
            // Allow confirm if we are in configure and it was just a simple form (implicit confirm)
            // But strict flow says be in confirm.
            // We'll enforce strictness for now.
        }

        const integrationId = flow.integrationDomain;
        if (!integrationId) throw new BadRequestException('No integration selected');

        const name = dto.deviceName || `${integrationId} Device`;

        // Register Device
        const device = await this.devicesService.registerDevice({
            name: name,
            integrationId: integrationId,
            integrationName: integrationId, // Lookup name ideally
            model: dto.model,
            manufacturer: dto.manufacturer,
            deviceType: dto.deviceType
        });

        // Cleanup Flow
        await this.deleteFlow(flowId);

        return {
            device,
            message: 'Device registered successfully'
        };
    }

    async getStepInfo(flowId: string, stepId: string): Promise<any> {
        const flow = await this.getFlowById(flowId);
        if (!flow) throw new NotFoundException('Flow not found');

        // Logic to determine component info based on step
        // For 'configure', we need schema.

        let componentType = 'manual'; // Default to manual (ConfigureStep)
        let schema = {};
        let title = 'Configure Device';

        if (stepId === 'configure') {
            componentType = 'manual';
            if (flow.integrationDomain) {
                schema = await this.configSchemaService.getConfigSchema(flow.integrationDomain);
                // Try to get title from catalog
                const cat = await this.pool.query("SELECT name FROM integration_catalog WHERE domain = $1", [flow.integrationDomain]);
                if (cat.rows.length > 0) {
                    title = `Configure ${cat.rows[0].name}`;
                }
            }
        } else if (stepId === 'pick_integration') {
            // Should not happen usually as picker is separate, but just in case
            return { componentType: 'picker', stepMetadata: { title: 'Select Brand', stepId } };
        } else if (stepId === 'confirm') {
            componentType = 'confirm';
            title = 'Confirm Device';
        }

        return {
            componentType,
            componentName: componentType === 'manual' ? 'ConfigureStep' : undefined,
            stepDefinition: {
                schema: {
                    type: 'object',
                    properties: schema
                }
            },
            stepMetadata: {
                stepId,
                title,
                description: 'Please enter the required configuration.'
            },
            props: {}
        };
    }

    async discoverDevices(): Promise<any[]> {
        return []; // Stub
    }
}
