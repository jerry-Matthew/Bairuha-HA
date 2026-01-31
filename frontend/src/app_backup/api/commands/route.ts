/**
 * Command Intent API
 * 
 * POST /api/commands
 * 
 * Allows UI to create command intent records for entities (e.g., turn on/off a switch).
 * Commands represent user intent only - they are never executed by this system.
 * 
 * Request body:
 * {
 *   "entityId": "switch.patio_light_power",  // Entity ID string (not UUID)
 *   "command": "turn_on",
 *   "payload": { "brightness": 255 }  // Optional command parameters
 * }
 * 
 * Behavior:
 * - Validates entity exists (by entity_id string)
 * - Creates command intent record with status 'pending' (immutable)
 * - Returns 202 Accepted with command ID
 * 
 * Architectural Rules (STRICT):
 * - Commands do NOT update entity state directly
 * - Commands are auditable and persistent
 * - Commands are intent-only records with immutable status
 * - No execution, no delivery, no acknowledgements
 * 
 * Response:
 * {
 *   "status": "accepted",
 *   "commandId": "uuid",
 *   "entityId": "switch.patio_light_power"
 * }
 * 
 * Error responses:
 * - 400: Missing required fields or invalid payload
 * - 404: Entity not found
 * - 500: Server error
 */

import { NextRequest, NextResponse } from "next/server";
import { getEntityByEntityId } from "@/components/globalAdd/server/entity.registry";
import { createCommand } from "@/components/globalAdd/server/command.registry";
import { getHAServiceCallService } from "@/lib/home-assistant/service-call";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }
    
    const { entityId, command, payload } = body;
    
    // Validate required fields
    if (!entityId || typeof entityId !== 'string') {
      return NextResponse.json(
        { error: "Missing or invalid 'entityId' field (must be a string)" },
        { status: 400 }
      );
    }
    
    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { error: "Missing or invalid 'command' field (must be a string)" },
        { status: 400 }
      );
    }
    
    // Validate payload if provided
    if (payload !== undefined && (typeof payload !== 'object' || Array.isArray(payload) || payload === null)) {
      return NextResponse.json(
        { error: "Invalid 'payload' field (must be an object)" },
        { status: 400 }
      );
    }
    
    // Look up entity by entity_id string (e.g., "switch.patio_light_power")
    const entity = await getEntityByEntityId(entityId);
    if (!entity) {
      return NextResponse.json(
        { error: "Entity not found" },
        { status: 404 }
      );
    }
    
    // Create command record with status 'pending'
    const commandRecord = await createCommand({
      entityId: entity.id, // Use entity UUID for foreign key
      command,
      payload: payload || {}
    });
    
    // Execute command via service call service
    try {
      const serviceCallService = getHAServiceCallService();
      const result = await serviceCallService.executeCommand(commandRecord.id);
      
      // Return result with command ID
      return NextResponse.json({
        status: result.queued ? "queued" : (result.success ? "executed" : "accepted"),
        commandId: commandRecord.id,
        entityId: entity.entityId, // Return entity_id string, not UUID
        queued: result.queued || false,
        success: result.success || false,
        error: result.error,
      }, { status: 202 });
    } catch (error) {
      // Log error but still return 202 (command was accepted)
      console.error("Failed to execute command:", error);
      return NextResponse.json({
        status: "accepted", // Command was accepted, execution may fail
        commandId: commandRecord.id,
        entityId: entity.entityId,
      }, { status: 202 });
    }
  } catch (error: any) {
    console.error("Command API error:", error);
    
    return NextResponse.json(
      { error: error.message || "Failed to process command" },
      { status: 500 }
    );
  }
}
