/**
 * Todo List API
 * 
 * GET /api/registries/todo-lists/[listId] - Get todo list by ID
 * PATCH /api/registries/todo-lists/[listId] - Update todo list
 * DELETE /api/registries/todo-lists/[listId] - Delete todo list
 */

import { NextRequest, NextResponse } from "next/server";
import { getTodoListById, updateTodoList, deleteTodoList } from "@/components/globalAdd/server/todo.registry";
import { authenticate } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/registries/todo-lists/[listId]
 * Get todo list by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
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
    const { listId } = params;

    const searchParams = request.nextUrl.searchParams;
    const includeItems = searchParams.get("includeItems") === "true";

    const list = await getTodoListById(listId, includeItems);

    if (!list) {
      return NextResponse.json(
        { error: "Todo list not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (list.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json({ list });
  } catch (error: any) {
    console.error("Get todo list API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch todo list" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/registries/todo-lists/[listId]
 * Update todo list
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
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
    const { listId } = params;

    // Verify ownership
    const existingList = await getTodoListById(listId);
    if (!existingList) {
      return NextResponse.json(
        { error: "Todo list not found" },
        { status: 404 }
      );
    }

    if (existingList.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, icon, color } = body;

    // Validate optional fields
    if (name !== undefined && typeof name !== 'string') {
      return NextResponse.json(
        { error: "Invalid 'name' field (must be a string)" },
        { status: 400 }
      );
    }

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

    // Update todo list
    const list = await updateTodoList(listId, {
      name,
      description,
      icon,
      color
    });

    return NextResponse.json({ list });
  } catch (error: any) {
    console.error("Update todo list API error:", error);
    
    // Handle unique constraint violation
    if (error.code === '23505' || error.message?.includes('unique')) {
      return NextResponse.json(
        { error: "A todo list with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update todo list" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/registries/todo-lists/[listId]
 * Delete todo list
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
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
    const { listId } = params;

    // Verify ownership
    const existingList = await getTodoListById(listId);
    if (!existingList) {
      return NextResponse.json(
        { error: "Todo list not found" },
        { status: 404 }
      );
    }

    if (existingList.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    await deleteTodoList(listId);

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Delete todo list API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete todo list" },
      { status: 500 }
    );
  }
}
