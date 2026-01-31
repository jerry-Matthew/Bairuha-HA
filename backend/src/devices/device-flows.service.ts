import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceFlowsService as DeviceFlowsServiceInterface } from './device-flows.service'; // not needed if we overwrite
import { ConfigFlow } from './entities/config-flow.entity';
import { IntegrationCatalog } from '../integrations/entities/integration-catalog.entity';
import { DevicesService } from './devices.service';
import { ConfigSchemaService } from './integration-config-schemas';
import {
    DeviceFlowStepDto,
    DeviceFlowConfirmDto,
    IntegrationDto,
    FlowStartResponseDto,
    FlowStepResponseDto
} from './dto/device-flow.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class DeviceFlowsService {
    private readonly logger = new Logger(DeviceFlowsService.name);

    constructor(
        @InjectRepository(ConfigFlow)
        private readonly flowRepository: Repository<ConfigFlow>,
        @InjectRepository(IntegrationCatalog)
        private readonly catalogRepository: Repository<IntegrationCatalog>,
        private readonly devicesService: DevicesService,
        private readonly configSchemaService: ConfigSchemaService,
    ) { }

    async startFlow(): Promise<FlowStartResponseDto> {
        const flowId = randomUUID();
        const flow = this.flowRepository.create({
            id: flowId,
            step: 'pick_integration',
            data: {},
        });

        await this.flowRepository.save(flow);

        return {
            flowId: flow.id,
            step: 'pick_integration',
            integrations: [],
        };
    }

    async getIntegrations(): Promise<IntegrationDto[]> {
        const integrations = await this.catalogRepository.find({
            where: { supportsDevices: true },
            order: { name: 'ASC' },
        });

        return integrations.map(row => ({
            id: row.domain,
            domain: row.domain,
            name: row.name,
            description: row.description,
            icon: row.icon,
            brandImageUrl: row.brandImageUrl,
            isCloud: row.isCloud,
            supportsDeviceCreation: true,
            isConfigured: false
        }));
    }

    async advanceFlow(flowId: string, dto: DeviceFlowStepDto): Promise<FlowStepResponseDto> {
        const flow = await this.flowRepository.findOne({ where: { id: flowId } });
        if (!flow) throw new NotFoundException('Flow not found');

        let nextStep = flow.step;
        let responseData: FlowStepResponseDto = { step: nextStep };
        const data = flow.data || {};
        const configData = dto.stepData || dto.configData;

        switch (flow.step) {
            case 'pick_integration':
                if (!dto.integrationId) throw new BadRequestException('Integration ID required');

                const schema = await this.configSchemaService.getConfigSchema(dto.integrationId);

                flow.integrationDomain = dto.integrationId;
                flow.step = 'configure';
                flow.data = { ...data, integrationId: dto.integrationId };
                await this.flowRepository.save(flow);

                nextStep = 'configure';
                responseData = {
                    step: nextStep,
                    schema: schema
                };
                break;

            case 'configure':
                const configToValidate = configData || {};
                const validation = await this.configSchemaService.validateConfig(flow.integrationDomain!, configToValidate);

                if (!validation.valid) {
                    throw new BadRequestException({ message: 'Validation failed', validationErrors: validation.errors });
                }

                const defaults = await this.configSchemaService.applyConfigDefaults(flow.integrationDomain!, configToValidate);

                flow.step = 'confirm';
                flow.data = { ...data, configData: defaults };
                await this.flowRepository.save(flow);

                nextStep = 'confirm';
                responseData = {
                    step: nextStep,
                    data: flow.data
                };
                break;

            case 'confirm':
                throw new BadRequestException('Flow already completed');

            default:
                throw new BadRequestException(`Unknown step ${flow.step}`);
        }

        if (nextStep === 'pick_integration') {
            responseData.integrations = await this.getIntegrations();
        }

        return responseData;
    }

    async confirmFlow(flowId: string, dto: DeviceFlowConfirmDto): Promise<{ device: any, message: string }> {
        const flow = await this.flowRepository.findOne({ where: { id: flowId } });
        if (!flow) throw new NotFoundException('Flow not found');

        const integrationId = flow.integrationDomain;
        if (!integrationId) throw new BadRequestException('No integration selected');

        const name = dto.deviceName || `${integrationId} Device`;

        const device = await this.devicesService.registerDevice({
            name: name,
            integrationId: integrationId,
            integrationName: integrationId,
            model: dto.model,
            manufacturer: dto.manufacturer,
            deviceType: dto.deviceType,
            areaId: dto.areaId,
        });

        await this.flowRepository.remove(flow);

        return {
            device,
            message: 'Device registered successfully'
        };
    }

    async getStepInfo(flowId: string, stepId: string): Promise<any> {
        const flow = await this.flowRepository.findOne({ where: { id: flowId } });
        if (!flow) throw new NotFoundException('Flow not found');

        let componentType = 'manual';
        let schema = {};
        let title = 'Configure Device';

        if (stepId === 'configure') {
            componentType = 'manual';
            if (flow.integrationDomain) {
                schema = await this.configSchemaService.getConfigSchema(flow.integrationDomain);
                const cat = await this.catalogRepository.findOne({
                    where: { domain: flow.integrationDomain },
                    select: ['name']
                });
                if (cat) {
                    title = `Configure ${cat.name}`;
                }
            }
        } else if (stepId === 'pick_integration') {
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
        return [];
    }
}
