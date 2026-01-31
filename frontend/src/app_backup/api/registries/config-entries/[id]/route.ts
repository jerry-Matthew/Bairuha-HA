/**
 * Config Entry Registry API (Individual Entry)
 * 
 * Operations on a single config entry
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getConfigEntryById,
  updateConfigEntry,
  deleteConfigEntry,
} from "@/components/globalAdd/server/config-entry.registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/registries/config-entries/:id
 * 
 * Get a config entry by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const entry = await getConfigEntryById(id);

    if (!entry) {
      return NextResponse.json(
        { error: "Config entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ entry });
  } catch (error: any) {
    console.error("Config entry fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch config entry" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/registries/config-entries/:id
 * 
 * Update a config entry
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const entry = await updateConfigEntry(id, {
      title: body.title,
      data: body.data,
      options: body.options,
      status: body.status,
    });

    return NextResponse.json({ entry });
  } catch (error: any) {
    console.error("Config entry update error:", error);
    if (error.message === "Config entry not found") {
      return NextResponse.json(
        { error: "Config entry not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to update config entry" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/registries/config-entries/:id
 * 
 * Delete a config entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await deleteConfigEntry(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Config entry deletion error:", error);
    if (error.message === "Config entry not found") {
      return NextResponse.json(
        { error: "Config entry not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to delete config entry" },
      { status: 500 }
    );
  }
}
