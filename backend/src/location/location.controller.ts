import { Controller, Get } from '@nestjs/common';
import { LocationService } from './location.service';

@Controller('location')
export class LocationController {
    constructor(private readonly locationService: LocationService) { }

    @Get()
    async getDeviceLocation() {
        return this.locationService.getDeviceLocation();
    }

    @Get('devices')
    async getAllDevices() {
        return this.locationService.getAllDevices();
    }
}
