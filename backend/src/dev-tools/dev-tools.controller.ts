
import { Controller, Get, Post, Body, Query, UseGuards, Param } from '@nestjs/common';
import { StateInspectionService } from './services/state-inspection.service';
import { ServiceCallService, type ServiceCallTestParams } from './services/service-call.service';
import { TemplateTesterService, type TemplateTestParams } from './services/template-tester.service';
import { EventTriggerService, type EventTriggerParams } from './services/event-trigger.service';
import { YamlValidatorService } from './services/yaml-validator.service';
import { StatisticsService } from './services/statistics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dev-tools')
@UseGuards(JwtAuthGuard)
export class DevToolsController {
    constructor(
        private stateInspector: StateInspectionService,
        private serviceCall: ServiceCallService,
        private templateTester: TemplateTesterService,
        private eventTrigger: EventTriggerService,
        private yamlValidator: YamlValidatorService,
        private statistics: StatisticsService,
    ) { }

    @Get('entities')
    async getEntities(@Query() query: any) {
        return this.stateInspector.getEntities({
            domain: query.domain,
            deviceId: query.device_id,
            state: query.state,
            source: query.source,
            limit: query.limit ? parseInt(query.limit) : 100,
            offset: query.offset ? parseInt(query.offset) : 0,
        });
    }

    @Get('entities/:id')
    async getEntity(@Param('id') id: string) {
        const entity = await this.stateInspector.getEntity(id);
        if (!entity) return { entity: null };
        return { entity };
    }

    @Get('entities/stats')
    async getEntityStats() {
        return this.stateInspector.getEntityStats();
    }

    @Post('service-call')
    async testServiceCall(@Body() params: ServiceCallTestParams) {
        return this.serviceCall.testServiceCall(params);
    }

    @Post('template')
    async testTemplate(@Body() params: TemplateTestParams) {
        return this.templateTester.testTemplate(params);
    }

    @Post('event')
    async triggerEvent(@Body() params: EventTriggerParams) {
        return this.eventTrigger.triggerEvent(params);
    }

    @Post('yaml/validate')
    async validateYaml(@Body() body: { yaml: string }) {
        return this.yamlValidator.validateYAML(body.yaml);
    }

    @Get('statistics/summary')
    async getStatsSummary(@Query('timeRange') timeRange: string) {
        return this.statistics.getSummaryStatistics(timeRange);
    }
}
