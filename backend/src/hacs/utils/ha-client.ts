/**
 * Home Assistant WebSocket Client
 * 
 * Utility for connecting to Real Home Assistant instance
 * and querying integration/component status
 */

import WebSocket from 'ws';

interface HAMessage {
    id?: number;
    type: string;
    [key: string]: any;
}

interface HAAuthMessage {
    type: 'auth_required' | 'auth_ok' | 'auth_invalid';
    ha_version?: string;
}

export class HomeAssistantClient {
    private ws: WebSocket | null = null;
    private messageId = 1;
    private pendingRequests = new Map<number, {
        resolve: (value: any) => void;
        reject: (error: Error) => void;
    }>();

    constructor(
        private readonly url: string,
        private readonly token: string
    ) { }

    /**
     * Connect to Home Assistant WebSocket API
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            const wsUrl = this.url.replace('http://', 'ws://').replace('https://', 'wss://');
            this.ws = new WebSocket(`${wsUrl}/api/websocket`);

            this.ws.on('open', () => {
                // Wait for auth_required message
            });

            this.ws.on('message', (data: WebSocket.Data) => {
                const message: HAMessage | HAAuthMessage = JSON.parse(data.toString());

                if (message.type === 'auth_required') {
                    // Send authentication
                    this.send({
                        type: 'auth',
                        access_token: this.token
                    });
                } else if (message.type === 'auth_ok') {
                    resolve();
                } else if (message.type === 'auth_invalid') {
                    reject(new Error('Authentication failed'));
                } else if (message.type === 'result' && 'id' in message) {
                    // Handle response to our request
                    const pending = this.pendingRequests.get(message.id!);
                    if (pending) {
                        this.pendingRequests.delete(message.id!);
                        if (message.success) {
                            pending.resolve(message.result);
                        } else {
                            pending.reject(new Error(message.error?.message || 'Request failed'));
                        }
                    }
                }
            });

            this.ws.on('error', (error) => {
                reject(error);
            });

            this.ws.on('close', () => {
                this.ws = null;
            });
        });
    }

    /**
     * Send a message to Home Assistant
     */
    private send(message: HAMessage): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }
        this.ws.send(JSON.stringify(message));
    }

    /**
     * Send a request and wait for response
     */
    private async request(type: string, data: any = {}): Promise<any> {
        const id = this.messageId++;

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });

            this.send({
                id,
                type,
                ...data
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Request timeout'));
                }
            }, 10000);
        });
    }

    /**
     * Get all custom components (HACS integrations)
     */
    async getCustomComponents(): Promise<string[]> {
        try {
            // Query config to get custom components
            const config = await this.request('get_config');

            // Custom components are in config.components
            // Filter for custom_components (HACS installed ones)
            const components: string[] = config.components || [];

            // HACS integrations typically have specific patterns
            // We'll return all components and filter on the frontend if needed
            return components;
        } catch (error) {
            console.error('Error fetching custom components:', error);
            return [];
        }
    }

    /**
     * Get integration manifest for a specific integration
     */
    async getIntegrationManifest(domain: string): Promise<any> {
        try {
            const result = await this.request('integration/manifest', { integration: domain });
            return result;
        } catch (error) {
            console.error(`Error fetching manifest for ${domain}:`, error);
            return null;
        }
    }

    /**
     * Close the WebSocket connection
     */
    close(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

/**
 * Helper function to create a client and execute a query
 */
export async function queryHomeAssistant<T>(
    url: string,
    token: string,
    query: (client: HomeAssistantClient) => Promise<T>
): Promise<T> {
    const client = new HomeAssistantClient(url, token);
    try {
        await client.connect();
        return await query(client);
    } finally {
        client.close();
    }
}
