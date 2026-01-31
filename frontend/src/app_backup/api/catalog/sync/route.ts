/**
 * Catalog Sync API
 * 
 * POST /api/catalog/sync - Trigger manual sync
 * GET /api/catalog/sync/status - Get sync status
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncCatalog, isSyncInProgress } from '@/lib/catalog-sync/sync-orchestrator';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Check if sync already in progress
    if (isSyncInProgress()) {
      return NextResponse.json(
        { error: 'Sync already in progress' },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { type = 'incremental', dryRun = false, force = false } = body;

    if (!['full', 'incremental', 'manual'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid sync type. Must be "full", "incremental", or "manual"' },
        { status: 400 }
      );
    }

    // Start sync asynchronously (don't wait for completion)
    syncCatalog({ type, dryRun, force }).catch(error => {
      console.error('[Catalog Sync API] Sync failed:', error);
    });

    // Return sync ID immediately
    const syncResult = await query<{ id: string }>(
      `SELECT id FROM catalog_sync_history 
       WHERE status = 'running' 
       ORDER BY started_at DESC 
       LIMIT 1`
    );

    if (syncResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Failed to start sync' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      syncId: syncResult.rows[0].id,
      status: 'started',
      message: 'Sync started successfully',
    });
  } catch (error: any) {
    console.error('[Catalog Sync API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start sync' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const syncId = searchParams.get('syncId');

    if (syncId) {
      // Get specific sync details
      const syncResult = await query<{
        id: string;
        sync_type: string;
        started_at: string;
        completed_at: string | null;
        status: string;
        total_integrations: number;
        new_integrations: number;
        updated_integrations: number;
        deleted_integrations: number;
        error_count: number;
        error_details: any;
        metadata: any;
      }>(
        `SELECT 
          id, sync_type, started_at, completed_at, status,
          total_integrations, new_integrations, updated_integrations,
          deleted_integrations, error_count, error_details, metadata
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

      // Get changes for this sync
      const changesResult = await query<{
        domain: string;
        change_type: string;
        previous_version_hash: string | null;
        new_version_hash: string | null;
        changed_fields: any;
        created_at: string;
      }>(
        `SELECT domain, change_type, previous_version_hash, new_version_hash, 
                changed_fields, created_at
         FROM catalog_sync_changes
         WHERE sync_id = $1
         ORDER BY created_at DESC`,
        [syncId]
      );

      return NextResponse.json({
        sync: {
          id: sync.id,
          type: sync.sync_type,
          startedAt: sync.started_at,
          completedAt: sync.completed_at,
          status: sync.status,
          total: sync.total_integrations,
          new: sync.new_integrations,
          updated: sync.updated_integrations,
          deleted: sync.deleted_integrations,
          errors: sync.error_count,
          errorDetails: sync.error_details || [],
          metadata: sync.metadata,
        },
        changes: changesResult.rows.map(row => ({
          domain: row.domain,
          changeType: row.change_type,
          previousHash: row.previous_version_hash,
          newHash: row.new_version_hash,
          changedFields: row.changed_fields || [],
          createdAt: row.created_at,
        })),
      });
    } else {
      // Get current sync status
      const currentSyncResult = await query<{
        id: string;
        sync_type: string;
        started_at: string;
        completed_at: string | null;
        status: string;
        total_integrations: number;
        new_integrations: number;
        updated_integrations: number;
        deleted_integrations: number;
        error_count: number;
      }>(
        `SELECT id, sync_type, started_at, completed_at, status,
                total_integrations, new_integrations, updated_integrations,
                deleted_integrations, error_count
         FROM catalog_sync_history
         WHERE status = 'running'
         ORDER BY started_at DESC
         LIMIT 1`
      );

      // Get last completed sync
      const lastSyncResult = await query<{
        id: string;
        sync_type: string;
        started_at: string;
        completed_at: string | null;
        status: string;
        total_integrations: number;
        new_integrations: number;
        updated_integrations: number;
        deleted_integrations: number;
        error_count: number;
      }>(
        `SELECT id, sync_type, started_at, completed_at, status,
                total_integrations, new_integrations, updated_integrations,
                deleted_integrations, error_count
         FROM catalog_sync_history
         WHERE status IN ('completed', 'failed')
         ORDER BY started_at DESC
         LIMIT 1`
      );

      return NextResponse.json({
        current: currentSyncResult.rows.length > 0 ? {
          syncId: currentSyncResult.rows[0].id,
          startedAt: currentSyncResult.rows[0].started_at,
          status: currentSyncResult.rows[0].status,
          type: currentSyncResult.rows[0].sync_type,
        } : null,
        lastSync: lastSyncResult.rows.length > 0 ? {
          syncId: lastSyncResult.rows[0].id,
          startedAt: lastSyncResult.rows[0].started_at,
          completedAt: lastSyncResult.rows[0].completed_at,
          status: lastSyncResult.rows[0].status,
          type: lastSyncResult.rows[0].sync_type,
          total: lastSyncResult.rows[0].total_integrations,
          new: lastSyncResult.rows[0].new_integrations,
          updated: lastSyncResult.rows[0].updated_integrations,
          deleted: lastSyncResult.rows[0].deleted_integrations,
          errors: lastSyncResult.rows[0].error_count,
        } : null,
        syncInProgress: isSyncInProgress(),
      });
    }
  } catch (error: any) {
    console.error('[Catalog Sync API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
