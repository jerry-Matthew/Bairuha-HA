
import { BaseConfigFlow } from "../base-config-flow";
import { registerFlowHandler, getFlowHandlerClass } from "../index";
import { discoveryService } from "../../../discovery/discovery-service";
import { MQTTConfigFlow } from "../handlers/mqtt";
import { HomeKitControllerConfigFlow } from "../handlers/homekit_controller";
import { ZWaveConfigFlow } from "../handlers/zwave";

// Mock DiscoveryService
jest.mock("../../discovery/discovery-service", () => {
    return {
        discoveryService: {
            discoverDevices: jest.fn(),
            getDiscoveredDevices: jest.fn(),
        }
    };
});

describe("Config Flow Logic Engine", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Registry", () => {
        it("should register and retrieve handlers", () => {
            const mqttClass = getFlowHandlerClass("mqtt");
            expect(mqttClass).toBeDefined();
            expect(mqttClass).toBe(MQTTConfigFlow);

            const zWaveClass = getFlowHandlerClass("zwave");
            expect(zWaveClass).toBeDefined();
            expect(zWaveClass).toBe(ZWaveConfigFlow);

            const invalidClass = getFlowHandlerClass("non_existent");
            expect(invalidClass).toBeUndefined();
        });
    });

    describe("HomeKit Handler (Task 66: Discovery Integration)", () => {
        it("should abort if no devices found", async () => {
            // Mock empty discovery
            (discoveryService.getDiscoveredDevices as jest.Mock).mockReturnValue([]);
            (discoveryService.discoverDevices as jest.Mock).mockResolvedValue([]);

            const handler = new HomeKitControllerConfigFlow("test_flow", "homekit_controller", {});
            const result = await handler.step_user();

            expect(discoveryService.discoverDevices).toHaveBeenCalledWith("homekit");
            expect(result.type).toBe("abort");
            expect(result.reason).toBe("no_devices_found");
        });

        it("should show select form if devices found", async () => {
            // Mock discovery result
            const devices = [
                { id: "hk_123", name: "Lightbulb", model: "LIFX", protocol: "homekit" }
            ];
            (discoveryService.getDiscoveredDevices as jest.Mock).mockReturnValue(devices);
            (discoveryService.discoverDevices as jest.Mock).mockResolvedValue(devices);

            const handler = new HomeKitControllerConfigFlow("test_flow", "homekit_controller", {});
            const result = await handler.step_user();

            expect(result.type).toBe("form");
            expect(result.data_schema!.device_id!.type).toBe("select");
            // Verify options using the new array format from Task 66 fix
            const options = result.data_schema!.device_id!.options as any[];
            expect(options).toHaveLength(1);
            expect(options[0].value).toBe("hk_123");
            expect(options[0].label).toContain("Lightbulb");
        });
    });

    describe("MQTT Handler (Task 67: Dynamic Logic)", () => {
        it("should show broker select if discovered", async () => {
            const devices = [
                { id: "mqtt_1", name: "Mosquitto", identifiers: { host: "192.168.1.5" }, protocol: "mqtt" }
            ];
            (discoveryService.getDiscoveredDevices as jest.Mock).mockReturnValue(devices);
            (discoveryService.discoverDevices as jest.Mock).mockResolvedValue(devices);

            const handler = new MQTTConfigFlow("flow_mqtt", "mqtt", {});
            const result = await handler.step_user();

            expect(result.type).toBe("form");
            expect(result.data_schema!.broker_id).toBeDefined(); // Found devices logic
        });

        it("should show manual form if not discovered", async () => {
            (discoveryService.getDiscoveredDevices as jest.Mock).mockReturnValue([]);
            (discoveryService.discoverDevices as jest.Mock).mockResolvedValue([]);

            const handler = new MQTTConfigFlow("flow_mqtt", "mqtt", {});
            const result = await handler.step_user();

            expect(result.type).toBe("form");
            expect(result.data_schema!.broker_id).toBeUndefined(); // Manual logic
            expect(result.data_schema!.broker).toBeDefined();
        });
    });
});
