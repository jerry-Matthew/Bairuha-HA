/**
 * Group Member API
 * 
 * DELETE /api/registries/groups/[groupId]/members/[entityId] - Remove entity from group
 */

import { NextRequest, NextResponse } from "next/server";
import { removeEntityFromGroup, getGroupById } from "@/components/globalAdd/server/group.registry";
import { getEntityByEntityId } from "@/components/globalAdd/server/entity.registry";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/registries/groups/[groupId]/members/[entityId]
 * Remove entity from group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string; entityId: string } }
) {
  try {
    const groupId = params.groupId;
    const entityIdString = params.entityId; // This is entity_id string, not UUID

    // Verify group exists
    const group = await getGroupById(groupId);
    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // Get entity by entity_id string
    const entity = await getEntityByEntityId(entityIdString);
    if (!entity) {
      return NextResponse.json(
        { error: "Entity not found" },
        { status: 404 }
      );
    }

    // Remove entity from group
    await removeEntityFromGroup(groupId, entity.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Remove group member API error:", error);
    
    if (error.message?.includes("not found")) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to remove entity from group" },
      { status: 500 }
    );
  }
}
