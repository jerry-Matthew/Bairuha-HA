/**
 * GET /api/media/list
 * 
 * List all media files for the authenticated user
 * 
 * Security features:
 * - Authentication required
 * - User-scoped queries (users can only see their own files)
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

    // Fetch user's media files
    const files = await query(
      `SELECT id, name, type, size, url, uploaded_at
       FROM media_files
       WHERE user_id = $1
       ORDER BY uploaded_at DESC`,
      [user.userId]
    );

    return NextResponse.json(
      { files },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("List media error:", error);
    return NextResponse.json(
      { error: "Failed to load media files" },
      { status: 500 }
    );
  }
}

