/**
 * DELETE /api/media/[id]
 * 
 * Delete a media file
 * 
 * Security features:
 * - Authentication required
 * - User-scoped deletion (users can only delete their own files)
 * - File system cleanup
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { query } from "@/lib/db";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const fileId = params.id;

    // Verify file belongs to user and get file path
    const [file] = await query(
      `SELECT id, file_path FROM media_files
       WHERE id = $1 AND user_id = $2`,
      [fileId, user.userId]
    );

    if (!file) {
      return NextResponse.json(
        { error: "File not found or access denied" },
        { status: 404 }
      );
    }

    // Delete file from filesystem
    const filePath = join(process.cwd(), "public", file.file_path);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    // Delete from database
    await query(
      `DELETE FROM media_files WHERE id = $1`,
      [fileId]
    );

    return NextResponse.json(
      { message: "File deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Delete media error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}

