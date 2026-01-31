
import { Controller, Post, Get, Body, Param, Put } from '@nestjs/common';
import { DeviceFlowsService } from './device-flows.service';
import {
    DeviceFlowStartDto,
    DeviceFlowStepDto,
    DeviceFlowConfirmDto
} from './dto/device-flow.dto';

@Controller('device') // Maps to /api/device because global prefix is api
export class DeviceFlowsController {
    constructor(private readonly deviceFlowsService: DeviceFlowsService) { }

    @Get('discover')
    async discoverDevices() {
        const devices = await this.deviceFlowsService.discoverDevices();
        return { devices };
    }

    @Post('flows/start')
    async startFlow(@Body() dto: DeviceFlowStartDto) {
        return this.deviceFlowsService.startFlow();
    }

    @Post('flows/:flowId/step')
    async advanceFlow(
        @Param('flowId') flowId: string,
        @Body() dto: DeviceFlowStepDto
    ) {
        return this.deviceFlowsService.advanceFlow(flowId, dto);
    }

    @Post('flows/:flowId/confirm')
    async confirmFlow(
        @Param('flowId') flowId: string,
        @Body() dto: DeviceFlowConfirmDto
    ) {
        return this.deviceFlowsService.confirmFlow(flowId, dto);
    }

    @Get('flows/:flowId/step/:stepId')
    async getStepInfo(
        @Param('flowId') flowId: string,
        @Param('stepId') stepId: string
    ) {
        return this.deviceFlowsService.getStepInfo(flowId, stepId);
    }
}
