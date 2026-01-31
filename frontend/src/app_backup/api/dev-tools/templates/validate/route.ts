/**
 * Template Validation API
 * POST /api/dev-tools/templates/validate
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getTemplateTester } from "@/lib/dev-tools/template-tester";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { template } = body;

    if (!template) {
      return NextResponse.json(
        { error: "template is required" },
        { status: 400 }
      );
    }

    const tester = getTemplateTester();
    const result = await tester.validateTemplate(template);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Template validation API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate template" },
      { status: 500 }
    );
  }
});
