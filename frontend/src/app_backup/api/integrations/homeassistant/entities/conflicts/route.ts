/**
 * API endpoint for entity conflict management
 * 
 * GET /api/integrations/homeassistant/entities/conflicts - List all conflicts
 * POST /api/integrations/homeassistant/entities/conflicts/resolve - Resolve specific conflict
 * POST /api/integrations/homeassistant/entities/conflicts/resolve-all - Auto-resolve all conflicts
 */

import { NextRequest, NextResponse } from "next/server";
import { getHAEntities, getInternalEntities } from "@/components/globalAdd/server/entity.registry";
import { haRestClient } from "@/lib/home-assistant/rest-client";
import { entityConflictResolver } from "@/lib/home-assistant/entity-conflict-resolution";
import { hybridEntityManager } from "@/lib/home-assistant/hybrid-entity-manager";

/**
 * GET /api/integrations/homeassistant/entities/conflicts
 * List all conflicts between HA and Bairuha entities
 */
export async function GET(request: NextRequest) {
  try {
    const conflicts: Array<{
      type: string;
      haEntityId: string;
      bairuhaEntityId: string;
      message: string;
    }> = [];

    // Get all HA entities
    const haStates = await haRestClient.getStates();
    const haEntityIds = new Set(haStates.map(s => s.entity_id));

    // Get all Bairuha HA and hybrid entities
    const bairuhaHAEntities = await getHAEntities();

    // Check for conflicts
    for (const haState of haStates) {
      const bairuhaEntity = bairuhaHAEntities.find(e => e.haEntityId === haState.entity_id);
      
      if (bairuhaEntity) {
        const conflict = entityConflictResolver.detectConflict(haState, bairuhaEntity);
        if (conflict) {
          conflicts.push({
            type: conflict.type,
            haEntityId: haState.entity_id,
            bairuhaEntityId: bairuhaEntity.entityId,
            message: `Conflict detected: ${conflict.type}`
          });
        }
      }
    }

    // Check for potential hybrid matches
    const internalEntities = await getInternalEntities();
    for (const haState of haStates) {
      for (const internalEntity of internalEntities) {
        if (hybridEntityManager.matchesHAEntity(internalEntity, haState)) {
          conflicts.push({
            type: 'internal_matches_ha',
            haEntityId: haState.entity_id,
            bairuhaEntityId: internalEntity.entityId,
            message: `Internal entity matches HA entity - can be merged to hybrid`
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      conflicts,
      count: conflicts.length
    });
  } catch (error) {
    console.error("Error listing conflicts:", error);
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
 * POST /api/integrations/homeassistant/entities/conflicts/resolve
 * Resolve a specific conflict
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { haEntityId, bairuhaEntityId, action } = body;

    if (!haEntityId || !bairuhaEntityId) {
      return NextResponse.json(
        { success: false, error: "haEntityId and bairuhaEntityId are required" },
        { status: 400 }
      );
    }

    // Get HA state
    const haStates = await haRestClient.getStates();
    const haState = haStates.find(s => s.entity_id === haEntityId);
    if (!haState) {
      return NextResponse.json(
        { success: false, error: `HA entity not found: ${haEntityId}` },
        { status: 404 }
      );
    }

    // Get Bairuha entity
    const bairuhaHAEntities = await getHAEntities();
    const bairuhaEntity = bairuhaHAEntities.find(
      e => e.entityId === bairuhaEntityId || e.haEntityId === haEntityId
    );

    if (!bairuhaEntity) {
      // Check internal entities
      const internalEntities = await getInternalEntities();
      const internalEntity = internalEntities.find(e => e.entityId === bairuhaEntityId);
      
      if (internalEntity && action === 'merge') {
        // Merge to hybrid
        const merged = await hybridEntityManager.mergeInternalWithHA(internalEntity, haState);
        return NextResponse.json({
          success: true,
          message: "Conflict resolved: merged to hybrid entity",
          entity: merged
        });
      }

      return NextResponse.json(
        { success: false, error: `Bairuha entity not found: ${bairuhaEntityId}` },
        { status: 404 }
      );
    }

    // Resolve conflict
    const deviceId = bairuhaEntity.deviceId;
    const resolution = await entityConflictResolver.resolveEntityConflict(
      haState,
      bairuhaEntity,
      deviceId
    );

    if (resolution.action === 'error') {
      return NextResponse.json(
        { success: false, error: resolution.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: resolution.message,
      action: resolution.action,
      entity: resolution.entity
    });
  } catch (error) {
    console.error("Error resolving conflict:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
