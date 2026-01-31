/**
 * Todo Items API Route Tests
 * 
 * Tests for the todo items API endpoints including:
 * - GET /api/registries/todo-items/[itemId]
 * - PATCH /api/registries/todo-items/[itemId]
 * - DELETE /api/registries/todo-items/[itemId]
 * - POST /api/registries/todo-items/[itemId]/toggle
 * - Authentication and authorization
 * - Input validation
 */

// Mock dependencies BEFORE imports
jest.mock("@/lib/db");
jest.mock("@/components/globalAdd/server/todo.registry");
jest.mock("@/lib/auth/middleware");

// Mock Next.js server
jest.mock("next/server", () => ({
  NextRequest: class NextRequest {
    url: string;
    headers: Headers;
    nextUrl: URL;
    
    constructor(url: string, init?: any) {
      this.url = url;
      this.headers = new Headers(init?.headers || {});
      this.nextUrl = new URL(url, "http://localhost");
      if (init?.body) {
        (this as any).body = init.body;
      }
    }
    
    async json() {
      return JSON.parse((this as any).body || "{}");
    }
  },
  NextResponse: class NextResponse {
    body: any;
    status: number;
    headers: Headers;
    
    constructor(body?: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Headers(init?.headers || {});
    }
    
    static json(body: any, init?: any) {
      return new NextResponse(body, init);
    }
  },
}));

import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "../[itemId]/route";
import { POST } from "../[itemId]/toggle/route";
import {
  getTodoItemById,
  updateTodoItem,
  deleteTodoItem,
  toggleTodoItem,
  getTodoListById,
} from "@/components/globalAdd/server/todo.registry";
import { authenticate } from "@/lib/auth/middleware";

const mockGetTodoItemById = getTodoItemById as jest.MockedFunction<typeof getTodoItemById>;
const mockUpdateTodoItem = updateTodoItem as jest.MockedFunction<typeof updateTodoItem>;
const mockDeleteTodoItem = deleteTodoItem as jest.MockedFunction<typeof deleteTodoItem>;
const mockToggleTodoItem = toggleTodoItem as jest.MockedFunction<typeof toggleTodoItem>;
const mockGetTodoListById = getTodoListById as jest.MockedFunction<typeof getTodoListById>;
const mockAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;

