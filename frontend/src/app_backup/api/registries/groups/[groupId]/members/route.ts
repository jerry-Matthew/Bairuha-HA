/**
 * Group Members API
 * 
 * GET /api/registries/groups/[groupId]/members - Get all members
 * POST /api/registries/groups/[groupId]/members - Add entity to group
 */

import { NextRequest, NextResponse } from "next/server";
import { getGroupMembers, addEntityToGroup, getGroupById } from "@/components/globalAdd/server/group.registry";
import { getEntityByEntityId } from "@/components/globalAdd/server/entity.registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/registries/groups/[groupId]/members
 * Get all members of a group
 */
export async function GET(
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

    const members = await getGroupMembers(groupId);

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error("Get group members API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch group members" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/registries/groups/[groupId]/members
 * Add entity to group
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const groupId = params.groupId;
    const body = await request.json();
    const { entityId } = body;

    // Validate required fields
    if (!entityId || typeof entityId !== 'string') {
      return NextResponse.json(
        { error: "Missing or invalid 'entityId' field (must be a string)" },
        { status: 400 }
      );
    }

    // Verify group exists
    const group = await getGroupById(groupId);
    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // Get entity by entity_id string (e.g., "light.living_room")
    const entity = await getEntityByEntityId(entityId);
    if (!entity) {
      return NextResponse.json(
        { error: "Entity not found" },
        { status: 404 }
      );
    }

    // Add entity to group
    await addEntityToGroup(groupId, entity.id);

    // Return member info
    const members = await getGroupMembers(groupId);
    const member = members.find(m => m.entityId === entity.id);

    return NextResponse.json({ 
      success: true, 
      member: member || { entityId: entity.id, groupId }
    }, { status: 201 });
  } catch (error: any) {
    console.error("Add group member API error:", error);
    
    if (error.message?.includes("not found")) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to add entity to group" },
      { status: 500 }
    );
  }
}
