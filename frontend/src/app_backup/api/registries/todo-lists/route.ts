/**
 * Todo Lists Registry API
 * 
 * GET /api/registries/todo-lists - List all todo lists for authenticated user
 * POST /api/registries/todo-lists - Create a new todo list
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllTodoLists, createTodoList } from "@/components/globalAdd/server/todo.registry";
import { authenticate } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/registries/todo-lists
 * List all todo lists for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = authenticate(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const userId = authResult.user.userId;

    const searchParams = request.nextUrl.searchParams;
    const includeItems = searchParams.get("includeItems") === "true";

    const lists = await getAllTodoLists(userId, includeItems);

    return NextResponse.json({ lists });
  } catch (error: any) {
    console.error("Todo lists API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch todo lists" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/registries/todo-lists
 * Create a new todo list
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = authenticate(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const userId = authResult.user.userId;

    const body = await request.json();
    const { name, description, icon, color } = body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: "Missing or invalid 'name' field (must be a string)" },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (description !== undefined && typeof description !== 'string') {
      return NextResponse.json(
        { error: "Invalid 'description' field (must be a string)" },
        { status: 400 }
      );
    }

    if (icon !== undefined && typeof icon !== 'string') {
      return NextResponse.json(
        { error: "Invalid 'icon' field (must be a string)" },
        { status: 400 }
      );
    }

    if (color !== undefined && typeof color !== 'string') {
      return NextResponse.json(
        { error: "Invalid 'color' field (must be a string)" },
        { status: 400 }
      );
    }

    // Create todo list
    const list = await createTodoList({
      userId,
      name,
      description,
      icon,
      color
    });

    return NextResponse.json({ list }, { status: 201 });
  } catch (error: any) {
    console.error("Create todo list API error:", error);
    
    // Handle unique constraint violation
    if (error.code === '23505' || error.message?.includes('unique')) {
      return NextResponse.json(
        { error: "A todo list with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create todo list" },
      { status: 500 }
    );
  }
}
