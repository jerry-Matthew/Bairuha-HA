/**
 * POST /api/hacs/:id/install
 * 
 * Install a HACS extension
 * 
 * MOCKED: Simulates installation without real shell execution
 * 
 * @route POST /api/hacs/:id/install
 * @returns { success: boolean, extension: HacsExtension, message?: string, restartRequired: boolean, agentCommand?: HacsAgentCommand }
 */

import { NextRequest, NextResponse } from "next/server";
import { installExtension } from "@/components/hacs/server/hacs.service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const extensionId = params.id;
    const result = await installExtension(extensionId);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Install error:", error);
    return NextResponse.json(
      { error: "Failed to install extension", message: error.message },
      { status: 500 }
    );
  }
}

