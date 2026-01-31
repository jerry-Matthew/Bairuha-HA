/**
 * Todo Items API
 * 
 * GET /api/registries/todo-lists/[listId]/items - Get all items for a todo list
 * POST /api/registries/todo-lists/[listId]/items - Create a new todo item
 */

import { NextRequest, NextResponse } from "next/server";
import { getTodoListById, getTodoItemsByListId, createTodoItem } from "@/components/globalAdd/server/todo.registry";
import { authenticate } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/registries/todo-lists/[listId]/items
 * Get all items for a todo list
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

    // Verify list exists and ownership
    const list = await getTodoListById(listId);
    if (!list) {
      return NextResponse.json(
        { error: "Todo list not found" },
        { status: 404 }
      );
    }

    if (list.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const completedParam = searchParams.get("completed");
    const completed = completedParam === "true" ? true : completedParam === "false" ? false : undefined;

    const items = await getTodoItemsByListId(listId, completed);

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("Get todo items API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch todo items" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/registries/todo-lists/[listId]/items
 * Create a new todo item
 */
export async function POST(
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

    // Verify list exists and ownership
    const list = await getTodoListById(listId);
    if (!list) {
      return NextResponse.json(
        { error: "Todo list not found" },
        { status: 404 }
      );
    }

    if (list.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, dueDate, priority, order } = body;

    // Validate required fields
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: "Missing or invalid 'title' field (must be a string)" },
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

    if (dueDate !== undefined && typeof dueDate !== 'string') {
      return NextResponse.json(
        { error: "Invalid 'dueDate' field (must be a string ISO date)" },
        { status: 400 }
      );
    }

    if (priority !== undefined && !['low', 'medium', 'high'].includes(priority)) {
      return NextResponse.json(
        { error: "Invalid 'priority' field (must be 'low', 'medium', or 'high')" },
        { status: 400 }
      );
    }

    if (order !== undefined && typeof order !== 'number') {
      return NextResponse.json(
        { error: "Invalid 'order' field (must be a number)" },
        { status: 400 }
      );
    }

    // Create todo item
    const item = await createTodoItem({
      listId,
      title,
      description,
      dueDate,
      priority,
      order
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error: any) {
    console.error("Create todo item API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create todo item" },
      { status: 500 }
    );
  }
}
