/**
 * Select Brand API
 * 
 * GET /api/integrations/select-brand
 * 
 * Returns all supported integrations (from catalog) merged with
 * configuration status (from registry).
 * 
 * This endpoint implements the Home Assistant-style catalog + registry merge.
 */

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface SelectBrandResponse {
  domain: string;
  name: string;
  icon?: string;
  brandImageUrl?: string;
  isCloud: boolean;
  isConfigured: boolean;
}

export async function GET(request: NextRequest) {
  try {
    // Query integration_catalog with LEFT JOIN to integrations registry
    // This returns ALL supported integrations, with configuration status
    const rows = await query<any>(
      `SELECT
        c.domain,
        c.name,
        c.description,
        c.icon,
        c.brand_image_url AS "brandImageUrl",
        c.is_cloud AS "isCloud",
        c.supports_devices,
        r.id IS NOT NULL AS "isConfigured",
        r.status
      FROM integration_catalog c
      LEFT JOIN integrations r
        ON c.domain = r.domain
      ORDER BY c.name ASC`
    );

    // Map to API response format
    const integrations: SelectBrandResponse[] = rows.map((row: any) => ({
      domain: row.domain,
      name: row.name,
      icon: row.icon || undefined,
      brandImageUrl: row.brandImageUrl || undefined,
      isCloud: row.isCloud || false,
      isConfigured: row.isConfigured || false,
    }));

    return NextResponse.json(integrations);
  } catch (error: any) {
    console.error("Select brand API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}

