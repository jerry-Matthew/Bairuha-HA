import { BaseConfigFlow, type FlowResult } from "../base-config-flow";
import { registerFlowHandler } from "../registry";

export class ESPHomeConfigFlow extends BaseConfigFlow {
    async step_user(user_input?: Record<string, any>): Promise<FlowResult> {
        if (user_input) {
            return this.createEntry({
                title: `ESPHome: ${user_input.host || user_input.device_id}`,
                data: user_input,
            });
        }

        const devices = await this.waitForDiscovery("esphome");

        if (devices.length > 0) {
            const deviceOptions = devices.map(d => ({
                label: `${d.name} (${d.identifiers?.host || d.id})`,
                value: d.id
            }));

            return this.showForm({
                step_id: "user",
                data_schema: {
                    device_id: {
                        type: "select",
                        label: "Discovered ESPHome Devices",
                        options: deviceOptions,
                        required: true
                    },
                    password: { type: "string", label: "Encryption Key (Optional)" }
                }
            });
        }

        // Manual Entry
        return this.showForm({
            step_id: "user",
            data_schema: {
                host: { type: "string", label: "Host / IP Address", required: true },
                port: { type: "number", label: "Port", default: 6053 },
                password: { type: "string", label: "Encryption Key (Optional)" }
            }
        });
    }
}

registerFlowHandler("esphome", ESPHomeConfigFlow);
