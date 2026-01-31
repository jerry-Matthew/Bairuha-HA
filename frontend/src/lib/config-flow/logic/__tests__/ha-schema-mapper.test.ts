import { mapHASchemaToInternal } from "../ha-schema-mapper";

describe("mapHASchemaToInternal", () => {
    it("should return undefined for invalid input", () => {
        expect(mapHASchemaToInternal(null as any)).toBeUndefined();
        expect(mapHASchemaToInternal(undefined as any)).toBeUndefined();
        expect(mapHASchemaToInternal({} as any)).toBeUndefined();
    });

    it("should map basic fields correctly", () => {
        const haSchema = [
            { name: "host", type: "string", required: true },
            { name: "port", type: "integer", default: 80 },
            { name: "ssl", type: "boolean", default: false }
        ];

        const result = mapHASchemaToInternal(haSchema);

        expect(result).toBeDefined();
        expect(result.host.type).toBe("string");
        expect(result.host.required).toBe(true);

        expect(result.port.type).toBe("number");
        expect(result.port.default).toBe(80);

        expect(result.ssl.type).toBe("boolean");
        expect(result.ssl.default).toBe(false);
    });

    it("should map Area Selector to dynamic select", () => {
        const haSchema = [
            {
                name: "location",
                selector: { area: {} }
            }
        ];

        const result = mapHASchemaToInternal(haSchema);

        expect(result.location.type).toBe("select");
        expect(result.location.dynamicOptions).toEqual({
            source: "api",
            endpoint: "/api/registries/areas",
            mapping: { label: "name", value: "area_id" }
        });
    });

    it("should map Device Selector to dynamic select", () => {
        const haSchema = [
            {
                name: "target_device",
                selector: { device: {} }
            }
        ];

        const result = mapHASchemaToInternal(haSchema);

        expect(result.target_device.type).toBe("select");
        expect(result.target_device.dynamicOptions).toEqual({
            source: "api",
            endpoint: "/api/devices",
            mapping: { label: "name", value: "id" }
        });
    });

    it("should map Entity Selector to dynamic select", () => {
        const haSchema = [
            {
                name: "sensor",
                selector: { entity: {} }
            }
        ];

        const result = mapHASchemaToInternal(haSchema);

        expect(result.sensor.type).toBe("select");
        expect(result.sensor.dynamicOptions).toEqual({
            source: "api",
            endpoint: "/api/registries/entities",
            mapping: { label: "name", value: "entity_id" }
        });
    });

    it("should map Select Selector to static options", () => {
        const haSchema = [
            {
                name: "mode",
                selector: {
                    select: {
                        options: [
                            { label: "Auto", value: "auto" },
                            { label: "Manual", value: "manual" }
                        ]
                    }
                }
            }
        ];

        const result = mapHASchemaToInternal(haSchema);

        expect(result.mode.type).toBe("select");
        expect(result.mode.options).toHaveLength(2);
        expect(result.mode.options[0].value).toBe("auto");
    });
});
