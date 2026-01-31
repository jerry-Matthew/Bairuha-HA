import { BaseConfigFlow, type FlowResult } from "../base-config-flow";
import { registerFlowHandler } from "../registry";

export class SonosConfigFlow extends BaseConfigFlow {
    async step_user(user_input?: Record<string, any>): Promise<FlowResult> {
        if (user_input) {
            return this.createEntry({
                title: "Sonos",
                data: user_input,
            });
        }

        const devices = await this.waitForDiscovery("ssdp");
        // Filter for Sonos devices usually via manufacturer or specific service type provided in discovery info
        // For this generic example, we trust the discovery domain filter if we had one specific for sonos
        // But since "ssdp" is generic, we might get others. Ideally, waitForDiscovery would accept a filter.
        // Here we assume getDiscoveredDevices("sonos") works if the discovery service maps ssdp results to domains.
        // Let's stick to "sonos" domain request which implies the discovery service handles the mapping.

        // Actually, let's use "sonos" as domain to waitForDiscovery, relying on DiscoveryService to use SSDP under the hood.
        const sonosDevices = await this.waitForDiscovery("sonos");

        if (sonosDevices.length > 0) {
            const deviceOptions = sonosDevices.map(d => ({
                label: `${d.name} (${d.identifiers?.host || "Unknown IP"})`,
                value: d.id
            }));

            return this.showForm({
                step_id: "user",
                data_schema: {
                    host: {
                        type: "select",
                        label: "Discovered Sonos Speakers",
                        options: deviceOptions,
                        required: true
                    }
                }
            });
        }

        return this.showForm({
            step_id: "user",
            data_schema: {
                host: { type: "string", label: "Host", required: true }
            }
        });
    }
}

registerFlowHandler("sonos", SonosConfigFlow);
