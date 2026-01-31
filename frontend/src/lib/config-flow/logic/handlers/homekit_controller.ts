import { BaseConfigFlow, type FlowResult } from "../base-config-flow";
import { registerFlowHandler } from "../registry";

export class HomeKitControllerConfigFlow extends BaseConfigFlow {
    /**
     * The logic-driven initial step.
     * Mirrors async_step_user in HA.
     */
    async step_user(user_input?: Record<string, any>): Promise<FlowResult> {
        console.log(`[HomeKit Logic] step_user called with input:`, user_input);

        // LOGIC: If we have input, creates the entry
        if (user_input) {
            return this.createEntry({
                title: "Test HomeKit Device",
                data: user_input,
            });
        }

        // LOGIC: Check network usage BEFORE showing form (Task 66)
        const devices = await this.waitForDiscovery("homekit");

        if (devices.length === 0) {
            // No devices found -> Abort immediately
            return this.abort({ reason: "no_devices_found" });
        }

        // Devices found -> Show selection form
        const deviceOptions = devices.map(d => ({
            label: `${d.name} (${d.model})`,
            value: d.id
        }));

        return this.showForm({
            step_id: "user",
            data_schema: {
                device_id: {
                    type: "select",
                    label: "Select HomeKit Device",
                    required: true,
                    options: deviceOptions
                },
                pairing_code: {
                    type: "string",
                    label: "Pairing Code",
                    required: true
                }
            }
        });
    }
}

// Register self
registerFlowHandler("homekit_controller", HomeKitControllerConfigFlow);
