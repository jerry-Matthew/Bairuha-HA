/**
 * Flow Definition Versions API
 * 
 * Get all versions of flow definitions for a domain
 */

import { NextRequest, NextResponse } from "next/server";
import { getFlowDefinitionVersions } from "@/lib/config-flow/flow-definition.registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/flow-definitions/by-domain/[domain]/versions
 * Get all versions of flow definitions for a domain
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { domain: string } }
) {
  try {
    const versions = await getFlowDefinitionVersions(params.domain);

    return NextResponse.json({
      domain: params.domain,
      versions: versions.map(v => ({
        id: v.id,
        version: v.version,
        is_active: v.is_active,
        is_default: v.is_default,
        description: v.description,
        created_at: v.created_at,
        updated_at: v.updated_at,
      })),
    });
  } catch (error: any) {
    console.error("Flow definitions versions API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch flow definition versions" },
      { status: 500 }
    );
  }
}
