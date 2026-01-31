import { BaseConfigFlow, type FlowResult } from "../base-config-flow";
import { registerFlowHandler } from "../registry";

export class ZigbeeConfigFlow extends BaseConfigFlow {
    async step_user(user_input?: Record<string, any>): Promise<FlowResult> {
        if (user_input) {
            return this.createEntry({
                title: "Zigbee Home Automation",
                data: user_input,
            });
        }

        const devices = await this.waitForDiscovery("zigbee");

        if (devices.length > 0) {
            const deviceOptions = devices.map(d => ({
                label: `${d.name} (${d.identifiers?.path || "Unknown path"})`,
                value: d.id
            }));

            return this.showForm({
                step_id: "user",
                data_schema: {
                    serial_port: {
                        type: "select",
                        label: "Detected Zigbee Stick",
                        options: deviceOptions,
                        required: true
                    },
                    radio_type: {
                        type: "select",
                        label: "Radio Type",
                        options: [
                            { label: "ZNP (TI CC2531, CC2652)", value: "znp" },
                            { label: "EZSP (Silicon Labs)", value: "ezsp" },
                            { label: "Deconz (ConBee/RaspBee)", value: "deconz" },
                            { label: "ZIGATE", value: "zigate" }
                        ],
                        default: "znp",
                        required: true
                    }
                }
            });
        }

        // Manual Entry
        return this.showForm({
            step_id: "user",
            data_schema: {
                serial_port: { type: "string", label: "Serial Port Path", required: true },
                radio_type: {
                    type: "select",
                    label: "Radio Type",
                    options: [
                        { label: "ZNP (TI CC2531, CC2652)", value: "znp" },
                        { label: "EZSP (Silicon Labs)", value: "ezsp" },
                        { label: "Deconz (ConBee/RaspBee)", value: "deconz" },
                        { label: "ZIGATE", value: "zigate" }
                    ],
                    default: "znp",
                    required: true
                }
            }
        });
    }
}

registerFlowHandler("zigbee", ZigbeeConfigFlow);
