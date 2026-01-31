/**
 * Groups Registry API
 * 
 * GET /api/registries/groups - List all groups
 * POST /api/registries/groups - Create a new group
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllGroups, createGroup } from "@/components/globalAdd/server/group.registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/registries/groups
 * List all groups
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeMembers = searchParams.get("includeMembers") === "true";
    const domain = searchParams.get("domain");

    let groups;
    if (domain) {
      const { getGroupsByDomain } = await import("@/components/globalAdd/server/group.registry");
      groups = await getGroupsByDomain(domain);
    } else {
      groups = await getAllGroups(includeMembers);
    }

    return NextResponse.json({ groups });
  } catch (error: any) {
    console.error("Groups API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/registries/groups
 * Create a new group
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, icon, description, domain, entityIds } = body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: "Missing or invalid 'name' field (must be a string)" },
        { status: 400 }
      );
    }

    // Validate optional fields
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

    if (entityIds !== undefined && !Array.isArray(entityIds)) {
      return NextResponse.json(
        { error: "Invalid 'entityIds' field (must be an array)" },
        { status: 400 }
      );
    }

    // Create group
    const group = await createGroup({
      name,
      icon,
      description,
      domain,
      entityIds
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error: any) {
    console.error("Create group API error:", error);
    
    // Handle unique constraint violation
    if (error.code === '23505' || error.message?.includes('unique')) {
      return NextResponse.json(
        { error: "A group with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create group" },
      { status: 500 }
    );
  }
}
