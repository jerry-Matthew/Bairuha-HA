/**
 * Dynamic Options API
 * 
 * Resolves dynamic options for select/multiselect fields
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveOptions } from "@/lib/config-flow/dynamic-options-resolver";
import { getConfigSchema } from "@/components/addDevice/server/integration-config-schemas";

/**
 * GET /api/config/dynamic-options/[integrationId]/[fieldName]
 * Get dynamic options for a field
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { integrationId: string; fieldName: string } }
) {
  try {
    const { integrationId, fieldName } = params;
    
    // Get query parameters for context
    const { searchParams } = new URL(request.url);
    const contextParams: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      contextParams[key] = value;
    });
    
    // Get schema
    const schema = getConfigSchema(integrationId);
    const fieldSchema = schema[fieldName];
    
    if (!fieldSchema) {
      return NextResponse.json(
        { error: `Field ${fieldName} not found in schema` },
        { status: 404 }
      );
    }
    
    // Resolve options
    const options = await resolveOptions(fieldSchema, {
      integrationId,
      fieldName,
      formValues: contextParams,
    });
    
    return NextResponse.json({
      success: true,
      options,
    });
  } catch (error: any) {
    console.error("Dynamic options error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resolve dynamic options" },
      { status: 500 }
    );
  }
}
