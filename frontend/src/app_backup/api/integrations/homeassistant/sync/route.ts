/**
 * Home Assistant Entity Sync API
 * 
 * POST /api/integrations/homeassistant/sync
 * 
 * Triggers a full entity synchronization from Home Assistant
 * Returns sync statistics (created, updated, errors)
 */

import { NextRequest, NextResponse } from "next/server";
import { syncEntitiesFromHA } from "@/lib/home-assistant/entity-sync";

export const dynamic = "force-dynamic";

/**
 * POST /api/integrations/homeassistant/sync
 * 
 * Triggers entity synchronization from Home Assistant
 * 
 * Response:
 * {
 *   success: boolean,
 *   created: number,
 *   updated: number,
 *   errors: Array<{ haEntityId: string, error: string }>,
 *   total: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check here
    // For now, allow unauthenticated access (should be protected in production)
    
    // Trigger sync
    const result = await syncEntitiesFromHA();
    
    // Return sync result
    return NextResponse.json(result, {
      status: result.success ? 200 : 207 // 207 Multi-Status if there are errors
    });
  } catch (error: any) {
    console.error("Home Assistant sync API error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Failed to sync entities from Home Assistant",
        created: 0,
        updated: 0,
        errors: [{ haEntityId: 'SYNC_ERROR', error: error.message || 'Unknown error' }],
        total: 0
      },
      { status: 500 }
    );
  }
}
