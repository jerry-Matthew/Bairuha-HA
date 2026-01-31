/**
 * YAML Validation API
 * POST /api/dev-tools/yaml/validate
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getYAMLValidator } from "@/lib/dev-tools/yaml-validator";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { yaml: yamlContent, fileType } = body;

    if (!yamlContent || typeof yamlContent !== 'string') {
      return NextResponse.json(
        { error: "YAML content is required" },
        { status: 400 }
      );
    }

    const validator = getYAMLValidator();
    const result = await validator.validateYAML({
      yaml: yamlContent,
      fileType: fileType || 'custom',
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("YAML validation API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate YAML" },
      { status: 500 }
    );
  }
});
