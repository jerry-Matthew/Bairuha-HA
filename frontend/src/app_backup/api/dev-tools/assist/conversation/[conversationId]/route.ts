/**
 * Assist Conversation History API
 * GET /api/dev-tools/assist/conversation/[conversationId]
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getAssistService } from "@/lib/dev-tools/assist-service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (
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
    const conversation = await assistService.getConversation(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error: any) {
    console.error("Assist conversation history API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch conversation" },
      { status: 500 }
    );
  }
});
