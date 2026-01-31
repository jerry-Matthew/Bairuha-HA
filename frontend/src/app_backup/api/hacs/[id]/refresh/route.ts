/**
 * POST /api/hacs/:id/refresh
 * 
 * Refresh extension metadata from GitHub
 * 
 * Re-fetches GitHub metadata and updates the extension record
 */

import { NextRequest, NextResponse } from "next/server";
import { refreshExtension } from "@/components/hacs/server/hacs.service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const extensionId = params.id;
    const result = await refreshExtension(extensionId);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh extension", message: error.message },
      { status: 500 }
    );
  }
}

