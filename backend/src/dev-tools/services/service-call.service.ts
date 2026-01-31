
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { HomeAssistantService } from '../../realtime/home-assistant.service';

export interface ServiceCallTestParams {
    domain: string;
    service: string;
    serviceData?: Record<string, any>;
}

export interface ServiceCallTestResult {
    success: boolean;
    serviceCall: ServiceCallTestParams;
    haResponse?: any;
    error?: string;
    haError?: any;
    executedAt: string;
}

@Injectable()
export class ServiceCallService {
    constructor(
        @Inject(forwardRef(() => HomeAssistantService))
        private haService: HomeAssistantService
    ) { }

    async testServiceCall(params: ServiceCallTestParams): Promise<ServiceCallTestResult> {
        const executedAt = new Date().toISOString();

        try {
            // Execute service call directly via HA Service
            const haResponse = await this.haService.callService(
                params.domain,
                params.service,
                params.serviceData || {}
            );

            return {
                success: true,
                serviceCall: params,
                haResponse,
                executedAt,
            };
        } catch (error: any) {
            return {
                success: false,
                serviceCall: params,
                error: error.message || "Service call failed",
                haError: error instanceof Error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                } : error,
                executedAt,
            };
        }
    }

    async getAvailableServices(domain: string): Promise<string[]> {
        // This is a simplified implementation - full implementation would call HA's /api/services endpoint
        // We could add a method to HAService to fetch this if needed.
        const commonServices: Record<string, string[]> = {
            light: ['turn_on', 'turn_off', 'toggle', 'set_brightness', 'set_color', 'set_color_temp'],
            switch: ['turn_on', 'turn_off', 'toggle'],
            climate: ['turn_on', 'turn_off', 'set_temperature', 'set_hvac_mode'],
            cover: ['open_cover', 'close_cover', 'stop_cover', 'set_cover_position'],
            fan: ['turn_on', 'turn_off', 'set_speed'],
            lock: ['lock', 'unlock'],
        };

        return commonServices[domain] || ['turn_on', 'turn_off', 'toggle'];
    }
}
