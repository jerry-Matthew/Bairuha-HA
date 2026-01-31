/**
 * DEV-ONLY Device Registration API
 * 
 * ⚠️ WARNING: This endpoint is ONLY available in development mode (NODE_ENV=development)
 * 
 * This is a temporary development tool to bootstrap devices for testing.
 * It allows creating devices via a simplified API so that entities are auto-generated
 * and visible in the UI, without requiring full integration setup or config flows.
 * 
 * This endpoint MUST be removed before production deployment.
 * 
 * Endpoint: POST /api/devices/dev-register
 */

import { NextRequest, NextResponse } from "next/server";
import { registerDevice } from "@/components/globalAdd/server/device.registry";
import { getEntitiesByDevice } from "@/components/globalAdd/server/entity.registry";
import { getIntegrationByDomain, saveIntegration } from "@/components/globalAdd/server/integration.registry";
import { getAreaByName, createArea } from "@/components/globalAdd/server/area.registry";

export const dynamic = "force-dynamic";

/**
 * Check if we're in development mode
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Map device_type to model name for entity inference
 * The entity creation logic infers device type from model name keywords
 */
function getModelForDeviceType(deviceType: string): string {
  const mapping: Record<string, string> = {
    smart_light: "Smart Light Device",
    temperature_sensor: "Temperature Sensor Device",
    motion_sensor: "Motion Sensor Device",
    smart_switch: "Smart Switch Device",
    thermostat: "Thermostat Device",
    door_lock: "Door Lock Device",
    garage_door: "Garage Door Device",
  };
  
  return mapping[deviceType] || "Generic Device";
}

/**
 * Ensure integration exists, create if needed (dev only)
 */
async function ensureIntegration(integrationDomain: string): Promise<void> {
  const existing = await getIntegrationByDomain(integrationDomain);
  
  if (!existing) {
    // Create a minimal integration for dev purposes
    await saveIntegration({
      domain: integrationDomain,
      name: integrationDomain.charAt(0).toUpperCase() + integrationDomain.slice(1).replace(/_/g, " "),
      status: "setup",
    });
  }
}

/**
 * Resolve area name to UUID (get or create)
 * DEV-ONLY: This function resolves area names to UUIDs for dev-register endpoint
 * In production, area IDs must be provided directly
 */
async function resolveAreaByName(areaName: string): Promise<string | null> {
  if (!areaName) {
    return null;
  }

  // Convert slug to readable name (e.g., "living_room" -> "Living Room")
  const displayName = areaName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Try to find existing area by:
  // 1. The exact input (slug format)
  // 2. The converted display name (if different)
  let existing = await getAreaByName(areaName);
  if (!existing && displayName !== areaName) {
    existing = await getAreaByName(displayName);
  }

  if (existing) {
    return existing.id;
  }

  // Create new area with the display name (more human-readable)
  const newArea = await createArea({
    name: displayName,
  });

  return newArea.id;
}

/**
 * POST /api/devices/dev-register
 * 
 * Request body:
 * {
 *   "name": "Living Room Light",
 *   "device_type": "smart_light",
 *   "integration": "local_dev",
 *   "area": "living_room" (optional)
 * }
 * 
 * Response:
 * {
 *   "device": { ... },
 *   "entities": [ ... ]
 * }
 */
export async function POST(request: NextRequest) {
  // CRITICAL: Only allow in development
  if (!isDevelopment()) {
    return NextResponse.json(
      { 
        error: "This endpoint is only available in development mode",
        message: "Device registration via this endpoint is disabled in production"
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.device_type) {
      return NextResponse.json(
        { error: "Missing required fields: 'name' and 'device_type' are required" },
        { status: 400 }
      );
    }

    const { name, device_type, integration = "local_dev", area } = body;

    // Ensure integration exists (create if needed for dev)
    await ensureIntegration(integration);

    // Get integration details
    const integrationData = await getIntegrationByDomain(integration);
    if (!integrationData) {
      return NextResponse.json(
        { error: `Integration '${integration}' not found and could not be created` },
        { status: 500 }
      );
    }

    // Resolve area name to UUID (dev-only: area is a name/slug, not UUID)
    const areaId = await resolveAreaByName(area);

    // Map device_type to model for entity inference
    const model = getModelForDeviceType(device_type);

    // Register device via device registry (this will auto-create entities)
    // areaId is now a UUID or null - never a name
    const device = await registerDevice({
      name,
      integrationId: integration,
      integrationName: integrationData.name,
      model,
      areaId: areaId || undefined,
    });

    // Fetch created entities
    const entities = await getEntitiesByDevice(device.id);

    // Return device + entities
    return NextResponse.json({
      device,
      entities,
      message: `Device '${name}' registered successfully with ${entities.length} entity/entities`
    }, { status: 201 });

  } catch (error: any) {
    console.error("Dev device registration error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to register device",
        details: isDevelopment() ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/devices/dev-register
 * Returns documentation about this endpoint
 */
export async function GET() {
  if (!isDevelopment()) {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    endpoint: "/api/devices/dev-register",
    method: "POST",
    description: "DEV-ONLY endpoint for device registration and entity auto-creation",
    warning: "This endpoint is only available when NODE_ENV=development",
    requestBody: {
      name: "string (required) - Device name",
      device_type: "string (required) - Device type (e.g., 'smart_light', 'temperature_sensor', 'motion_sensor', 'smart_switch', 'thermostat', 'door_lock', 'garage_door')",
      integration: "string (optional) - Integration domain (default: 'local_dev')",
      area: "string (optional) - Area name/slug (e.g., 'living_room'). Will be resolved to UUID or created if it doesn't exist"
    },
    response: {
      device: "Created device object",
      entities: "Array of auto-created entities",
      message: "Success message"
    },
    // example: {
    //   request: {
    //     name: "Living Room Light",
    //     device_type: "smart_light",
    //     integration: "local_dev",
    //     area: "living_room"
    //   },
    //   response: {
    //     device: { id: "...", name: "Living Room Light", ... },
    //     entities: [{ id: "...", entityId: "light.living_room_power", ... }]
    //   }
    // }
  });
}

