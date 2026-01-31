import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HAServiceResponse {
    context: {
        id: string;
        parent_id: string | null;
        user_id: string | null;
    };
}

export class HARestClientError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public isRetryable: boolean = false
    ) {
        super(message);
        this.name = 'HARestClientError';
    }
}

@Injectable()
export class HARestClient {
    private readonly logger = new Logger(HARestClient.name);
    private readonly baseUrl: string;
    private readonly accessToken: string;

    constructor(private configService: ConfigService) {
        this.baseUrl = this.configService.get<string>('HA_BASE_URL') || '';
        this.accessToken = this.configService.get<string>('HA_ACCESS_TOKEN') || '';
    }

    /**
     * Check if HA is configured
     */
    isConfigured(): boolean {
        return !!this.baseUrl && !!this.accessToken;
    }

    /**
     * Call a Home Assistant service
     */
    async callService(
        domain: string,
        service: string,
        serviceData: Record<string, any>
    ): Promise<HAServiceResponse> {
        if (!this.isConfigured()) {
            throw new HARestClientError(
                'Home Assistant is not configured. Set HA_BASE_URL and HA_ACCESS_TOKEN in .env',
                undefined,
                false
            );
        }

        const url = `${this.baseUrl}/api/services/${domain}/${service}`;

        try {
            this.logger.log(`Calling HA service: ${domain}.${service}`, serviceData);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(serviceData),
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');

                // Network errors are retryable
                const isRetryable = response.status >= 500 || response.status === 503;

                throw new HARestClientError(
                    `HA service call failed: ${response.status} ${errorText}`,
                    response.status,
                    isRetryable
                );
            }

            const result = await response.json();
            this.logger.log(`HA service call successful: ${domain}.${service}`);

            return result;
        } catch (error) {
            if (error instanceof HARestClientError) {
                throw error;
            }

            // Network errors (connection refused, timeout, etc.) are retryable
            throw new HARestClientError(
                `Failed to call HA service: ${error instanceof Error ? error.message : 'Unknown error'}`,
                undefined,
                true // Network errors are retryable
            );
        }
    }

    /**
     * Get all states from Home Assistant
     */
    async getStates(): Promise<any[]> {
        if (!this.isConfigured()) {
            throw new HARestClientError(
                'Home Assistant is not configured',
                undefined,
                false
            );
        }

        const url = `${this.baseUrl}/api/states`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                },
            });

            if (!response.ok) {
                throw new HARestClientError(
                    `Failed to get states: ${response.status}`,
                    response.status,
                    response.status >= 500
                );
            }

            return await response.json();
        } catch (error) {
            if (error instanceof HARestClientError) {
                throw error;
            }

            throw new HARestClientError(
                `Failed to get states: ${error instanceof Error ? error.message : 'Unknown error'}`,
                undefined,
                true
            );
        }
    }
}
