/**
 * Assist Conversation API
 * POST /api/dev-tools/assist/conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getAssistService } from "@/lib/dev-tools/assist-service";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { message, language, conversationId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const assistService = getAssistService();
    const result = await assistService.processMessage({
      message,
      language: language || 'en',
      conversationId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Assist conversation API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process conversation" },
      { status: 500 }
    );
  }
});
