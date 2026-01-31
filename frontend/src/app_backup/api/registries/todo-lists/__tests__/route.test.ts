/**
 * Todo Lists API Route Tests
 * 
 * Tests for the todo lists API endpoints including:
 * - GET /api/registries/todo-lists
 * - POST /api/registries/todo-lists
 * - Authentication and authorization
 * - Input validation
 * - Error handling
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
import { GET, POST } from "../route";
import { getAllTodoLists, createTodoList } from "@/components/globalAdd/server/todo.registry";
import { authenticate } from "@/lib/auth/middleware";

const mockGetAllTodoLists = getAllTodoLists as jest.MockedFunction<typeof getAllTodoLists>;
const mockCreateTodoList = createTodoList as jest.MockedFunction<typeof createTodoList>;
const mockAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;

describe("Todo Lists API Routes", () => {
  const mockUserId = "user-123";
  const mockList = {
    id: "list-123",
    userId: mockUserId,
    name: "Test List",
    description: "Test description",
    icon: "mdi:list",
    color: "#1976d2",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    itemCount: 0,
    completedItemCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/registries/todo-lists", () => {
    it("returns all lists for authenticated user", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });
      mockGetAllTodoLists.mockResolvedValue([mockList]);

      const request = new NextRequest("http://localhost/api/registries/todo-lists");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.lists).toHaveLength(1);
      expect(data.lists[0].name).toBe("Test List");
      expect(mockGetAllTodoLists).toHaveBeenCalledWith(mockUserId, false);
    });

    it("includes items when includeItems query param is true", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });
      mockGetAllTodoLists.mockResolvedValue([mockList]);

      const request = new NextRequest(
        "http://localhost/api/registries/todo-lists?includeItems=true"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockGetAllTodoLists).toHaveBeenCalledWith(mockUserId, true);
    });

    it("returns 401 when not authenticated", async () => {
      mockAuthenticate.mockReturnValue({
        error: "Unauthorized",
        status: 401,
      });

      const request = new NextRequest("http://localhost/api/registries/todo-lists");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      expect(mockGetAllTodoLists).not.toHaveBeenCalled();
    });

    it("handles database errors", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });
      mockGetAllTodoLists.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost/api/registries/todo-lists");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Failed to fetch todo lists");
    });
  });

  describe("POST /api/registries/todo-lists", () => {
    it("creates a new todo list", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });
      mockCreateTodoList.mockResolvedValue(mockList);

      const request = new NextRequest("http://localhost/api/registries/todo-lists", {
        method: "POST",
        body: JSON.stringify({
          name: "Test List",
          description: "Test description",
          icon: "mdi:list",
          color: "#1976d2",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.list.name).toBe("Test List");
      expect(mockCreateTodoList).toHaveBeenCalledWith({
        userId: mockUserId,
        name: "Test List",
        description: "Test description",
        icon: "mdi:list",
        color: "#1976d2",
      });
    });

    it("creates a list with minimal fields", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });
      mockCreateTodoList.mockResolvedValue(mockList);

      const request = new NextRequest("http://localhost/api/registries/todo-lists", {
        method: "POST",
        body: JSON.stringify({
          name: "Minimal List",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(mockCreateTodoList).toHaveBeenCalledWith({
        userId: mockUserId,
        name: "Minimal List",
        description: undefined,
        icon: undefined,
        color: undefined,
      });
    });

    it("returns 401 when not authenticated", async () => {
      mockAuthenticate.mockReturnValue({
        error: "Unauthorized",
        status: 401,
      });

      const request = new NextRequest("http://localhost/api/registries/todo-lists", {
        method: "POST",
        body: JSON.stringify({ name: "Test List" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      expect(mockCreateTodoList).not.toHaveBeenCalled();
    });

    it("returns 400 when name is missing", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });

      const request = new NextRequest("http://localhost/api/registries/todo-lists", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing or invalid 'name' field");
      expect(mockCreateTodoList).not.toHaveBeenCalled();
    });

    it("returns 400 when name is not a string", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });

      const request = new NextRequest("http://localhost/api/registries/todo-lists", {
        method: "POST",
        body: JSON.stringify({ name: 123 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing or invalid 'name' field");
    });

    it("returns 400 when description is not a string", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });

      const request = new NextRequest("http://localhost/api/registries/todo-lists", {
        method: "POST",
        body: JSON.stringify({
          name: "Test List",
          description: 123,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid 'description' field");
    });

    it("returns 409 when list name already exists", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });
      const error: any = new Error("Duplicate key");
      error.code = "23505";
      mockCreateTodoList.mockRejectedValue(error);

      const request = new NextRequest("http://localhost/api/registries/todo-lists", {
        method: "POST",
        body: JSON.stringify({
          name: "Duplicate List",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("already exists");
    });

    it("handles database errors", async () => {
      mockAuthenticate.mockReturnValue({
        user: { userId: mockUserId } as any,
      });
      mockCreateTodoList.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost/api/registries/todo-lists", {
        method: "POST",
        body: JSON.stringify({
          name: "Test List",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Failed to create todo list");
    });
  });
});
