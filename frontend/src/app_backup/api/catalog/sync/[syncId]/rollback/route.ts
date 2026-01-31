/**
 * Catalog Sync Rollback API
 * 
 * POST /api/catalog/sync/[syncId]/rollback - Rollback a sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { rollbackSync } from '@/lib/catalog-sync/rollback-service';
import { query } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { syncId: string } }
) {
  try {
    const { syncId } = params;

    // Verify sync exists and can be rolled back
    const syncResult = await query<{
      id: string;
      status: string;
      completed_at: string | null;
    }>(
      `SELECT id, status, completed_at 
       FROM catalog_sync_history 
       WHERE id = $1`,
      [syncId]
    );

    if (syncResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Sync not found' },
        { status: 404 }
      );
    }

    const sync = syncResult.rows[0];

    // Only allow rollback of failed or completed syncs
    if (sync.status === 'running') {
      return NextResponse.json(
        { error: 'Cannot rollback a sync that is still running' },
        { status: 400 }
      );
    }

    // Perform rollback
    await rollbackSync(syncId);

    return NextResponse.json({
      success: true,
      message: `Sync ${syncId} rolled back successfully`,
    });
  } catch (error: any) {
    console.error('[Catalog Sync Rollback API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to rollback sync' },
      { status: 500 }
    );
  }
}
