/**
 * Flow Definitions by Domain API
 * 
 * Get and update flow definitions by integration domain
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getFlowDefinition,
  getActiveFlowDefinition,
  createFlowDefinition,
} from "@/lib/config-flow/flow-definition.registry";
import type { CreateFlowDefinitionInput } from "@/lib/config-flow/flow-definition.types";

export const dynamic = "force-dynamic";

/**
 * GET /api/flow-definitions/by-domain/[domain]
 * Get active flow definition for a domain
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { domain: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const version = searchParams.get("version")
      ? parseInt(searchParams.get("version")!, 10)
      : undefined;

    const definition = await getFlowDefinition(params.domain, version);
    
    if (!definition) {
      return NextResponse.json(
        { error: "Flow definition not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ definition });
  } catch (error: any) {
    console.error("Flow definitions API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch flow definition" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/flow-definitions/by-domain/[domain]
 * Update active flow definition or create new version
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { domain: string } }
) {
  try {
    const body = await request.json();
    
    // Check if active definition exists
    const existing = await getActiveFlowDefinition(params.domain);
    
    if (existing) {
      // Update existing (creates new version)
      const input: CreateFlowDefinitionInput = {
        integration_domain: params.domain,
        flow_type: body.flow_type || existing.flow_type,
        definition: body.definition || existing.definition,
        handler_class: body.handler_class !== undefined ? body.handler_class : existing.handler_class || undefined,
        handler_config: body.handler_config || existing.handler_config || undefined,
        description: body.description || existing.description || undefined,
        is_active: body.is_active !== undefined ? body.is_active : true,
        is_default: body.is_default !== undefined ? body.is_default : existing.is_default,
        created_by: body.created_by || "system",
      };

      const definition = await createFlowDefinition(input);
      return NextResponse.json({ definition });
    } else {
      // Create new
      const input: CreateFlowDefinitionInput = {
        integration_domain: params.domain,
        flow_type: body.flow_type,
        definition: body.definition,
        handler_class: body.handler_class,
        handler_config: body.handler_config,
        description: body.description,
        is_active: body.is_active !== undefined ? body.is_active : true,
        is_default: body.is_default || false,
        created_by: body.created_by || "system",
      };

      const definition = await createFlowDefinition(input);
      return NextResponse.json({ definition }, { status: 201 });
    }
  } catch (error: any) {
    console.error("Flow definitions API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update flow definition" },
      { status: 500 }
    );
  }
}
