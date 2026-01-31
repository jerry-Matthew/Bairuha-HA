/**
 * GET /api/hacs/:id
 * 
 * Get single extension details
 */

import { NextRequest, NextResponse } from "next/server";
import { getExtensionDetails } from "@/components/hacs/server/hacs.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const extensionId = params.id;
    const details = await getExtensionDetails(extensionId);

    if (!details) {
      return NextResponse.json(
        { error: "Extension not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      extension: details,
    });
  } catch (error: any) {
    console.error(`Error fetching extension ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch extension", message: error.message },
      { status: 500 }
    );
  }
}

