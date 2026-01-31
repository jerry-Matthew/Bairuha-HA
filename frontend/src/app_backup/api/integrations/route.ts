
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const q = searchParams.get("q") || "";
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Base SQL query
        let sql = `
      SELECT
        c.domain,
        c.name,
        c.description,
        c.icon,
        c.brand_image_url as "brandImageUrl",
        c.is_cloud AS "isCloud",
        c.supports_devices,
        COALESCE(ce.id IS NOT NULL, r.id IS NOT NULL, false) AS "isConfigured"
      FROM integration_catalog c
      LEFT JOIN integrations r ON c.domain = r.domain
      LEFT JOIN config_entries ce ON c.domain = ce.integration_domain AND ce.status = 'loaded'
      WHERE c.supports_devices = true
    `;

        const params: any[] = [];
        let paramIdx = 1;

        // Add search filter if present
        if (q) {
            sql += ` AND (LOWER(c.name) LIKE $${paramIdx} OR LOWER(c.domain) LIKE $${paramIdx})`;
            params.push(`%${q.toLowerCase()}%`);
            paramIdx++;
        }

        // Add ordering and pagination
        sql += ` ORDER BY c.name ASC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
        params.push(limit, offset);

        const rows = await query(sql, params);

        // Map to API format
        const integrations = rows.map((row: any) => ({
            id: row.domain,
            domain: row.domain,
            name: row.name,
            description: row.description,
            icon: row.icon,
            brandImageUrl: row.brandImageUrl,
            isCloud: row.isCloud,
            isConfigured: row.isConfigured,
            supportsDeviceCreation: row.supports_devices
        }));

        return NextResponse.json({ integrations });

    } catch (error: any) {
        console.error("Integration search API error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
