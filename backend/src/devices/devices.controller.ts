
import { Controller, Get, Post, Put, Delete, Body, Param, Query, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { EntitiesService } from './entities.service';
import { AreasService } from './areas.service';

@Controller('devices')
export class DevicesController {
    constructor(
        private readonly devicesService: DevicesService,
        private readonly entitiesService: EntitiesService,
        private readonly areasService: AreasService,
    ) { }

    // --- Devices ---

    @Get()
    async getAllDevices() {
        return this.devicesService.getAllDevices();
    }

    @Get(':id')
    async getDeviceById(@Param('id') id: string) {
        const device = await this.devicesService.getDeviceById(id);
        if (!device) throw new NotFoundException('Device not found');
        return device;
    }

    // Legacy dev-register endpoint support
    // POST /api/devices/dev-register
    @Post('dev-register')
    async devRegister(@Body() body: any) {
        if (process.env.NODE_ENV !== 'development') {
            throw new BadRequestException('This endpoint is only available in development mode');
        }

        if (!body.name || !body.device_type) {
            throw new BadRequestException("Missing required fields: 'name' and 'device_type'");
        }

        const { name, device_type, integration = "local_dev", area } = body;

        // Resolve area
        let areaId = undefined;
        if (area) {
            let existingArea = await this.areasService.getAreaByName(area);
            // Also check by slugified name logic if needed, but simple name check is default
            if (existingArea) {
                areaId = existingArea.id;
            } else {
                // Create area
                // Convert slug to readable name if needed, assuming user passed slug
                const displayName = area
                    .split('_')
                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                const newArea = await this.areasService.createArea({ name: displayName });
                areaId = newArea.id;
            }
        }

        const device = await this.devicesService.registerDevice({
            name,
            integrationId: integration,
            integrationName: integration === 'local_dev' ? 'Local Development' : integration,
            model: this.getModelForDeviceType(device_type),
            areaId,
            deviceType: device_type
        });

        const entities = await this.entitiesService.getEntities(device.id);

        return {
            device,
            entities,
            message: `Device '${name}' registered successfully with ${entities.length} entity/entities`
        };
    }

    private getModelForDeviceType(deviceType: string): string {
        const mapping: Record<string, string> = {
            smart_light: "Smart Light Device",
            temperature_sensor: "Temperature Sensor Device",
            motion_sensor: "Motion Sensor Device",
            smart_switch: "Smart Switch Device",
            thermostat: "Thermostat Device",
            door_lock: "Door Lock Device",
            garage_door: "Garage Door Device",
        };
        return mapping[deviceType] || "Generic Device";
    }

    @Delete(':id')
    async deleteDevice(@Param('id') id: string) {
        await this.devicesService.deleteDevice(id);
        return { success: true };
    }

    @Put(':id')
    async updateDevice(@Param('id') id: string, @Body() body: any) {
        return this.devicesService.updateDevice(id, body);
    }

    // --- Entities ---
    // Typically entities are accessed via /api/entities, but legacy might have /api/devices/:id/entities

    @Get(':id/entities')
    async getDeviceEntities(@Param('id') id: string) {
        return this.entitiesService.getEntities(id);
    }
}

@Controller('areas')
export class AreasController {
    constructor(private readonly areasService: AreasService) { }

    @Get()
    async getAllAreas() {
        return this.areasService.getAllAreas();
    }

    @Post()
    async createArea(@Body() body: { name: string; icon?: string }) {
        return this.areasService.createArea(body);
    }
}

@Controller('entities')
export class EntitiesController {
    constructor(private readonly entitiesService: EntitiesService) { }

    @Get()
    async getAllEntities(@Query('deviceId') deviceId?: string) {
        return this.entitiesService.getEntities(deviceId);
    }

    @Get(':id')
    async getEntity(@Param('id') id: string) {
        const entity = await this.entitiesService.getEntityById(id);
        if (!entity) throw new NotFoundException('Entity not found');
        return entity;
    }

    @Put(':id/state')
    async updateState(@Param('id') id: string, @Body() body: { state: string; attributes?: any }) {
        return this.entitiesService.updateEntityState(id, body.state, body.attributes);
    }
}
