import { BaseConfigFlow, type FlowResult } from "../base-config-flow";
import { registerFlowHandler } from "../registry";

export class HueConfigFlow extends BaseConfigFlow {
    async step_user(user_input?: Record<string, any>): Promise<FlowResult> {
        if (user_input) {
            // Typically Hue requires a button press here, but for simplicity:
            return this.createEntry({
                title: "Philips Hue",
                data: user_input,
            });
        }

        const bridges = await this.waitForDiscovery("hue"); // Assuming 'hue' protocol/domain mapping exists

        if (bridges.length > 0) {
            const bridgeOptions = bridges.map(d => ({
                label: `${d.name} (${d.identifiers?.host || d.id})`,
                value: d.id
            }));

            return this.showForm({
                step_id: "user",
                data_schema: {
                    bridge_id: {
                        type: "select",
                        label: "Discovered Bridges",
                        options: bridgeOptions,
                        required: true
                    }
                }
            });
        }

        return this.showForm({
            step_id: "user",
            data_schema: {
                host: { type: "string", label: "Bridge Host", required: true }
            }
        });
    }
}

registerFlowHandler("hue", HueConfigFlow);
