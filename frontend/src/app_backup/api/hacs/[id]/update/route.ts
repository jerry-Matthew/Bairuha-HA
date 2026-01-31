/**
 * POST /api/hacs/:id/update
 * 
 * Update an installed HACS extension
 * 
 * MOCKED: Simulates update without real shell execution
 */

import { NextRequest, NextResponse } from "next/server";
import { updateExtension } from "@/components/hacs/server/hacs.service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const extensionId = params.id;
    const result = await updateExtension(extensionId);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Failed to update extension", message: error.message },
      { status: 500 }
    );
  }
}

