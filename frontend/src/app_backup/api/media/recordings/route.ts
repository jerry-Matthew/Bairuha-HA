/**
 * GET /api/media/recordings
 * 
 * List all recordings for the authenticated user
 * 
 * Security features:
 * - Authentication required
 * - User-scoped queries (users can only see their own recordings)
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = authenticate(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const user = authResult.user;

    // Fetch user's recordings
    const recordings = await query(
      `SELECT id, name, type, size, url, source, recorded_at
       FROM recordings
       WHERE user_id = $1
       ORDER BY recorded_at DESC`,
      [user.userId]
    );

    return NextResponse.json(
      { recordings },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("List recordings error:", error);
    return NextResponse.json(
      { error: "Failed to load recordings" },
      { status: 500 }
    );
  }
}

