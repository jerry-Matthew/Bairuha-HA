import { BaseConfigFlow, type FlowResult } from "../base-config-flow";
import { registerFlowHandler } from "../registry";

export class ZWaveConfigFlow extends BaseConfigFlow {
    async step_user(user_input?: Record<string, any>): Promise<FlowResult> {
        if (user_input) {
            return this.createEntry({
                title: "Z-Wave JS",
                data: user_input,
            });
        }

        const devices = await this.waitForDiscovery("zwave");

        if (devices.length > 0) {
            const deviceOptions = devices.map(d => ({
                label: `${d.name} (${d.identifiers?.path || "Unknown path"})`,
                value: d.id
            }));

            return this.showForm({
                step_id: "user",
                data_schema: {
                    usb_path: {
                        type: "select",
                        label: "Detected Z-Wave Stick",
                        options: deviceOptions,
                        required: true
                    },
                    network_key: { type: "string", label: "Network Key (Optional)" }
                }
            });
        }

        // Manual Entry
        return this.showForm({
            step_id: "user",
            data_schema: {
                url: { type: "string", label: "URL (ws://localhost:3000)", default: "ws://localhost:3000", required: true },
                network_key: { type: "string", label: "Network Key (Optional)" }
            }
        });
    }
}

registerFlowHandler("zwave", ZWaveConfigFlow);
