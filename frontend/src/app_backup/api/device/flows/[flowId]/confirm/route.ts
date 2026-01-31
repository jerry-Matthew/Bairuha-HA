/**
 * Confirm Device Flow API
 * 
 * POST /api/device/flows/:flowId/confirm
 * Finalizes device registration
 */

import { NextRequest, NextResponse } from "next/server";
import { confirmFlow } from "@/components/addDevice/server/deviceFlow.service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { flowId: string } }
) {
  try {
    const { flowId } = params;
    const body = await request.json().catch(() => ({}));
    const { deviceName, deviceType, model, manufacturer } = body;
    
    const response = await confirmFlow(flowId, {
      deviceName,
      deviceType,
      model,
      manufacturer,
    });
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Confirm flow error:", error);
    
    // Check if it's a duplicate device error
    const isDuplicateError = error.message && (
      error.message.includes("already exists") ||
      error.message.includes("already been added") ||
      error.message.includes("duplicate")
    );
    
    // Return 409 Conflict for duplicate errors (standard HTTP status for conflicts)
    const statusCode = isDuplicateError ? 409 : 500;
    
    return NextResponse.json(
      { 
        error: error.message || "Failed to confirm flow",
        isDuplicate: isDuplicateError,
      },
      { status: statusCode }
    );
  }
}

