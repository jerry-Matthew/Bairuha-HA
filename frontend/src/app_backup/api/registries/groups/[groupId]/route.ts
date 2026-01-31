/**
 * Group CRUD API
 * 
 * GET /api/registries/groups/[groupId] - Get group by ID
 * PATCH /api/registries/groups/[groupId] - Update group
 * DELETE /api/registries/groups/[groupId] - Delete group
 */

import { NextRequest, NextResponse } from "next/server";
import { getGroupById, updateGroup, deleteGroup, getGroupState } from "@/components/globalAdd/server/group.registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/registries/groups/[groupId]
 * Get group by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const groupId = params.groupId;
    const searchParams = request.nextUrl.searchParams;
    const includeMembers = searchParams.get("includeMembers") === "true";
    const includeState = searchParams.get("includeState") === "true";

    const group = await getGroupById(groupId, includeMembers);
    
    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    const response: any = { group };

    if (includeState) {
      const state = await getGroupState(groupId);
      response.state = state;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Get group API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch group" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/registries/groups/[groupId]
 * Update group metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const groupId = params.groupId;
    const body = await request.json();
    const { name, icon, description, domain } = body;

    // Validate fields
    if (name !== undefined && typeof name !== 'string') {
      return NextResponse.json(
        { error: "Invalid 'name' field (must be a string)" },
        { status: 400 }
      );
    }

    if (icon !== undefined && typeof icon !== 'string') {
      return NextResponse.json(
        { error: "Invalid 'icon' field (must be a string)" },
        { status: 400 }
      );
    }

    if (description !== undefined && typeof description !== 'string') {
      return NextResponse.json(
        { error: "Invalid 'description' field (must be a string)" },
        { status: 400 }
      );
    }

    if (domain !== undefined && typeof domain !== 'string') {
      return NextResponse.json(
        { error: "Invalid 'domain' field (must be a string)" },
        { status: 400 }
      );
    }

    const group = await updateGroup(groupId, {
      name,
      icon,
      description,
      domain
    });

    return NextResponse.json({ group });
  } catch (error: any) {
    console.error("Update group API error:", error);
    
    if (error.message?.includes("not found")) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (error.code === '23505' || error.message?.includes('unique')) {
      return NextResponse.json(
        { error: "A group with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update group" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/registries/groups/[groupId]
 * Delete a group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const groupId = params.groupId;

    // Verify group exists
    const group = await getGroupById(groupId);
    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    await deleteGroup(groupId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete group API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete group" },
      { status: 500 }
    );
  }
}
