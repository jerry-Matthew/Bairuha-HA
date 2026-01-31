/**
 * Todo Item Toggle API
 * 
 * POST /api/registries/todo-items/[itemId]/toggle - Toggle todo item completion status
 */

import { NextRequest, NextResponse } from "next/server";
import { toggleTodoItem, getTodoItemById, getTodoListById } from "@/components/globalAdd/server/todo.registry";
import { authenticate } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

/**
 * POST /api/registries/todo-items/[itemId]/toggle
 * Toggle todo item completion status
 */
export async function POST(
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

    // Toggle completion status
    const item = await toggleTodoItem(itemId);

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error("Toggle todo item API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to toggle todo item" },
      { status: 500 }
    );
  }
}
