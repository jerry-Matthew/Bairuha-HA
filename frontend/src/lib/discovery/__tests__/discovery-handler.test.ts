/**
 * Discovery Handler Tests
 */

import { BaseDiscoveryHandler } from "../discovery-handler";
import type { DiscoveredDevice } from "../discovery-handler";

class TestDiscoveryHandler extends BaseDiscoveryHandler {
  getProtocolName(): string {
    return "test";
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async discover(config?: any): Promise<DiscoveredDevice[]> {
    return [
      {
        id: "device1",
        name: "Test Device",
        protocol: this.getProtocolName(),
        discoveredAt: new Date(),
      },
    ];
  }
}

describe("BaseDiscoveryHandler", () => {
  let handler: TestDiscoveryHandler;

  beforeEach(() => {
    handler = new TestDiscoveryHandler();
  });

  describe("getProtocolName", () => {
    it("returns protocol name", () => {
      expect(handler.getProtocolName()).toBe("test");
    });
  });

  describe("isAvailable", () => {
    it("returns availability status", async () => {
      const available = await handler.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe("discover", () => {
    it("discovers devices", async () => {
      const devices = await handler.discover();
      expect(devices).toHaveLength(1);
      expect(devices[0].id).toBe("device1");
      expect(devices[0].protocol).toBe("test");
    });
  });

  describe("getConfigSchema", () => {
    it("returns empty schema by default", () => {
      const schema = handler.getConfigSchema();
      expect(schema).toEqual({});
    });
  });

  describe("getTimeout", () => {
    it("returns default timeout", () => {
      const timeout = handler.getTimeout();
      expect(timeout).toBe(10000);
    });
  });
});
