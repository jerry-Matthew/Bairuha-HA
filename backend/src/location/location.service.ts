import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

export interface DeviceLocation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    city?: string;
    region?: string;
    country?: string;
    address?: string;
    type: 'raspberry_pi' | 'sensor' | 'camera';
    lastUpdated: Date;
}

@Injectable()
export class LocationService {
    private readonly logger = new Logger(LocationService.name);
    private cachedLocation: DeviceLocation | null = null;
    private cacheExpiry: Date | null = null;
    private readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

    constructor(private readonly settingsService: SettingsService) { }

    /**
     * Get device location using Database Settings > Environment Variables > IP Geolocation
     */
    async getDeviceLocation(): Promise<DeviceLocation> {
        // 1. Check Database Settings
        try {
            const dbLocation = await this.settingsService.getSetting<DeviceLocation>('device_info');
            if (dbLocation) {
                // Ensure type safety and default values
                return {
                    ...dbLocation,
                    lastUpdated: new Date(dbLocation.lastUpdated || Date.now())
                };
            }
        } catch (err) {
            this.logger.warn(`Failed to read location from DB: ${err.message}`);
        }

        // Return cached location if still valid (for IP/Env fallback)
        if (this.cachedLocation && this.cacheExpiry && new Date() < this.cacheExpiry) {
            this.logger.log('Returning cached location');
            return this.cachedLocation;
        }

        try {
            this.logger.log('Fetching location from ipapi.co...');

            // Call ipapi.co API (same as Home Assistant)
            const response = await fetch('https://ipapi.co/json/');

            if (!response.ok) {
                throw new Error(`IP geolocation API returned ${response.status}`);
            }

            const data = await response.json();

            // Check if we got valid coordinates
            if (!data.latitude || !data.longitude) {
                throw new Error('Invalid coordinates from IP geolocation');
            }

            // Create device location object
            const location: DeviceLocation = {
                id: 'main-raspberry-pi',
                name: process.env.DEVICE_NAME || 'Home Assistant Pi',
                latitude: data.latitude,
                longitude: data.longitude,
                city: data.city,
                region: data.region,
                country: data.country_name,
                address: `${data.city}, ${data.region}, ${data.country_name}`,
                type: 'raspberry_pi',
                lastUpdated: new Date(),
            };

            // Cache the result
            this.cachedLocation = location;
            this.cacheExpiry = new Date(Date.now() + this.CACHE_DURATION_MS);

            this.logger.log(`Location detected: ${location.city}, ${location.country} (${location.latitude}, ${location.longitude})`);

            return location;
        } catch (error) {
            this.logger.error('Failed to fetch location from IP geolocation', error);

            // Fallback to environment variables if API fails
            const fallbackLat = parseFloat(process.env.DEVICE_LATITUDE || '0');
            const fallbackLon = parseFloat(process.env.DEVICE_LONGITUDE || '0');

            if (fallbackLat !== 0 && fallbackLon !== 0) {
                this.logger.log('Using fallback location from environment variables');
                return {
                    id: 'main-raspberry-pi',
                    name: process.env.DEVICE_NAME || 'Home Assistant Pi',
                    latitude: fallbackLat,
                    longitude: fallbackLon,
                    address: process.env.DEVICE_ADDRESS,
                    type: 'raspberry_pi',
                    lastUpdated: new Date(),
                };
            }

            // Ultimate fallback: return a default location
            this.logger.warn('Using default location (Kozhikode, India)');
            return {
                id: 'main-raspberry-pi',
                name: 'Home Assistant Pi',
                latitude: 11.2588,
                longitude: 75.7804,
                city: 'Kozhikode',
                region: 'Kerala',
                country: 'India',
                address: 'Kozhikode, Kerala, India',
                type: 'raspberry_pi',
                lastUpdated: new Date(),
            };
        }
    }

    /**
     * Get all tracked devices (for future expansion)
     */
    async getAllDevices(): Promise<DeviceLocation[]> {
        const mainDevice = await this.getDeviceLocation();
        return [mainDevice];
    }

    /**
     * Manually refresh location (useful for testing or manual updates)
     */
    async refreshLocation(): Promise<DeviceLocation> {
        this.cachedLocation = null;
        this.cacheExpiry = null;
        return this.getDeviceLocation();
    }
}
