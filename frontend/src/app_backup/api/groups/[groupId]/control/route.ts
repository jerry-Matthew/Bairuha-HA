/**
 * Group Control API
 * 
 * POST /api/groups/[groupId]/control - Control all members of a group
 */

import { NextRequest, NextResponse } from "next/server";
import { getGroupById, getGroupMembers } from "@/components/globalAdd/server/group.registry";
import { getEntityById, getEntityByEntityId } from "@/components/globalAdd/server/entity.registry";
import { getHAServiceCallService } from "@/lib/home-assistant/service-call";

export const dynamic = "force-dynamic";

/**
 * POST /api/groups/[groupId]/control
 * Control all members of a group simultaneously
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const groupId = params.groupId;
    const body = await request.json();
    const { command, payload } = body;

    // Validate required fields
    if (!command || typeof command !== 'string') {
      return NextResponse.json(
        { error: "Missing or invalid 'command' field (must be a string)" },
        { status: 400 }
      );
    }

    // Validate payload if provided
    if (payload !== undefined && (typeof payload !== 'object' || Array.isArray(payload) || payload === null)) {
      return NextResponse.json(
        { error: "Invalid 'payload' field (must be an object)" },
        { status: 400 }
      );
    }

    // Get group
    const group = await getGroupById(groupId);
    if (!group) {
      return NextResponse.json(
        { error: "Group not found" },
        { status: 404 }
      );
    }

    // Get all member entities
    const members = await getGroupMembers(groupId);
    if (members.length === 0) {
      return NextResponse.json(
        { error: "Group has no members" },
        { status: 400 }
      );
    }

    // Execute command for each member entity
    const serviceCallService = getHAServiceCallService();
    const commands = [];

    for (const member of members) {
      try {
        // Get entity to validate it can be controlled
        const entity = await getEntityById(member.entityId);
        if (!entity) {
          commands.push({
            entityId: member.entityId,
            status: "failed",
            error: "Entity not found"
          });
          continue;
        }

        // Execute command for this entity (use entity_id string, not UUID)
        const result = await serviceCallService.executeCommandForEntity(
          entity.entityId, // Use entity_id string, not UUID
          command,
          payload
        );

        commands.push({
          commandId: result.commandId,
          entityId: entity.entityId,
          status: result.queued ? "queued" : (result.success ? "executed" : "failed"),
          error: result.error
        });
      } catch (error: any) {
        commands.push({
          entityId: member.entityId,
          status: "failed",
          error: error.message || "Unknown error"
        });
      }
    }

    return NextResponse.json({
      success: true,
      groupId,
      commandCount: commands.length,
      commands
    }, { status: 202 });
  } catch (error: any) {
    console.error("Group control API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to control group" },
      { status: 500 }
    );
  }
}
