/**
 * YAML Configuration Reload API
 * POST /api/dev-tools/yaml/reload
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getYAMLValidator } from "@/lib/dev-tools/yaml-validator";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json(
        { error: "Domain is required (automation, script, scene, group, or all)" },
        { status: 400 }
      );
    }

    const validator = getYAMLValidator();
    const result = await validator.reloadConfiguration(domain);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("YAML reload API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reload configuration" },
      { status: 500 }
    );
  }
});
