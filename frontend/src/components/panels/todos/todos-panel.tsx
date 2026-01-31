"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Checkbox,
  FormControlLabel,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  Tabs,
  Tab,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  List as ListIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  CalendarToday as CalendarIcon,
  Flag as FlagIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { PanelHeader } from "@/components/ui/panel-header";
import { EmptyState } from "@/components/ui/empty-state";
import { IconAutocomplete } from "@/components/ui/icon-autocomplete";
import { useAuth } from "@/contexts/auth-context";
import { COMMON_ICONS } from "@/components/ui/icon-picker";

interface TodoList {
  id: string;
  userId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
  completedItemCount?: number;
}

interface TodoItem {
  id: string;
  listId: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface TodosPanelProps {
  userId: string;
}

type ItemFilter = "all" | "active" | "completed";

// Helper function to get icon component from icon string
function getIconComponent(iconName?: string) {
  if (!iconName) return null;
  const iconData = COMMON_ICONS.find(icon => icon.name === iconName);
  return iconData?.icon || null;
}

export function TodosPanel({ userId }: TodosPanelProps) {
  const { accessToken } = useAuth();
  const [lists, setLists] = useState<TodoList[]>([]);
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  // Dialog states
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<TodoList | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuList, setMenuList] = useState<TodoList | null>(null);
  const [itemFilter, setItemFilter] = useState<ItemFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form states for list
  const [listName, setListName] = useState("");
  const [listIcon, setListIcon] = useState("");
  const [listDescription, setListDescription] = useState("");

