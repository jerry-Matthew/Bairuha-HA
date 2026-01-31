/**
 * Todo Registry Service Tests
 * 
 * Tests for the todo registry service including:
 * - List CRUD operations
 * - Item CRUD operations
 * - User scoping
 * - Item count calculations
 * - Date handling
 */

// Mock dependencies BEFORE imports
jest.mock("@/lib/db");

import {
  getAllTodoLists,
  getTodoListById,
  createTodoList,
  updateTodoList,
  deleteTodoList,
  getTodoItemsByListId,
  getTodoItemById,
  createTodoItem,
  updateTodoItem,
  deleteTodoItem,
  toggleTodoItem,
  reorderTodoItems,
} from "../todo.registry";
import { query } from "@/lib/db";

const mockQuery = query as jest.MockedFunction<typeof query>;

describe("Todo Registry Service", () => {
  const mockUserId = "user-123";
  const mockListId = "list-123";
  const mockItemId = "item-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Todo Lists", () => {
    describe("getAllTodoLists", () => {
      it("returns all lists for a user", async () => {
        const mockLists = [
          {
            id: mockListId,
            user_id: mockUserId,
            name: "Shopping List",
            description: "Grocery items",
            icon: "mdi:cart",
            color: "#1976d2",
            created_at: new Date("2024-01-01"),
            updated_at: new Date("2024-01-01"),
          },
        ];

        mockQuery
          .mockResolvedValueOnce(mockLists as any)
          .mockResolvedValueOnce([{ total: "5", completed: "2" }] as any);

        const lists = await getAllTodoLists(mockUserId);

        expect(lists).toHaveLength(1);
        expect(lists[0].name).toBe("Shopping List");
        expect(lists[0].itemCount).toBe(5);
        expect(lists[0].completedItemCount).toBe(2);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("SELECT"),
          [mockUserId]
        );
      });

      it("handles empty lists", async () => {
        mockQuery.mockResolvedValueOnce([]);

        const lists = await getAllTodoLists(mockUserId);

        expect(lists).toEqual([]);
      });
    });

    describe("getTodoListById", () => {
      it("returns a list by ID", async () => {
        const mockList = {
          id: mockListId,
          user_id: mockUserId,
          name: "Shopping List",
          description: "Grocery items",
          icon: "mdi:cart",
          color: "#1976d2",
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-01"),
        };

        mockQuery
          .mockResolvedValueOnce([mockList] as any)
          .mockResolvedValueOnce([{ total: "3", completed: "1" }] as any);

        const list = await getTodoListById(mockListId);

        expect(list).not.toBeNull();
        expect(list?.name).toBe("Shopping List");
        expect(list?.itemCount).toBe(3);
        expect(list?.completedItemCount).toBe(1);
      });

      it("returns null for non-existent list", async () => {
        mockQuery.mockResolvedValueOnce([]);

        const list = await getTodoListById("non-existent");

        expect(list).toBeNull();
      });
    });

    describe("createTodoList", () => {
      it("creates a new todo list", async () => {
        const mockList = {
          id: mockListId,
          userId: mockUserId,
          name: "New List",
          description: "Description",
          icon: "mdi:list",
          color: "#1976d2",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        };

        mockQuery.mockResolvedValueOnce([mockList] as any);

        const list = await createTodoList({
          userId: mockUserId,
          name: "New List",
          description: "Description",
          icon: "mdi:list",
          color: "#1976d2",
        });

        expect(list.name).toBe("New List");
        expect(list.userId).toBe(mockUserId);
        expect(list.itemCount).toBe(0);
        expect(list.completedItemCount).toBe(0);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("INSERT INTO todo_lists"),
          [mockUserId, "New List", "Description", "mdi:list", "#1976d2"]
        );
      });

      it("creates a list with minimal fields", async () => {
        const mockList = {
          id: mockListId,
          user_id: mockUserId,
          name: "Minimal List",
          description: null,
          icon: null,
          color: null,
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-01"),
        };

        mockQuery.mockResolvedValueOnce([mockList] as any);

        const list = await createTodoList({
          userId: mockUserId,
          name: "Minimal List",
        });

        expect(list.name).toBe("Minimal List");
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("INSERT INTO todo_lists"),
          [mockUserId, "Minimal List", null, null, null]
        );
      });
    });

    describe("updateTodoList", () => {
      it("updates list fields", async () => {
        const mockList = {
          id: mockListId,
          user_id: mockUserId,
          name: "Updated List",
          description: "Updated description",
          icon: "mdi:updated",
          color: "#ff0000",
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-02"),
        };

        mockQuery
          .mockResolvedValueOnce([mockList] as any)
          .mockResolvedValueOnce([{ count: "0" }, { completed: "0" }] as any);

        const list = await updateTodoList(mockListId, {
          name: "Updated List",
          description: "Updated description",
        });

        expect(list.name).toBe("Updated List");
        expect(list.description).toBe("Updated description");
      });

      it("returns existing list if no updates provided", async () => {
        const mockList = {
          id: mockListId,
          user_id: mockUserId,
          name: "Existing List",
          description: null,
          icon: null,
          color: null,
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-01"),
        };

        mockQuery
          .mockResolvedValueOnce([mockList] as any)
          .mockResolvedValueOnce([{ count: "0" }, { completed: "0" }] as any);

        const list = await updateTodoList(mockListId, {});

        expect(list).not.toBeNull();
        expect(mockQuery).toHaveBeenCalledTimes(2); // getTodoListById + count query
      });

      it("throws error for non-existent list", async () => {
        mockQuery.mockResolvedValueOnce([]);

        await expect(
          updateTodoList("non-existent", { name: "New Name" })
        ).rejects.toThrow("Todo list not found");
      });
    });

    describe("deleteTodoList", () => {
      it("deletes a todo list", async () => {
        mockQuery.mockResolvedValueOnce([]);

        await deleteTodoList(mockListId);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("DELETE FROM todo_lists"),
          [mockListId]
        );
      });
    });
  });

  describe("Todo Items", () => {
    describe("getTodoItemsByListId", () => {
      it("returns all items for a list", async () => {
        const mockItems = [
          {
            id: mockItemId,
            list_id: mockListId,
            title: "Buy milk",
            description: "Get 2% milk",
            completed: false,
            due_date: new Date("2024-01-15"),
            priority: "high",
            order: 1,
            created_at: new Date("2024-01-01"),
            updated_at: new Date("2024-01-01"),
            completed_at: null,
          },
        ];

        mockQuery.mockResolvedValueOnce(mockItems as any);

        const items = await getTodoItemsByListId(mockListId);

        expect(items).toHaveLength(1);
        expect(items[0].title).toBe("Buy milk");
        expect(items[0].completed).toBe(false);
        expect(items[0].priority).toBe("high");
      });

      it("filters by completion status", async () => {
        const mockItems = [
          {
            id: mockItemId,
            list_id: mockListId,
            title: "Completed task",
            description: null,
            completed: true,
            due_date: null,
            priority: null,
            order: 1,
            created_at: new Date("2024-01-01"),
            updated_at: new Date("2024-01-01"),
            completed_at: new Date("2024-01-02"),
          },
        ];

        mockQuery.mockResolvedValueOnce(mockItems as any);

        const items = await getTodoItemsByListId(mockListId, true);

        expect(items).toHaveLength(1);
        expect(items[0].completed).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("completed = $2"),
          [mockListId, true]
        );
      });
    });

    describe("getTodoItemById", () => {
      it("returns an item by ID", async () => {
        const mockItem = {
          id: mockItemId,
          list_id: mockListId,
          title: "Test Item",
          description: "Test description",
          completed: false,
          due_date: new Date("2024-01-15"),
          priority: "medium",
          order: 1,
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-01"),
          completed_at: null,
        };

        mockQuery.mockResolvedValueOnce([mockItem] as any);

        const item = await getTodoItemById(mockItemId);

        expect(item).not.toBeNull();
        expect(item?.title).toBe("Test Item");
      });

      it("returns null for non-existent item", async () => {
        mockQuery.mockResolvedValueOnce([]);

        const item = await getTodoItemById("non-existent");

        expect(item).toBeNull();
      });
    });

    describe("createTodoItem", () => {
      it("creates a new todo item", async () => {
        const mockItem = {
          id: mockItemId,
          list_id: mockListId,
          title: "New Item",
          description: "Item description",
          completed: false,
          due_date: new Date("2024-01-15"),
          priority: "high",
          order: 1,
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-01"),
          completed_at: null,
        };

        mockQuery
          .mockResolvedValueOnce([{ max: 0 }] as any) // Max order query
          .mockResolvedValueOnce([mockItem] as any);

        const item = await createTodoItem({
          listId: mockListId,
          title: "New Item",
          description: "Item description",
          dueDate: "2024-01-15T00:00:00.000Z",
          priority: "high",
        });

        expect(item.title).toBe("New Item");
        expect(item.order).toBe(1);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("INSERT INTO todo_items"),
          expect.arrayContaining([mockListId, "New Item"])
        );
      });

      it("auto-increments order when not provided", async () => {
        const mockItem = {
          id: mockItemId,
          list_id: mockListId,
          title: "New Item",
          description: null,
          completed: false,
          due_date: null,
          priority: null,
          order: 5,
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-01"),
          completed_at: null,
        };

        mockQuery
          .mockResolvedValueOnce([{ max: 4 }] as any)
          .mockResolvedValueOnce([mockItem] as any);

        const item = await createTodoItem({
          listId: mockListId,
          title: "New Item",
        });

        expect(item.order).toBe(5);
      });
    });

    describe("updateTodoItem", () => {
      it("updates item fields", async () => {
        const mockItem = {
          id: mockItemId,
          list_id: mockListId,
          title: "Updated Item",
          description: "Updated description",
          completed: true,
          due_date: new Date("2024-01-20"),
          priority: "low",
          order: 1,
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-02"),
          completed_at: new Date("2024-01-02"),
        };

        mockQuery.mockResolvedValueOnce([mockItem] as any);

        const item = await updateTodoItem(mockItemId, {
          title: "Updated Item",
          completed: true,
        });

        expect(item.title).toBe("Updated Item");
        expect(item.completed).toBe(true);
      });

      it("handles date conversion", async () => {
        const mockItem = {
          id: mockItemId,
          listId: mockListId,
          title: "Item",
          description: null,
          completed: false,
          dueDate: "2024-01-15T00:00:00.000Z",
          priority: null,
          order: 1,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          completedAt: null,
        };

        mockQuery.mockResolvedValueOnce([mockItem] as any);

        const item = await updateTodoItem(mockItemId, {
          dueDate: "2024-01-15T00:00:00.000Z",
        });

        expect(item.dueDate).toBeDefined();
        expect(item.dueDate).toBe("2024-01-15T00:00:00.000Z");
      });
    });

    describe("deleteTodoItem", () => {
      it("deletes a todo item", async () => {
        mockQuery.mockResolvedValueOnce([]);

        await deleteTodoItem(mockItemId);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("DELETE FROM todo_items"),
          [mockItemId]
        );
      });
    });

    describe("toggleTodoItem", () => {
      it("toggles item completion from false to true", async () => {
        const mockItem = {
          id: mockItemId,
          list_id: mockListId,
          title: "Test Item",
          description: null,
          completed: false,
          due_date: null,
          priority: null,
          order: 1,
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-01"),
          completed_at: null,
        };

        const mockUpdatedItem = {
          ...mockItem,
          completed: true,
          completed_at: new Date("2024-01-02"),
        };

        mockQuery
          .mockResolvedValueOnce([mockItem] as any)
          .mockResolvedValueOnce([mockUpdatedItem] as any);

        const item = await toggleTodoItem(mockItemId);

        expect(item.completed).toBe(true);
        expect(mockQuery).toHaveBeenCalledTimes(2); // getTodoItemById + updateTodoItem
      });

      it("throws error for non-existent item", async () => {
        mockQuery.mockResolvedValueOnce([]);

        await expect(toggleTodoItem("non-existent")).rejects.toThrow(
          "Todo item not found"
        );
      });
    });

    describe("reorderTodoItems", () => {
      it("reorders items in a list", async () => {
        const itemIds = ["item-1", "item-2", "item-3"];

        mockQuery.mockResolvedValue([]);

        await reorderTodoItems(mockListId, itemIds);

        expect(mockQuery).toHaveBeenCalledTimes(3);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("UPDATE todo_items SET"),
          [1, "item-1", mockListId]
        );
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("UPDATE todo_items SET"),
          [2, "item-2", mockListId]
        );
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("UPDATE todo_items SET"),
          [3, "item-3", mockListId]
        );
      });
    });
  });
});
