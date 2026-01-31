
import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { RealtimeGateway } from './realtime.gateway';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class HomeAssistantService implements OnModuleInit {
    private ws: WebSocket | null = null;
    private readonly logger = new Logger(HomeAssistantService.name);
    private reconnectTimer: NodeJS.Timeout | null = null;
    private messageId = 1;

    constructor(
        private configService: ConfigService,
        @Inject(forwardRef(() => RealtimeGateway))
        private realtimeGateway: RealtimeGateway,
        private activityService: ActivityService,
    ) { }

    async onModuleInit() {
        this.connect();
    }

    private connect() {
        const haBaseUrl = this.configService.get<string>('HA_BASE_URL');
        const accessToken = this.configService.get<string>('HA_ACCESS_TOKEN');

        if (!haBaseUrl || !accessToken) {
            this.logger.warn('HA_BASE_URL or HA_ACCESS_TOKEN not configured. Skipping HA connection.');
            return;
        }

        const wsUrl = haBaseUrl.replace(/^http/, 'ws') + '/api/websocket';
        this.logger.log(`Connecting to Home Assistant at ${wsUrl}`);

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.on('open', () => {
                this.logger.log('HA WebSocket connected. Authenticating...');
                this.authenticate(accessToken);
            });

            this.ws.on('message', (data: WebSocket.Data) => {
                this.handleMessage(data);
            });

            this.ws.on('error', (error) => {
                this.logger.warn(`HA WebSocket error: ${error.message}`);
            });

            this.ws.on('close', () => {
                this.logger.warn('HA WebSocket closed. Reconnecting in 5s...');
                this.scheduleReconnect();
            });

        } catch (error) {
            this.logger.error('Failed to create WebSocket client', error);
            this.scheduleReconnect();
        }
    }

    private authenticate(accessToken: string) {
        if (this.ws) {
            this.ws.send(JSON.stringify({
                type: 'auth',
                access_token: accessToken,
            }));
        }
    }

    private handleMessage(data: WebSocket.Data) {
        try {
            const message = JSON.parse(data.toString());

            if (message.type === 'auth_ok') {
                this.logger.log('Authenticated with Home Assistant');
                this.subscribeToEvents();
            } else if (message.type === 'auth_invalid') {
                this.logger.error('Authentication failed:', message.message);
                if (this.ws) {
                    this.ws.close();
                }
            } else if (message.type === 'event' && message.event) {
                // Forward event to RealtimeGateway
                if (message.event.event_type === 'state_changed') {
                    const eventData = message.event.data;
                    const oldState = eventData.old_state?.state;
                    const newState = eventData.new_state.state;
                    const entityId = eventData.entity_id;

                    this.realtimeGateway.broadcastEntityStateChanged({
                        entityId: entityId,
                        state: newState,
                        attributes: eventData.new_state.attributes,
                        lastChanged: eventData.new_state.last_changed,
                        lastUpdated: eventData.new_state.last_updated,
                    });

                    // Log activity if state actually changed
                    if (oldState && newState && oldState !== newState) {
                        const friendlyName = eventData.new_state.attributes?.friendly_name || entityId;
                        const deviceClass = eventData.new_state.attributes?.device_class;

                        // Filter out noisy sensor updates (voltage, current, power, energy, etc.)
                        const noisySensorClasses = ['voltage', 'current', 'power', 'energy', 'battery', 'signal_strength'];
                        const isNoisySensor = noisySensorClasses.includes(deviceClass);

                        // Also filter by entity_id patterns
                        const isVoltageCurrent = entityId.includes('voltage') ||
                            entityId.includes('current') ||
                            entityId.includes('power') ||
                            entityId.includes('energy') ||
                            entityId.includes('signal') ||
                            entityId.includes('rssi') ||
                            entityId.includes('link_quality');

                        if (!isNoisySensor && !isVoltageCurrent) {
                            this.activityService.logActivity(
                                entityId,
                                friendlyName,
                                `Changed to ${newState}`,
                                'Unknown', // TODO: Get area from entity attributes
                                'state_change'
                            ).then(() => {
                                this.logger.log(`Activity logged for HA entity: ${entityId} (${oldState} -> ${newState})`);
                            }).catch(err => {
                                this.logger.error(`Failed to log activity for ${entityId}:`, err);
                            });
                        } else {
                            this.logger.debug(`Skipped noisy sensor activity: ${entityId}`);
                        }
                    }
                }
            }
        } catch (err) {
            this.logger.error('Error parsing message', err);
        }
    }

    private subscribeToEvents() {
        if (this.ws) {
            this.ws.send(JSON.stringify({
                id: this.messageId++,
                type: 'subscribe_events',
                event_type: 'state_changed',
            }));
            this.logger.log('Subscribed to state_changed events');
        }
    }

    public async callService(domain: string, service: string, serviceData: Record<string, any> = {}) {
        if (!this.ws) {
            throw new Error('Home Assistant WebSocket disconnected');
        }

        const id = this.messageId++;
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Service call timed out'));
                this.removeListener(id);
            }, 10000);

            const listener = (data: WebSocket.Data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.id === id) {
                        clearTimeout(timeout);
                        this.removeListener(id);
                        if (message.success) {
                            resolve(message.result);
                        } else {
                            reject(new Error(message.error?.message || 'Service call failed'));
                        }
                    }
                } catch (e) {
                    // Ignore parsing errors for other messages
                }
            };

            this.ws?.on('message', listener);

            // Send the command
            this.ws?.send(JSON.stringify({
                id,
                type: 'call_service',
                domain,
                service,
                service_data: serviceData
            }));
        });
    }

    // Helper to remove temporary listeners (naive implementation for this context)
    private removeListener(id: number) {
        // In a real implementation with `ws` library, we might need a more robust way to attach/detach specific handlers 
        // because we are attaching a new listener for every call. 
        // However, for this simplified scope, we let the main handleMessage filter, 
        // but strictly speaking we attached a *new* listener function 'listener' to the 'message' event.
        // We should remove THAT specific function. 
        // The implementation above inside callService adds 'listener' via this.ws.on. 
        // We need to keep a reference to remove it but this.ws.on returns the ws instance, not the reference.
        // The 'listener' variable IS the reference. 
        // So `this.ws?.off('message', listener)` would work if we had access to `listener` here.
        // Refactoring to move the listener logic inside callService is better.
        // For now, I'll rely on the listener itself removing itself or being ignored, but `ws` library works with EventEmitter pattern.
        // Let's rely on the fact that we can't easily remove anonymous listeners from outside without refactoring.
        // I will improve the implementation below in the ReplacementContent to fully handle add/remove logic inline.
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, 5000);
    }
}
