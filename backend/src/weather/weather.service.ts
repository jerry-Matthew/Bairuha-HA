import { Injectable, HttpException, HttpStatus, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DevicesService } from '../devices/devices.service';
import { EntitiesService } from '../devices/entities.service';

export interface WeatherData {
    location: string;
    temperature: number;
    condition: string;
    icon: string;
    humidity?: number;
    windSpeed?: number;
}

@Injectable()
export class WeatherService implements OnModuleInit {
    private readonly logger = new Logger(WeatherService.name);
    private readonly apiKey: string;
    private readonly defaultCity: string;

    constructor(
        private configService: ConfigService,
        private devicesService: DevicesService,
        private entitiesService: EntitiesService
    ) {
        this.apiKey = this.configService.get<string>('OPENWEATHER_API_KEY') || '';
        this.defaultCity = this.configService.get<string>('DEFAULT_WEATHER_CITY') || 'London,UK';

        // Warn if API key is missing, but don't crash yet
        if (!this.apiKey) {
            this.logger.warn('OPENWEATHER_API_KEY is not set in environment variables');
        }

        this.logger.log(`WeatherService initialized. DevicesService: ${!!this.devicesService}, EntitiesService: ${!!this.entitiesService}`);
    }

    async onModuleInit() {
        try {
            const fs = await import('fs');
            fs.appendFileSync('weather_debug.log', `[${new Date().toISOString()}] OnModuleInit called\n`);
        } catch (e) { }

        // Don't block startup
        try {
            await this.ensureWeatherEntity();
            this.updateWeatherEntity();
            // Update every 5 minutes
            setInterval(() => this.updateWeatherEntity(), 5 * 60 * 1000);
        } catch (err) {
            this.logger.error(`Failed to initialize weather entity: ${err.message}`);
            this.logger.error(err.stack);
        }
    }

    private async ensureWeatherEntity() {
        try {
            this.logger.log('[1/4] Starting ensureWeatherEntity...');

            // Look for Weather Service device by name
            this.logger.log('[2/4] Fetching all devices...');
            const allDevices = await this.devicesService.getAllDevices();
            this.logger.log(`[2/4] Found ${allDevices.length} devices`);
            let device = allDevices.find(d => d.name === 'Weather Service' && d.integrationId === 'weather') || null;

            if (!device) {
                this.logger.log('[3/4] Creating Weather Service device...');
                device = await this.devicesService.registerDevice({
                    name: 'Weather Service',
                    integrationId: 'weather',
                    integrationName: 'OpenWeatherMap',
                    model: 'Virtual Weather Station',
                    deviceType: 'service',
                    areaId: undefined // Global
                });
                this.logger.log(`[3/4] Device created with ID: ${device.id}`);
            } else {
                this.logger.log(`[3/4] Found existing device with ID: ${device.id}`);
            }

            // Check for entity
            this.logger.log('[4/4] Checking for weather.home entity...');
            const entity = await this.entitiesService.getEntityByEntityId('weather.home');
            if (!entity) {
                this.logger.log('[4/4] Creating weather.home entity...');
                const createdEntity = await this.entitiesService.createEntity({
                    deviceId: device.id,
                    entityId: 'weather.home',
                    domain: 'weather',
                    name: 'Home Weather',
                    icon: 'weather-partly-cloudy',
                    state: 'unknown',
                    attributes: {
                        temperature: 0,
                        humidity: 0,
                        wind_speed: 0,
                        unit_of_measurement: '°C'
                    },
                    source: 'internal'
                });
                this.logger.log(`[4/4] weather.home entity created successfully with ID: ${createdEntity.id}`);
            } else {
                this.logger.log(`[4/4] Found existing entity with ID: ${entity.id}`);
            }
        } catch (error) {
            this.logger.error(`[ERROR] Error ensuring weather entity: ${error.message}`);
            this.logger.error(error.stack);
            throw error; // Re-throw so debug endpoint can catch it
        }
    }

