import { Controller, Get, Query } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
    constructor(private readonly weatherService: WeatherService) { }

    @Get()
    async getWeather(
        @Query('lat') lat?: string,
        @Query('lon') lon?: string,
        @Query('city') city?: string,
    ) {
        const latNum = lat ? parseFloat(lat) : undefined;
        const lonNum = lon ? parseFloat(lon) : undefined;
        return this.weatherService.getWeather(latNum, lonNum, city);
    }

    @Get('debug/init-entity')
    async debugInitEntity() {
        return this.weatherService.debugEnsureEntity();
    }
}
