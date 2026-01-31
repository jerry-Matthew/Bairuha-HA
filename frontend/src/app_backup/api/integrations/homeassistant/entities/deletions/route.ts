/**
 * API endpoint for entity deletion management
 * 
 * GET /api/integrations/homeassistant/entities/deletions - List deleted entities
 * POST /api/integrations/homeassistant/entities/deletions/cleanup - Clean up deleted entities
 */

import { NextRequest, NextResponse } from "next/server";
import { getHAEntities } from "@/components/globalAdd/server/entity.registry";
import { haRestClient } from "@/lib/home-assistant/rest-client";
import { entityDeletionDetector } from "@/lib/home-assistant/entity-deletion-detector";
import { query } from "@/lib/db";

/**
 * GET /api/integrations/homeassistant/entities/deletions
 * List entities that were deleted from Home Assistant
 */
export async function GET(request: NextRequest) {
  try {
    // Get all HA and hybrid entities from Bairuha
    const bairuhaHAEntities = await getHAEntities();

    // Fetch current HA entities
    const haStates = await haRestClient.getStates();
    const currentHAEntityIds = new Set(haStates.map(s => s.entity_id));

    // Find deleted entities
    const deletedEntities = bairuhaHAEntities.filter(
      entity => entity.haEntityId && !currentHAEntityIds.has(entity.haEntityId)
    );

    // Also check for entities marked as deleted
    const markedDeleted = await query<{
      id: string;
      entity_id: string;
      ha_entity_id: string;
      name: string;
      state: string;
    }>(
      `SELECT id, entity_id, ha_entity_id, name, state
       FROM entities
       WHERE state = 'unavailable'
       AND attributes->>'deleted_from_ha' = 'true'`
    );

    return NextResponse.json({
      success: true,
      deleted: deletedEntities.map(e => ({
        id: e.id,
        entityId: e.entityId,
        haEntityId: e.haEntityId,
        name: e.name,
        source: e.source
      })),
      markedDeleted: markedDeleted.map(e => ({
        id: e.id,
        entityId: e.entity_id,
        haEntityId: e.ha_entity_id,
        name: e.name,
        state: e.state
      })),
      count: deletedEntities.length + markedDeleted.length
    });
  } catch (error) {
    console.error("Error listing deletions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/homeassistant/entities/deletions/cleanup
 * Clean up deleted entities
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strategy = 'soft' } = body;

    // Detect and handle deletions
    const deletionResult = await entityDeletionDetector.detectDeletedEntities({
      strategy: strategy as 'soft' | 'hard' | 'preserve',
      preserveHistory: true,
      notifyUser: false
    });

    // If hard delete, also clean up marked entities
    if (strategy === 'hard') {
      const cleaned = await entityDeletionDetector.cleanupDeletedEntities();
      deletionResult.deleted += cleaned;
    }

    return NextResponse.json({
      success: true,
      result: deletionResult,
      message: `Processed ${deletionResult.deleted + deletionResult.markedUnavailable + deletionResult.convertedToInternal} deleted entities`
    });
  } catch (error) {
    console.error("Error cleaning up deletions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
