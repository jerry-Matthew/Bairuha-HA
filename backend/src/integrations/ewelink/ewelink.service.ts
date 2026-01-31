
import { Injectable, Logger } from '@nestjs/common';
import ewelink from 'ewelink-api-next';
import { DevicesService } from '../../devices/devices.service';

@Injectable()
export class EwelinkService {
    private readonly logger = new Logger(EwelinkService.name);

    constructor(private readonly devicesService: DevicesService) { }

    async validateConfig(config: any): Promise<boolean> {
        try {
            const client = new ewelink.WebAPI({
                region: config.region,
                appId: config.appId || '4s1FXKC9FaGfoqXhmXSJneb3qcm1gOak', // Example appId from common open source projects
                appSecret: config.appSecret || 'oKvCM06gAoqjIm19909k660636WcAf67', // Example appSecret
            });

            const loginResponse = await client.user.login({
                account: config.email,
                password: config.password,
                areaCode: config.areaCode || '+1',
            });

            return !!loginResponse.at; // Access token
        } catch (error) {
            this.logger.error(`Validation failed: ${error.message}`);
            return false;
        }
    }

    async discoverDevices(config: any) {
        try {
            const client = new ewelink.WebAPI({
                region: config.region,
                appId: config.appId || '4s1FXKC9FaGfoqXhmXSJneb3qcm1gOak',
                appSecret: config.appSecret || 'oKvCM06gAoqjIm19909k660636WcAf67',
            });

            // Login to get access token
            const loginResponse = await client.user.login({
                account: config.email,
                password: config.password,
                areaCode: config.areaCode || '+1',
            });

            if (!loginResponse.at) {
                throw new Error('Login failed: No access token');
            }

            // Fetch devices
            // client.device.getAllThings returns { status, data: { thingList: [] } } or similar
            const response = await client.device.getAllThings({
                familyId: undefined, // Optional
            });

            if (response.error !== 0) {
                throw new Error(`Fetch failed: ${response.msg}`);
            }

            const devices = response.data?.thingList || [];

            // Transform to our internal device format
            return devices.map((d: any) => ({
                name: d.itemData?.name || d.name || 'Unknown Device',
                externalId: d.itemData?.deviceid || d.deviceid,
                manufacturer: 'eWeLink',
                model: d.itemData?.productModel || d.productModel || 'Unknown',
                type: 'switch', // Logic to determine type would go here
                data: d
            }));

        } catch (error) {
            this.logger.error(`Discovery failed: ${error.message}`);
            throw error;
        }
    }
}
