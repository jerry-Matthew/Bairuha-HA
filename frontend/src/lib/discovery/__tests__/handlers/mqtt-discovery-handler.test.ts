/**
 * MQTT Discovery Handler Tests
 */

import { MQTTDiscoveryHandler } from "../../handlers/mqtt-discovery-handler";

jest.mock("@/components/globalAdd/server/config-entry.registry");

describe("MQTTDiscoveryHandler", () => {
  let handler: MQTTDiscoveryHandler;

  beforeEach(() => {
    handler = new MQTTDiscoveryHandler();
    jest.clearAllMocks();
  });

  describe("getProtocolName", () => {
    it("returns mqtt", () => {
      expect(handler.getProtocolName()).toBe("mqtt");
    });
  });

  describe("isAvailable", () => {
    it("returns true when MQTT is configured", async () => {
      const { getConfigEntryByIntegration } = await import("@/components/globalAdd/server/config-entry.registry");
      jest.mocked(getConfigEntryByIntegration).mockResolvedValue({
        id: "1",
        integrationDomain: "mqtt",
        title: "MQTT",
        data: {},
        status: "loaded",
        createdAt: new Date(),
      });

      const available = await handler.isAvailable();
      expect(available).toBe(true);
    });

    it("returns false when MQTT is not configured", async () => {
      const { getConfigEntryByIntegration } = await import("@/components/globalAdd/server/config-entry.registry");
      jest.mocked(getConfigEntryByIntegration).mockResolvedValue(null);

      const available = await handler.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe("discover", () => {
    it("returns empty array (placeholder)", async () => {
      const devices = await handler.discover();
      expect(devices).toEqual([]);
    });
  });

  describe("getTimeout", () => {
    it("returns 20 seconds", () => {
      expect(handler.getTimeout()).toBe(20000);
    });
  });
});
