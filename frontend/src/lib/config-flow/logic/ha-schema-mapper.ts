/**
 * Helper to map Home Assistant Voluptuous schema to internal schema
 */
export function mapHASchemaToInternal(haSchema: any[]): any {
    if (!haSchema || !Array.isArray(haSchema)) return undefined;

    const internalSchema: Record<string, any> = {};

    for (const field of haSchema) {
        // HA schema field structure: { name: "host", type: "string", ... } or just "host"
        const name = field.name || field;
        let type = "string";
        let options: any[] | undefined = field.options;
        let dynamicOptions: any | undefined = undefined;
        const label = field.description || field.name || name;

        // Handle Selectors (New in HA ~2020)
        if (field.selector) {
            if (field.selector.select) {
                type = "select";
                options = field.selector.select.options;
            } else if ("boolean" in field.selector) {
                type = "boolean";
            } else if ("number" in field.selector) {
                type = "number";
            } else if ("text" in field.selector) {
                type = "string";
                if (field.selector.text && field.selector.text.type === "password") {
                    type = "password";
                }
            } else if ("area" in field.selector) {
                type = "select";
                dynamicOptions = {
                    source: "api",
                    endpoint: "/api/registries/areas",
                    mapping: { label: "name", value: "area_id" }
                };
            } else if ("device" in field.selector) {
                type = "select";
                dynamicOptions = {
                    source: "api",
                    endpoint: "/api/devices",
                    mapping: { label: "name", value: "id" }
                };
            } else if ("entity" in field.selector) {
                type = "select";
                dynamicOptions = {
                    source: "api",
                    endpoint: "/api/registries/entities",
                    mapping: { label: "name", value: "entity_id" }
                };
            } else if ("theme" in field.selector) {
                type = "select";
                options = [{ label: "Default", value: "default" }];
            }
        }
        // Handle Legacy Types
        else {
            const haType = field.type || "string";
            if (haType === "select") {
                type = "select";
            } else if (haType === "integer" || haType === "float") {
                type = "number";
            } else if (haType === "boolean") {
                type = "boolean";
            }
        }

        internalSchema[name] = {
            type,
            label,
            required: field.required !== false && !field.optional,
            default: field.default,
            options,
            dynamicOptions,
            description: field.description
        };
    }
    return internalSchema;
}