    async debugEnsureEntity() {
        const logs: string[] = [];
        try {
            logs.push('Starting debugEnsureEntity...');
            logs.push(`DevicesService available: ${!!this.devicesService}`);
            logs.push(`EntitiesService available: ${!!this.entitiesService}`);

            await this.ensureWeatherEntity();

            // Check if entity was created
            const entity = await this.entitiesService.getEntityByEntityId('weather.home');
            logs.push(`Entity check result: ${entity ? 'FOUND' : 'NOT FOUND'}`);

            return { success: true, logs, entity: entity ? { id: entity.id, state: entity.state } : null };
        } catch (error) {
            logs.push(`Error: ${error.message}`);
            return { success: false, error: error.message, stack: error.stack, logs };
        }
    }

    private async updateWeatherEntity() {
        try {
            const weather = await this.getWeather();
            const entity = await this.entitiesService.getEntityByEntityId('weather.home');

            if (entity) {
                await this.entitiesService.updateEntityState(
                    entity.id,
                    weather.condition.toLowerCase(),
                    {
                        temperature: weather.temperature,
                        humidity: weather.humidity,
                        wind_speed: weather.windSpeed,
                        location: weather.location,
                        icon: weather.icon,
                        last_updated: new Date().toISOString()
                    }
                );
                // this.logger.verbose(`Updated weather.home: ${weather.temperature}°C, ${weather.condition}`);
            }
        } catch (error) {
            this.logger.error(`Failed to update weather entity: ${error.message}`);
        }
    }

    async getWeather(lat?: number, lon?: number, city?: string): Promise<WeatherData> {
        try {
            if (!this.apiKey) {
                throw new HttpException('Weather API key not configured', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            let url = '';

            if (lat !== undefined && lon !== undefined) {
                url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;
            } else {
                const queryCity = city || this.defaultCity;
                url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(queryCity)}&appid=${this.apiKey}&units=metric`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new HttpException('City not found', HttpStatus.NOT_FOUND);
                }
                throw new Error(`Weather API failed: ${response.statusText}`);
            }

            const data = await response.json();

            return {
                location: `${data.name}, ${data.sys.country}`,
                temperature: Math.round(data.main.temp),
                condition: data.weather[0].main,
                icon: this.mapOpenWeatherIcon(data.weather[0].icon),
                humidity: data.main.humidity,
                windSpeed: data.wind.speed, // m/s by default
            };
        } catch (error) {
            if (error instanceof HttpException) throw error;
            console.error('Weather Fetch Error:', error);
            throw new HttpException('Failed to fetch weather data', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private mapOpenWeatherIcon(iconCode: string): string {
        // Map OpenWeatherMap icon codes to our internal icon names
        const mapping: Record<string, string> = {
            '01d': 'sunny',
            '01n': 'clear-night',
            '02d': 'partly-cloudy-day',
            '02n': 'partly-cloudy-night',
            '03d': 'cloudy',
            '03n': 'cloudy',
            '04d': 'cloudy',
            '04n': 'cloudy',
            '09d': 'rainy',
            '09n': 'rainy',
            '10d': 'rainy',
            '10n': 'rainy',
            '11d': 'thunderstorm',
            '11n': 'thunderstorm',
            '13d': 'snowy',
            '13n': 'snowy',
            '50d': 'fog',
            '50n': 'fog'
        };

        if (mapping[iconCode]) return mapping[iconCode];

        if (iconCode.startsWith('01')) return 'sunny';
        if (iconCode.startsWith('02') || iconCode.startsWith('03') || iconCode.startsWith('04')) return 'cloudy';
        if (iconCode.startsWith('09') || iconCode.startsWith('10')) return 'rainy';
        if (iconCode.startsWith('11')) return 'thunderstorm';
        if (iconCode.startsWith('13')) return 'snowy';
        if (iconCode.startsWith('50')) return 'fog';

        return 'cloud';
    }
}