  // Form states for item
  const [itemTitle, setItemTitle] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemDueDate, setItemDueDate] = useState("");
  const [itemPriority, setItemPriority] = useState<'low' | 'medium' | 'high' | ''>('');

  // Load lists
  useEffect(() => {
    loadLists();
  }, []);

  // Load items when list is selected
  useEffect(() => {
    if (selectedList) {
      loadItems(selectedList.id);
    } else {
      setItems([]);
    }
  }, [selectedList, itemFilter]);

  const loadLists = async () => {
    try {
      setLoading(true);
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const response = await fetch("/api/registries/todo-lists", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error("Failed to load todo lists");
      const data = await response.json();
      setLists(data.lists || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (listId: string) => {
    try {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      let url = `/api/registries/todo-lists/${listId}/items`;
      if (itemFilter === "active") {
        url += "?completed=false";
      } else if (itemFilter === "completed") {
        url += "?completed=true";
      }
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error("Failed to load todo items");
      const data = await response.json();
      setItems(data.items || []);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message });
    }
  };

  const handleCreateList = async () => {
    try {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const response = await fetch("/api/registries/todo-lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: listName,
          description: listDescription || undefined,
          icon: listIcon || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create todo list");
      }

      setSnackbar({ open: true, message: "Todo list created successfully" });
      setListDialogOpen(false);
      resetListForm();
      loadLists();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message });
    }
  };

  const handleUpdateList = async () => {
    if (!selectedList) return;

    try {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const response = await fetch(`/api/registries/todo-lists/${selectedList.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: listName,
          description: listDescription || undefined,
          icon: listIcon || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update todo list");
      }

      setSnackbar({ open: true, message: "Todo list updated successfully" });
      setListDialogOpen(false);
      resetListForm();
      loadLists();
      if (selectedList) {
        setSelectedList(null);
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message });
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm("Are you sure you want to delete this todo list? All items will be deleted.")) return;

    try {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const response = await fetch(`/api/registries/todo-lists/${listId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete todo list");

      setSnackbar({ open: true, message: "Todo list deleted successfully" });
      loadLists();
      if (selectedList?.id === listId) {
        setSelectedList(null);
        setItems([]);
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message });
    }
  };

  const handleCreateItem = async () => {
    if (!selectedList) return;

    try {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const response = await fetch(`/api/registries/todo-lists/${selectedList.id}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: itemTitle,
          description: itemDescription || undefined,
          dueDate: itemDueDate || undefined,
          priority: itemPriority || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create todo item");
      }

      setSnackbar({ open: true, message: "Todo item created successfully" });
      setItemDialogOpen(false);
      resetItemForm();
      loadItems(selectedList.id);
      loadLists(); // Refresh to update counts
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message });
    }
  };

  const handleToggleItem = async (itemId: string) => {
    try {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const response = await fetch(`/api/registries/todo-items/${itemId}/toggle`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) throw new Error("Failed to toggle todo item");

      if (selectedList) {
        loadItems(selectedList.id);
        loadLists(); // Refresh to update counts
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this todo item?")) return;

    try {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }
      const response = await fetch(`/api/registries/todo-items/${itemId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete todo item");

      setSnackbar({ open: true, message: "Todo item deleted successfully" });
      if (selectedList) {
        loadItems(selectedList.id);
        loadLists(); // Refresh to update counts
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message });
    }
  };

  const resetListForm = () => {
    setListName("");
    setListIcon("");
    setListDescription("");
    setMenuList(null);
  };

  const resetItemForm = () => {
    setItemTitle("");
    setItemDescription("");
    setItemDueDate("");
    setItemPriority("");
  };

  const openCreateListDialog = () => {
    resetListForm();
    setListDialogOpen(true);
  };

  const openEditListDialog = (list: TodoList) => {
    setMenuList(list);
    setListName(list.name);
    setListIcon(list.icon || "");
    setListDescription(list.description || "");
    setListDialogOpen(true);
  };

  const openCreateItemDialog = () => {
    resetItemForm();
    setItemDialogOpen(true);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, list: TodoList) => {
    setMenuAnchor(event.currentTarget);
    setMenuList(list);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuList(null);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "default";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && !selectedList?.completedItemCount;
  };

  // Filter items by search query
  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PanelHeader
        title="To-Do Lists"
        description="Create and manage your task lists"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateListDialog}
          >
            New List
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Lists Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Lists
            </Typography>
            {lists.length === 0 ? (
              <EmptyState
                icon={<ListIcon sx={{ fontSize: 64, color: "text.secondary" }} />}
                title="No Lists"
                description="Create your first todo list to get started"
                action={
                  <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateListDialog}>
                    Create List
                  </Button>
                }
              />
            ) : (
              <List>
                {lists.map((list) => (
                  <ListItem
                    key={list.id}
                    disablePadding
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => handleMenuOpen(e, list)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    }
                  >
                    <ListItemButton
                      selected={selectedList?.id === list.id}
                      onClick={() => setSelectedList(list)}
                      sx={{
                        borderLeft: list.color ? `3px solid ${list.color}` : 'none',
                        '&.Mui-selected': {
                          backgroundColor: list.color ? `${list.color}15` : undefined,
                        }
                      }}
                    >
                      <ListItemIcon>
                        {(() => {
                          const IconComponent = getIconComponent(list.icon);
                          return IconComponent ? (
                            <IconComponent 
                              sx={{ 
                                fontSize: 24,
                                color: "primary.main"
                              }} 
                            />
                          ) : (
                            <ListIcon sx={{ color: "primary.main" }} />
                          );
                        })()}
                      </ListItemIcon>
                      <ListItemText
                        primary={list.name}
                        secondary={`${list.completedItemCount || 0}/${list.itemCount || 0} completed`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Items Panel */}
        <Grid item xs={12} md={8}>
          {selectedList ? (
            <Paper sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">{selectedList.name}</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={openCreateItemDialog}
                >
                  Add Item
                </Button>
              </Box>

              {selectedList.description && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {selectedList.description}
                </Typography>
              )}

              <Box display="flex" gap={2} my={2}>
                <TextField
                  size="small"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                <Tabs
                  value={itemFilter}
                  onChange={(_, value) => setItemFilter(value)}
                  sx={{ minHeight: "auto" }}
                >
                  <Tab label="All" value="all" />
                  <Tab label="Active" value="active" />
                  <Tab label="Completed" value="completed" />
                </Tabs>
              </Box>

              {filteredItems.length === 0 ? (
                <EmptyState
                  icon={<CheckCircleIcon sx={{ fontSize: 64, color: "text.secondary" }} />}
                  title="No Items"
                  description={
                    itemFilter === "all"
                      ? "Add your first todo item to get started"
                      : `No ${itemFilter} items`
                  }
                  action={
                    itemFilter === "all" && (
                      <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateItemDialog}>
                        Add Item
                      </Button>
                    )
                  }
                />
              ) : (
                <List>
                  {filteredItems.map((item) => (
                    <ListItem
                      key={item.id}
                      disablePadding
                      secondaryAction={
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemButton>
                        <ListItemIcon>
                          <Checkbox
                            checked={item.completed}
                            onChange={() => handleToggleItem(item.id)}
                            icon={<RadioButtonUncheckedIcon />}
                            checkedIcon={<CheckCircleIcon />}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography
                                sx={{
                                  textDecoration: item.completed ? "line-through" : "none",
                                  opacity: item.completed ? 0.6 : 1,
                                }}
                              >
                                {item.title}
                              </Typography>
                              {item.priority && (
                                <Chip
                                  label={item.priority}
                                  size="small"
                                  color={getPriorityColor(item.priority) as any}
                                />
                              )}
                              {item.dueDate && (
                                <Chip
                                  icon={<CalendarIcon />}
                                  label={formatDate(item.dueDate)}
                                  size="small"
                                  variant="outlined"
                                  color={isOverdue(item.dueDate) ? "error" : "default"}
                                />
                              )}
                            </Box>
                          }
                          secondary={item.description}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          ) : (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <EmptyState
                icon={<ListIcon sx={{ fontSize: 64, color: "text.secondary" }} />}
                title="Select a List"
                description="Select a todo list from the sidebar to view and manage items"
              />
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Create/Edit List Dialog */}
      <Dialog open={listDialogOpen} onClose={() => setListDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{menuList ? "Edit List" : "Create New List"}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="List Name"
            fullWidth
            required
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={listDescription}
            onChange={(e) => setListDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <IconAutocomplete
            value={listIcon}
            onChange={setListIcon}
            label="Icon"
            helperText="Optional: Choose an icon for this list"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setListDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={menuList ? handleUpdateList : handleCreateList}
            variant="contained"
            disabled={!listName.trim()}
          >
            {menuList ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Item Dialog */}
      <Dialog open={itemDialogOpen} onClose={() => setItemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Todo Item</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            required
            value={itemTitle}
            onChange={(e) => setItemTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Due Date"
            fullWidth
            type="datetime-local"
            value={itemDueDate}
            onChange={(e) => setItemDueDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={itemPriority}
              label="Priority"
              onChange={(e) => setItemPriority(e.target.value as any)}
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateItem}
            variant="contained"
            disabled={!itemTitle.trim()}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* List Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={() => {
          if (menuList) {
            openEditListDialog(menuList);
            handleMenuClose();
          }
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          if (menuList) {
            handleDeleteList(menuList.id);
            handleMenuClose();
          }
        }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        message={snackbar.message}
      />
    </Box>
  );
}
