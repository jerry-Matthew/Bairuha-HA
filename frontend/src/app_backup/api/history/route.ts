/**
 * History API
 * 
 * Query endpoints for retrieving entity state history
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface StateHistoryRecord {
  id: string;
  entity_id: string;
  state: string | null;
  attributes: Record<string, any>;
  last_changed: string | null;
  last_updated: string | null;
  recorded_at: string;
}

/**
 * GET /api/history
 * 
 * Query Parameters:
 * - entity_id (string, optional) - Filter by entity ID
 * - start_time (ISO 8601 string, optional) - Start of time range
 * - end_time (ISO 8601 string, optional) - End of time range
 * - limit (number, optional, default: 1000, max: 10000) - Maximum records to return
 * - offset (number, optional, default: 0) - Pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const entityId = searchParams.get("entity_id") || null;
    const startTime = searchParams.get("start_time") || null;
    const endTime = searchParams.get("end_time") || null;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "1000", 10),
      10000 // Maximum limit
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Validate ISO 8601 dates if provided
    if (startTime && isNaN(Date.parse(startTime))) {
      return NextResponse.json(
        { error: "Invalid start_time format. Expected ISO 8601 string." },
        { status: 400 }
      );
    }

    if (endTime && isNaN(Date.parse(endTime))) {
      return NextResponse.json(
        { error: "Invalid end_time format. Expected ISO 8601 string." },
        { status: 400 }
      );
    }

    // Build WHERE clause conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (entityId) {
      conditions.push(`entity_id = $${paramIndex}`);
      params.push(entityId);
      paramIndex++;
    }

    if (startTime) {
      conditions.push(`recorded_at >= $${paramIndex}`);
      params.push(startTime);
      paramIndex++;
    }

    if (endTime) {
      conditions.push(`recorded_at <= $${paramIndex}`);
      params.push(endTime);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count for pagination (using same WHERE clause)
    const countSql = `SELECT COUNT(*) as total FROM state_history ${whereClause}`;
    const countResult = await query<{ total: string }>(countSql, params);
    const total = parseInt(countResult[0]?.total || "0", 10);

    // Build main query with ordering, limit, and offset
    const sql = `
      SELECT 
        id,
        entity_id,
        state,
        attributes,
        last_changed,
        last_updated,
        recorded_at
      FROM state_history
      ${whereClause}
      ORDER BY recorded_at DESC, last_changed DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    // Execute query
    const rows = await query<StateHistoryRecord>(sql, params);

    // Parse JSONB attributes
    const data = rows.map((row) => ({
      id: row.id,
      entity_id: row.entity_id,
      state: row.state,
      attributes: typeof row.attributes === "string" 
        ? JSON.parse(row.attributes) 
        : row.attributes,
      last_changed: row.last_changed,
      last_updated: row.last_updated,
      recorded_at: row.recorded_at,
    }));

    return NextResponse.json({
      data,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + data.length < total,
      },
    });
  } catch (error: any) {
    console.error("History API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch history" },
      { status: 500 }
    );
  }
}