describe("Todo Items API Routes", () => {
  const mockUserId = "user-123";
  const mockListId = "list-123";
  const mockItemId = "item-123";
  const mockList = {
    id: mockListId,
    userId: mockUserId,
    name: "Test List",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
  const mockItem = {
    id: mockItemId,
    listId: mockListId,
    title: "Test Item",
    description: "Test description",
    completed: false,
    dueDate: "2024-01-15T00:00:00.000Z",
    priority: "high",
    order: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/registries/todo-items/[itemId]", () => {
    it("returns an item by ID", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });
      mockGetTodoItemById.mockResolvedValue(mockItem);
      mockGetTodoListById.mockResolvedValue(mockList);

      const request = new NextRequest(`http://localhost/api/registries/todo-items/${mockItemId}`);
      const response = await GET(request, { params: { itemId: mockItemId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.item.title).toBe("Test Item");
      expect(mockGetTodoItemById).toHaveBeenCalledWith(mockItemId);
    });

    it("returns 404 when item not found", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });
      mockGetTodoItemById.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/registries/todo-items/${mockItemId}`);
      const response = await GET(request, { params: { itemId: mockItemId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Todo item not found");
    });

    it("returns 403 when user doesn't own the list", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: "other-user" } as any,
      });
      mockGetTodoItemById.mockResolvedValue(mockItem);
      mockGetTodoListById.mockResolvedValue({
        ...mockList,
        userId: "other-user",
      });

      const request = new NextRequest(`http://localhost/api/registries/todo-items/${mockItemId}`);
      const response = await GET(request, { params: { itemId: mockItemId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("PATCH /api/registries/todo-items/[itemId]", () => {
    it("updates an item", async () => {
      const updatedItem = { ...mockItem, title: "Updated Item", completed: true };
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });
      mockGetTodoItemById.mockResolvedValue(mockItem);
      mockGetTodoListById.mockResolvedValue(mockList);
      mockUpdateTodoItem.mockResolvedValue(updatedItem);

      const request = new NextRequest(`http://localhost/api/registries/todo-items/${mockItemId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: "Updated Item",
          completed: true,
        }),
      });

      const response = await PATCH(request, { params: { itemId: mockItemId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.item.title).toBe("Updated Item");
      expect(data.item.completed).toBe(true);
      expect(mockUpdateTodoItem).toHaveBeenCalledWith(mockItemId, {
        title: "Updated Item",
        completed: true,
      });
    });

    it("returns 400 when title is not a string", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });
      mockGetTodoItemById.mockResolvedValue(mockItem);
      mockGetTodoListById.mockResolvedValue(mockList);

      const request = new NextRequest(`http://localhost/api/registries/todo-items/${mockItemId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: 123 }),
      });

      const response = await PATCH(request, { params: { itemId: mockItemId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid 'title' field");
    });

    it("returns 400 when priority is invalid", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });
      mockGetTodoItemById.mockResolvedValue(mockItem);
      mockGetTodoListById.mockResolvedValue(mockList);

      const request = new NextRequest(`http://localhost/api/registries/todo-items/${mockItemId}`, {
        method: "PATCH",
        body: JSON.stringify({ priority: "invalid" }),
      });

      const response = await PATCH(request, { params: { itemId: mockItemId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid 'priority' field");
    });
  });

  describe("DELETE /api/registries/todo-items/[itemId]", () => {
    it("deletes an item", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });
      mockGetTodoItemById.mockResolvedValue(mockItem);
      mockGetTodoListById.mockResolvedValue(mockList);
      mockDeleteTodoItem.mockResolvedValue();

      const request = new NextRequest(`http://localhost/api/registries/todo-items/${mockItemId}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { itemId: mockItemId } });

      expect(response.status).toBe(204);
      expect(mockDeleteTodoItem).toHaveBeenCalledWith(mockItemId);
    });

    it("returns 404 when item not found", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });
      mockGetTodoItemById.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/registries/todo-items/${mockItemId}`, {
        method: "DELETE",
      });

      const response = await DELETE(request, { params: { itemId: mockItemId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Todo item not found");
    });
  });

  describe("POST /api/registries/todo-items/[itemId]/toggle", () => {
    it("toggles item completion", async () => {
      const toggledItem = { ...mockItem, completed: true };
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });
      mockGetTodoItemById.mockResolvedValue(mockItem);
      mockGetTodoListById.mockResolvedValue(mockList);
      mockToggleTodoItem.mockResolvedValue(toggledItem);

      const request = new NextRequest(
        `http://localhost/api/registries/todo-items/${mockItemId}/toggle`,
        {
          method: "POST",
        }
      );

      const response = await POST(request, { params: { itemId: mockItemId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.item.completed).toBe(true);
      expect(mockToggleTodoItem).toHaveBeenCalledWith(mockItemId);
    });

    it("returns 404 when item not found", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });
      mockGetTodoItemById.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/registries/todo-items/${mockItemId}/toggle`,
        {
          method: "POST",
        }
      );

      const response = await POST(request, { params: { itemId: mockItemId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Todo item not found");
    });

    it("returns 403 when user doesn't own the list", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: "other-user" } as any,
      });
      mockGetTodoItemById.mockResolvedValue(mockItem);
      mockGetTodoListById.mockResolvedValue({
        ...mockList,
        userId: "other-user",
      });

      const request = new NextRequest(
        `http://localhost/api/registries/todo-items/${mockItemId}/toggle`,
        {
          method: "POST",
        }
      );

      const response = await POST(request, { params: { itemId: mockItemId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });
});
