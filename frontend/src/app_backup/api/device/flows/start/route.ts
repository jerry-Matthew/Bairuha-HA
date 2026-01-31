/**
 * Start Device Flow API
 * 
 * POST /api/device/flows/start
 * Starts a new device setup flow
 */

import { NextRequest, NextResponse } from "next/server";
import { startFlow } from "@/components/addDevice/server/deviceFlow.service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const response = await startFlow();
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Start flow error:", error);
    console.error("Error stack:", error.stack);
    
    // Provide more detailed error message
    const errorMessage = error.message || "Failed to start flow";
    const isDevelopment = process.env.NODE_ENV === "development";
    
    return NextResponse.json(
      { 
        error: errorMessage,
        ...(isDevelopment && error.stack && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}

