import { BaseConfigFlow, type FlowResult } from "../base-config-flow";
import { registerFlowHandler } from "../registry";

export class MQTTConfigFlow extends BaseConfigFlow {
    async step_user(user_input?: Record<string, any>): Promise<FlowResult> {
        if (user_input) {
            return this.createEntry({
                title: "MQTT Broker",
                data: user_input,
            });
        }

        const devices = await this.waitForDiscovery("mqtt");

        if (devices.length > 0) {
            const deviceOptions = devices.map(d => ({
                label: `${d.name} (${d.identifiers?.host || d.connections?.[0]?.[1] || "Unknown"})`,
                value: d.id
            }));

            return this.showForm({
                step_id: "user",
                data_schema: {
                    broker_id: {
                        type: "select",
                        label: "Discovered Brokers",
                        options: deviceOptions,
                        required: false // Optional if they want to enter manually
                    },
                    broker: { type: "string", label: "Broker", required: true },
                    port: { type: "number", label: "Port", default: 1883 },
                    username: { type: "string", label: "Username" },
                    password: { type: "string", label: "Password" },
                }
            });
        }

        // Manual Entry
        return this.showForm({
            step_id: "user",
            data_schema: {
                broker: { type: "string", label: "Broker", required: true },
                port: { type: "number", label: "Port", default: 1883 },
                username: { type: "string", label: "Username" },
                password: { type: "string", label: "Password" },
            }
        });
    }
}

registerFlowHandler("mqtt", MQTTConfigFlow);
