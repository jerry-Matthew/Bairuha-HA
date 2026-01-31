/**
 * Home Assistant Discovery Handler Tests
 */

import { HomeAssistantDiscoveryHandler } from "../../handlers/homeassistant-discovery-handler";
import { haRestClient } from "@/lib/home-assistant/rest-client";

jest.mock("@/lib/home-assistant/rest-client");
jest.mock("@/components/globalAdd/server/config-entry.registry");

const mockHaRestClient = haRestClient as jest.Mocked<typeof haRestClient>;

describe("HomeAssistantDiscoveryHandler", () => {
  let handler: HomeAssistantDiscoveryHandler;

  beforeEach(() => {
    handler = new HomeAssistantDiscoveryHandler();
    jest.clearAllMocks();
  });

  describe("getProtocolName", () => {
    it("returns homeassistant", () => {
      expect(handler.getProtocolName()).toBe("homeassistant");
    });
  });

  describe("isAvailable", () => {
    it("returns true when HA is configured", async () => {
      const { getConfigEntryByIntegration } = await import("@/components/globalAdd/server/config-entry.registry");
      jest.mocked(getConfigEntryByIntegration).mockResolvedValue({
        id: "1",
        integrationDomain: "homeassistant",
        title: "Home Assistant",
        data: { base_url: "http://localhost:8123", access_token: "token" },
        status: "loaded",
        createdAt: new Date(),
      });

      const available = await handler.isAvailable();
      expect(available).toBe(true);
    });

    it("returns false when HA is not configured", async () => {
      const { getConfigEntryByIntegration } = await import("@/components/globalAdd/server/config-entry.registry");
      jest.mocked(getConfigEntryByIntegration).mockResolvedValue(null);

      const available = await handler.isAvailable();
      expect(available).toBe(false);
    });

    it("returns false when HA config status is not loaded", async () => {
      const { getConfigEntryByIntegration } = await import("@/components/globalAdd/server/config-entry.registry");
      jest.mocked(getConfigEntryByIntegration).mockResolvedValue({
        id: "1",
        integrationDomain: "homeassistant",
        title: "Home Assistant",
        data: {},
        status: "not_loaded",
        createdAt: new Date(),
      });

      const available = await handler.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe("discover", () => {
    it("returns discovered devices from HA", async () => {
      const { getConfigEntryByIntegration } = await import("@/components/globalAdd/server/config-entry.registry");
      jest.mocked(getConfigEntryByIntegration).mockResolvedValue({
        id: "1",
        integrationDomain: "homeassistant",
        title: "Home Assistant",
        data: { base_url: "http://localhost:8123", access_token: "token" },
        status: "loaded",
        createdAt: new Date(),
      });

      mockHaRestClient.getStates.mockResolvedValue([
        {
          entity_id: "light.living_room",
          state: "on",
          attributes: {
            device_id: "device1",
            device_name: "Living Room Light",
            device_manufacturer: "Philips",
            device_model: "Hue",
            device_identifiers: { mac: "aa:bb:cc:dd:ee:ff" },
            device_connections: [["mac", "aa:bb:cc:dd:ee:ff"]],
          },
        },
        {
          entity_id: "switch.kitchen",
          state: "off",
          attributes: {
            device_id: "device2",
            device_name: "Kitchen Switch",
            device_manufacturer: "Sonoff",
            device_model: "Basic",
          },
        },
      ]);

      const devices = await handler.discover();

      expect(devices).toHaveLength(2);
      expect(devices[0].id).toBe("device1");
      expect(devices[0].name).toBe("Living Room Light");
      expect(devices[0].manufacturer).toBe("Philips");
      expect(devices[0].model).toBe("Hue");
      expect(devices[0].integrationDomain).toBe("light");
      expect(devices[0].protocol).toBe("homeassistant");
      expect(devices[1].id).toBe("device2");
      expect(devices[1].name).toBe("Kitchen Switch");
    });

    it("returns empty array when HA is not configured", async () => {
      const { getConfigEntryByIntegration } = await import("@/components/globalAdd/server/config-entry.registry");
      jest.mocked(getConfigEntryByIntegration).mockResolvedValue(null);

      const devices = await handler.discover();
      expect(devices).toEqual([]);
    });

    it("skips entities without device_id or device_name", async () => {
      const { getConfigEntryByIntegration } = await import("@/components/globalAdd/server/config-entry.registry");
      jest.mocked(getConfigEntryByIntegration).mockResolvedValue({
        id: "1",
        integrationDomain: "homeassistant",
        title: "Home Assistant",
        data: {},
        status: "loaded",
        createdAt: new Date(),
      });

      mockHaRestClient.getStates.mockResolvedValue([
        {
          entity_id: "light.living_room",
          state: "on",
          attributes: {
            // Missing device_id
            device_name: "Living Room Light",
          },
        },
        {
          entity_id: "switch.kitchen",
          state: "off",
          attributes: {
            device_id: "device2",
            // Missing device_name
          },
        },
        {
          entity_id: "sensor.temperature",
          state: "20",
          attributes: {
            device_id: "device3",
            device_name: "Temperature Sensor",
          },
        },
      ]);

      const devices = await handler.discover();

      // Should only include device3
      expect(devices).toHaveLength(1);
      expect(devices[0].id).toBe("device3");
    });

    it("deduplicates devices by device_id", async () => {
      const { getConfigEntryByIntegration } = await import("@/components/globalAdd/server/config-entry.registry");
      jest.mocked(getConfigEntryByIntegration).mockResolvedValue({
        id: "1",
        integrationDomain: "homeassistant",
        title: "Home Assistant",
        data: {},
        status: "loaded",
        createdAt: new Date(),
      });

      mockHaRestClient.getStates.mockResolvedValue([
        {
          entity_id: "light.living_room",
          state: "on",
          attributes: {
            device_id: "device1",
            device_name: "Living Room Light",
          },
        },
        {
          entity_id: "switch.living_room",
          state: "off",
          attributes: {
            device_id: "device1", // Same device_id
            device_name: "Living Room Switch",
          },
        },
      ]);

      const devices = await handler.discover();

      // Should only include one device
      expect(devices).toHaveLength(1);
      expect(devices[0].id).toBe("device1");
    });

    it("handles errors gracefully", async () => {
      const { getConfigEntryByIntegration } = await import("@/components/globalAdd/server/config-entry.registry");
      jest.mocked(getConfigEntryByIntegration).mockResolvedValue({
        id: "1",
        integrationDomain: "homeassistant",
        title: "Home Assistant",
        data: {},
        status: "loaded",
        createdAt: new Date(),
      });

      mockHaRestClient.getStates.mockRejectedValue(new Error("HA connection failed"));

      const devices = await handler.discover();
      expect(devices).toEqual([]);
    });
  });

  describe("getTimeout", () => {
    it("returns 15 seconds", () => {
      expect(handler.getTimeout()).toBe(15000);
    });
  });
});
