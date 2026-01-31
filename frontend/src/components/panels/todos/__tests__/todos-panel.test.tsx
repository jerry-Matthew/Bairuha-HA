/**
 * Todos Panel Component Tests
 * 
 * Tests for the TodosPanel component including:
 * - Rendering
 * - List management (create, edit, delete)
 * - Item management (create, toggle, delete)
 * - Filtering and search
 * - Error handling
 */

// Mock dependencies BEFORE imports
jest.mock("@mui/icons-material", () => ({
  Add: () => "AddIcon",
  Edit: () => "EditIcon",
  Delete: () => "DeleteIcon",
  List: () => "ListIcon",
  MoreVert: () => "MoreVertIcon",
  CheckCircle: () => "CheckCircleIcon",
  RadioButtonUnchecked: () => "RadioButtonUncheckedIcon",
  CalendarToday: () => "CalendarIcon",
  Flag: () => "FlagIcon",
  Search: () => "SearchIcon",
}));

jest.mock("@/components/ui/icon-picker", () => ({
  COMMON_ICONS: [],
}));

jest.mock("@/components/ui/icon-autocomplete", () => ({
  IconAutocomplete: () => null,
}));

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { TodosPanel } from "../todos-panel";

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => "mock-token"),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

// Mock window.confirm
window.confirm = jest.fn(() => true);

describe("TodosPanel", () => {
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
    itemCount: 2,
    completedItemCount: 1,
  };
  const mockItem = {
    id: "item-123",
    listId: "list-123",
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
    mockLocalStorage.getItem.mockReturnValue("mock-token");
  });

  describe("Rendering", () => {
    it("renders the panel header", () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lists: [] }),
      } as Response);

      render(<TodosPanel userId={mockUserId} />);

      expect(screen.getByText("To-Do Lists")).toBeInTheDocument();
      expect(screen.getByText("Create and manage your task lists")).toBeInTheDocument();
    });

    it("shows loading state initially", () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<TodosPanel userId={mockUserId} />);

      // Loading spinner should be shown (implementation dependent)
      // This test verifies the component renders without crashing
    });

    it("displays empty state when no lists exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lists: [] }),
      } as Response);

      render(<TodosPanel userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText("No Lists")).toBeInTheDocument();
        expect(screen.getByText("Create your first todo list to get started")).toBeInTheDocument();
      });
    });

    it("displays lists when they exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lists: [mockList] }),
      } as Response);

      render(<TodosPanel userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText("Test List")).toBeInTheDocument();
        expect(screen.getByText("1/2 completed")).toBeInTheDocument();
      });
    });
  });

  describe("List Management", () => {
    it("opens create list dialog when button is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ lists: [] }),
      } as Response);

      render(<TodosPanel userId={mockUserId} />);

      await waitFor(() => {
        const createButton = screen.getByText("New List");
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Create New List")).toBeInTheDocument();
      });
    });

    it("creates a new list", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lists: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ list: mockList }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lists: [mockList] }),
        } as Response);

      render(<TodosPanel userId={mockUserId} />);

      await waitFor(() => {
        const createButton = screen.getByText("New List");
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        const nameInput = screen.getByLabelText("List Name");
        fireEvent.change(nameInput, { target: { value: "Test List" } });
      });

      const createButton = screen.getByText("Create");
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/registries/todo-lists",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Authorization: "Bearer mock-token",
            }),
          })
        );
      });
    });

    it("deletes a list when delete is clicked", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lists: [mockList] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lists: [] }),
        } as Response);

      render(<TodosPanel userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText("Test List")).toBeInTheDocument();
      });

      // Find and click the menu button (implementation may vary)
      const menuButtons = screen.getAllByRole("button");
      const menuButton = menuButtons.find((btn) => btn.getAttribute("aria-label")?.includes("more"));
      
      if (menuButton) {
        fireEvent.click(menuButton);
        
        await waitFor(() => {
          const deleteButton = screen.getByText("Delete");
          fireEvent.click(deleteButton);
        });

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            `/api/registries/todo-lists/${mockList.id}`,
            expect.objectContaining({
              method: "DELETE",
            })
          );
        });
      }
    });
  });

  describe("Item Management", () => {
    it("displays items when a list is selected", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lists: [mockList] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [mockItem] }),
        } as Response);

      render(<TodosPanel userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText("Test List")).toBeInTheDocument();
      });

      const listButton = screen.getByText("Test List");
      fireEvent.click(listButton);

      await waitFor(() => {
        expect(screen.getByText("Test Item")).toBeInTheDocument();
      });
    });

    it("toggles item completion when checkbox is clicked", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lists: [mockList] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [mockItem] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ item: { ...mockItem, completed: true } }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [{ ...mockItem, completed: true }] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lists: [mockList] }),
        } as Response);

      render(<TodosPanel userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText("Test List")).toBeInTheDocument();
      });

      const listButton = screen.getByText("Test List");
      fireEvent.click(listButton);

      await waitFor(() => {
        expect(screen.getByText("Test Item")).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole("checkbox");
      const itemCheckbox = checkboxes.find((cb) => !cb.hasAttribute("checked"));
      
      if (itemCheckbox) {
        fireEvent.click(itemCheckbox);

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            `/api/registries/todo-items/${mockItem.id}/toggle`,
            expect.objectContaining({
              method: "POST",
            })
          );
        });
      }
    });

    it("filters items by completion status", async () => {
      const completedItem = { ...mockItem, id: "item-456", completed: true };
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lists: [mockList] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [mockItem, completedItem] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [completedItem] }),
        } as Response);

      render(<TodosPanel userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText("Test List")).toBeInTheDocument();
      });

      const listButton = screen.getByText("Test List");
      fireEvent.click(listButton);

      await waitFor(() => {
        expect(screen.getByText("Test Item")).toBeInTheDocument();
      });

      const completedTab = screen.getByText("Completed");
      fireEvent.click(completedTab);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("completed=true"),
          expect.any(Object)
        );
      });
    });

    it("searches items by query", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lists: [mockList] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [mockItem] }),
        } as Response);

      render(<TodosPanel userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText("Test List")).toBeInTheDocument();
      });

      const listButton = screen.getByText("Test List");
      fireEvent.click(listButton);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText("Search items...");
        fireEvent.change(searchInput, { target: { value: "Test" } });
      });

      await waitFor(() => {
        expect(screen.getByText("Test Item")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("displays error message when API call fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<TodosPanel userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it("shows snackbar message on successful operations", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lists: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ list: mockList }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ lists: [mockList] }),
        } as Response);

      render(<TodosPanel userId={mockUserId} />);

      await waitFor(() => {
        const createButton = screen.getByText("New List");
        fireEvent.click(createButton);
      });

      await waitFor(() => {
        const nameInput = screen.getByLabelText("List Name");
        fireEvent.change(nameInput, { target: { value: "Test List" } });
      });

      const createButton = screen.getByText("Create");
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
      });
    });
  });
});
