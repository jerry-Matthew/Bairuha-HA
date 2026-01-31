/**
 * Discovery Flow Handler Tests
 */

import { DiscoveryFlowHandler } from "../../handlers/discovery-flow-handler";
import { getConfigSchema } from "@/components/addDevice/server/integration-config-schemas";
import { discoveryService } from "@/lib/discovery";

jest.mock("@/components/addDevice/server/integration-config-schemas");
jest.mock("@/lib/discovery");

const mockGetConfigSchema = getConfigSchema as jest.MockedFunction<typeof getConfigSchema>;
const mockDiscoveryService = discoveryService as jest.Mocked<typeof discoveryService>;

describe("DiscoveryFlowHandler", () => {
  let handler: DiscoveryFlowHandler;

  beforeEach(() => {
    handler = new DiscoveryFlowHandler();
    jest.clearAllMocks();
  });

  describe("getInitialStep", () => {
    it("returns discover as initial step", async () => {
      const step = await handler.getInitialStep("test_integration");
      expect(step).toBe("discover");
    });
  });

  describe("getNextStep", () => {
    it("moves from discover to configure when device selected and schema has fields", async () => {
      mockGetConfigSchema.mockReturnValue({
        api_key: { type: "string", required: true },
      });

      const nextStep = await handler.getNextStep(
        "discover",
        { selectedDeviceId: "device123" },
        "test_integration"
      );

      expect(nextStep).toBe("configure");
    });

    it("moves from discover to confirm when device selected and schema is empty", async () => {
      mockGetConfigSchema.mockReturnValue({});

      const nextStep = await handler.getNextStep(
        "discover",
        { selectedDeviceId: "device123" },
        "test_integration"
      );

      expect(nextStep).toBe("confirm");
    });

    it("moves from discover to pick_integration when no device selected", async () => {
      const nextStep = await handler.getNextStep(
        "discover",
        {},
        "test_integration"
      );

      expect(nextStep).toBe("pick_integration");
    });

    it("moves from pick_integration to configure when schema has fields", async () => {
      mockGetConfigSchema.mockReturnValue({
        host: { type: "string", required: true },
      });

      const nextStep = await handler.getNextStep(
        "pick_integration",
        {},
        "test_integration"
      );

      expect(nextStep).toBe("configure");
    });

    it("moves from pick_integration to confirm when schema is empty", async () => {
      mockGetConfigSchema.mockReturnValue({});

      const nextStep = await handler.getNextStep(
        "pick_integration",
        {},
        "test_integration"
      );

      expect(nextStep).toBe("confirm");
    });

    it("moves from configure to confirm", async () => {
      const nextStep = await handler.getNextStep(
        "configure",
        {},
        "test_integration"
      );

      expect(nextStep).toBe("confirm");
    });

    it("throws error when flow is already completed", async () => {
      await expect(
        handler.getNextStep("confirm", {}, "test_integration")
      ).rejects.toThrow("Flow already completed");
    });
  });

  describe("discoverDevices", () => {
    it("calls discovery service", async () => {
      const mockDevices = [
        {
          id: "device1",
          name: "Device 1",
          protocol: "homeassistant",
          discoveredAt: new Date(),
        },
      ];

      mockDiscoveryService.discoverDevices.mockResolvedValue(mockDevices);

      const devices = await handler.discoverDevices("test_integration");

      expect(discoveryService.discoverDevices).toHaveBeenCalledWith("test_integration", undefined);
      expect(devices).toEqual(mockDevices);
    });

    it("passes flow config to discovery service", async () => {
      const flowConfig = {
        discovery_protocols: {
          mqtt: {},
        },
      };

      mockDiscoveryService.discoverDevices.mockResolvedValue([]);

      await handler.discoverDevices("test_integration", flowConfig);

      expect(discoveryService.discoverDevices).toHaveBeenCalledWith("test_integration", flowConfig);
    });
  });

  describe("refreshDiscovery", () => {
    it("calls discovery service refresh", async () => {
      mockDiscoveryService.refreshDiscovery.mockResolvedValue([]);

      await handler.refreshDiscovery("test_integration");

      expect(discoveryService.refreshDiscovery).toHaveBeenCalledWith("test_integration", undefined);
    });

    it("passes flow config to discovery service refresh", async () => {
      const flowConfig = {
        discovery_protocols: {
          mqtt: {},
        },
      };

      mockDiscoveryService.refreshDiscovery.mockResolvedValue([]);

      await handler.refreshDiscovery("test_integration", flowConfig);

      expect(discoveryService.refreshDiscovery).toHaveBeenCalledWith("test_integration", flowConfig);
    });
  });
});
