/**
 * Catalog Sync History API
 * 
 * GET /api/catalog/sync/history - Get sync history
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status'); // Filter by status

    let queryStr = `
      SELECT 
        id, sync_type, started_at, completed_at, status,
        total_integrations, new_integrations, updated_integrations,
        deleted_integrations, error_count, error_details, metadata
      FROM catalog_sync_history
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    if (conditions.length > 0) {
      queryStr += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryStr += ` ORDER BY started_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM catalog_sync_history';
    const countParams: any[] = [];
    const countConditions: string[] = [];

    if (status) {
      countConditions.push(`status = $${countParams.length + 1}`);
      countParams.push(status);
    }

    if (countConditions.length > 0) {
      countQuery += ` WHERE ${countConditions.join(' AND ')}`;
    }

    const [syncsResult, countResult] = await Promise.all([
      query<{
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
      }>(queryStr, params),
      query<{ total: string }>(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].total);

    return NextResponse.json({
      syncs: syncsResult.rows.map(row => ({
        id: row.id,
        type: row.sync_type,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        status: row.status,
        total: row.total_integrations,
        new: row.new_integrations,
        updated: row.updated_integrations,
        deleted: row.deleted_integrations,
        errors: row.error_count,
        errorDetails: row.error_details || [],
        metadata: row.metadata,
      })),
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[Catalog Sync History API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get sync history' },
      { status: 500 }
    );
  }
}
