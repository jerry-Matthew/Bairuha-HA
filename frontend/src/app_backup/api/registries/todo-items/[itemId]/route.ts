/**
 * Todo Item API
 * 
 * GET /api/registries/todo-items/[itemId] - Get todo item by ID
 * PATCH /api/registries/todo-items/[itemId] - Update todo item
 * DELETE /api/registries/todo-items/[itemId] - Delete todo item
 */

import { NextRequest, NextResponse } from "next/server";
import { getTodoItemById, updateTodoItem, deleteTodoItem, getTodoListById } from "@/components/globalAdd/server/todo.registry";
import { authenticate } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/registries/todo-items/[itemId]
 * Get todo item by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { itemId: string } }
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
    const { itemId } = params;

    const item = await getTodoItemById(itemId);

    if (!item) {
      return NextResponse.json(
        { error: "Todo item not found" },
        { status: 404 }
      );
    }

    // Verify ownership via list
    const list = await getTodoListById(item.listId);
    if (!list || list.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error("Get todo item API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch todo item" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/registries/todo-items/[itemId]
 * Update todo item
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { itemId: string } }
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
    const { itemId } = params;

    // Verify ownership via list
    const existingItem = await getTodoItemById(itemId);
    if (!existingItem) {
      return NextResponse.json(
        { error: "Todo item not found" },
        { status: 404 }
      );
    }

    const list = await getTodoListById(existingItem.listId);
    if (!list || list.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, completed, dueDate, priority, order } = body;

    // Validate optional fields
    if (title !== undefined && typeof title !== 'string') {
      return NextResponse.json(
        { error: "Invalid 'title' field (must be a string)" },
        { status: 400 }
      );
    }

    if (description !== undefined && typeof description !== 'string') {
      return NextResponse.json(
        { error: "Invalid 'description' field (must be a string)" },
        { status: 400 }
      );
    }

    if (completed !== undefined && typeof completed !== 'boolean') {
      return NextResponse.json(
        { error: "Invalid 'completed' field (must be a boolean)" },
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

    // Update todo item
    const item = await updateTodoItem(itemId, {
      title,
      description,
      completed,
      dueDate,
      priority,
      order
    });

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error("Update todo item API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update todo item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/registries/todo-items/[itemId]
 * Delete todo item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
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
    const { itemId } = params;

    // Verify ownership via list
    const existingItem = await getTodoItemById(itemId);
    if (!existingItem) {
      return NextResponse.json(
        { error: "Todo item not found" },
        { status: 404 }
      );
    }

    const list = await getTodoListById(existingItem.listId);
    if (!list || list.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    await deleteTodoItem(itemId);

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("Delete todo item API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete todo item" },
      { status: 500 }
    );
  }
}
