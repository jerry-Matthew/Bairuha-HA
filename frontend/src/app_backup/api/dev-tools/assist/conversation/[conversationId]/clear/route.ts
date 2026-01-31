/**
 * Clear Conversation API
 * POST /api/dev-tools/assist/conversation/[conversationId]/clear
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getAssistService } from "@/lib/dev-tools/assist-service";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) => {
  try {
    const { conversationId } = params;

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    const assistService = getAssistService();
    const result = await assistService.clearConversation(conversationId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Clear conversation API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to clear conversation" },
      { status: 500 }
    );
  }
});
