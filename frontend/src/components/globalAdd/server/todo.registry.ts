/**
 * Todo Registry
 * 
 * Backend-owned registry for managing todo lists and items
 * Users can create, manage, and track tasks within the smart home interface
 */

import { query } from "@/lib/db";

export interface TodoList {
  id: string;
  userId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  itemCount?: number; // Computed field
  completedItemCount?: number; // Computed field
}

export interface TodoItem {
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

/**
 * Get all todo lists for a user
 */
export async function getAllTodoLists(userId: string, includeItems: boolean = false): Promise<TodoList[]> {
  const lists = await query<TodoList>(
    `SELECT 
      id,
      user_id as "userId",
      name,
      description,
      icon,
      color,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM todo_lists
    WHERE user_id = $1
    ORDER BY name ASC`,
    [userId]
  );

  // Calculate item counts
  for (const list of lists) {
    const countResult = await query<{ total: string; completed: string }>(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE completed = true) as completed
      FROM todo_items
      WHERE list_id = $1`,
      [list.id]
    );
    list.itemCount = parseInt(countResult[0]?.total || '0', 10);
    list.completedItemCount = parseInt(countResult[0]?.completed || '0', 10);
  }

  return lists;
}

/**
 * Get todo list by ID
 */
export async function getTodoListById(listId: string, includeItems: boolean = false): Promise<TodoList | null> {
  const rows = await query<TodoList>(
    `SELECT 
      id,
      user_id as "userId",
      name,
      description,
      icon,
      color,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM todo_lists
    WHERE id = $1`,
    [listId]
  );

  if (rows.length === 0) {
    return null;
  }

  const list = rows[0];

  // Calculate item counts
  const countResult = await query<{ total: string; completed: string }>(
    `SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE completed = true) as completed
    FROM todo_items
    WHERE list_id = $1`,
    [listId]
  );
  list.itemCount = parseInt(countResult[0]?.total || '0', 10);
  list.completedItemCount = parseInt(countResult[0]?.completed || '0', 10);

  return list;
}

/**
 * Create a new todo list
 */
export async function createTodoList(data: {
  userId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}): Promise<TodoList> {
  const result = await query<TodoList>(
    `INSERT INTO todo_lists (user_id, name, description, icon, color)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING 
       id,
       user_id as "userId",
       name,
       description,
       icon,
       color,
       created_at as "createdAt",
       updated_at as "updatedAt"`,
    [data.userId, data.name, data.description || null, data.icon || null, data.color || null]
  );

  const list = result[0];
  list.itemCount = 0;
  list.completedItemCount = 0;

  return list;
}

/**
 * Update todo list metadata
 */
export async function updateTodoList(listId: string, data: {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}): Promise<TodoList> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.icon !== undefined) {
    updates.push(`icon = $${paramIndex++}`);
    values.push(data.icon);
  }
  if (data.color !== undefined) {
    updates.push(`color = $${paramIndex++}`);
    values.push(data.color);
  }

  if (updates.length === 0) {
    // No updates, just return existing list
    const list = await getTodoListById(listId);
    if (!list) {
      throw new Error(`Todo list not found: ${listId}`);
    }
    return list;
  }

  values.push(listId);

  const result = await query<TodoList>(
    `UPDATE todo_lists
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING 
       id,
       user_id as "userId",
       name,
       description,
       icon,
       color,
       created_at as "createdAt",
       updated_at as "updatedAt"`,
    values
  );

  if (result.length === 0) {
    throw new Error(`Todo list not found: ${listId}`);
  }

  const list = result[0];

  // Calculate item counts
  const countResult = await query<{ total: string; completed: string }>(
    `SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE completed = true) as completed
    FROM todo_items
    WHERE list_id = $1`,
    [listId]
  );
  list.itemCount = parseInt(countResult[0]?.total || '0', 10);
  list.completedItemCount = parseInt(countResult[0]?.completed || '0', 10);

  return list;
}

/**
 * Delete a todo list
 */
export async function deleteTodoList(listId: string): Promise<void> {
  // Cascade delete will handle todo_items
  await query(
    `DELETE FROM todo_lists WHERE id = $1`,
    [listId]
  );
}

/**
 * Get all todo items for a list
 */
export async function getTodoItemsByListId(listId: string, completed?: boolean): Promise<TodoItem[]> {
  let queryStr = `SELECT 
      id,
      list_id as "listId",
      title,
      description,
      completed,
      due_date as "dueDate",
      priority,
      "order",
      created_at as "createdAt",
      updated_at as "updatedAt",
      completed_at as "completedAt"
    FROM todo_items
    WHERE list_id = $1`;

  const params: any[] = [listId];

  if (completed !== undefined) {
    queryStr += ` AND completed = $2`;
    params.push(completed);
  }

  queryStr += ` ORDER BY "order" ASC, created_at ASC`;

  const items = await query<TodoItem>(queryStr, params);
  
  // Convert dates to ISO strings (handle both Date objects and strings)
  return items.map(item => ({
    ...item,
    dueDate: item.dueDate ? (item.dueDate instanceof Date ? item.dueDate.toISOString() : new Date(item.dueDate).toISOString()) : undefined,
    completedAt: item.completedAt ? (item.completedAt instanceof Date ? item.completedAt.toISOString() : new Date(item.completedAt).toISOString()) : undefined,
  }));
}

/**
 * Get todo item by ID
 */
export async function getTodoItemById(itemId: string): Promise<TodoItem | null> {
  const rows = await query<TodoItem>(
    `SELECT 
      id,
      list_id as "listId",
      title,
      description,
      completed,
      due_date as "dueDate",
      priority,
      "order",
      created_at as "createdAt",
      updated_at as "updatedAt",
      completed_at as "completedAt"
    FROM todo_items
    WHERE id = $1`,
    [itemId]
  );

  if (rows.length === 0) {
    return null;
  }

  const item = rows[0];
  
  // Convert dates to ISO strings (handle both Date objects and strings)
  return {
    ...item,
    dueDate: item.dueDate ? (item.dueDate instanceof Date ? item.dueDate.toISOString() : new Date(item.dueDate).toISOString()) : undefined,
    completedAt: item.completedAt ? (item.completedAt instanceof Date ? item.completedAt.toISOString() : new Date(item.completedAt).toISOString()) : undefined,
  };
}

/**
 * Create a new todo item
 */
export async function createTodoItem(data: {
  listId: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  order?: number;
}): Promise<TodoItem> {
  // Get current max order if not provided
  let order = data.order;
  if (order === undefined) {
    const maxOrderResult = await query<{ max: number }>(
      `SELECT COALESCE(MAX("order"), 0) as max FROM todo_items WHERE list_id = $1`,
      [data.listId]
    );
    order = (maxOrderResult[0]?.max || 0) + 1;
  }

  const result = await query<TodoItem>(
    `INSERT INTO todo_items (list_id, title, description, due_date, priority, "order")
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING 
       id,
       list_id as "listId",
       title,
       description,
       completed,
       due_date as "dueDate",
       priority,
       "order",
       created_at as "createdAt",
       updated_at as "updatedAt",
       completed_at as "completedAt"`,
    [
      data.listId,
      data.title,
      data.description || null,
      data.dueDate ? new Date(data.dueDate).toISOString() : null,
      data.priority || null,
      order
    ]
  );

  const item = result[0];
  
  // Convert dates to ISO strings (handle both Date objects and strings)
  return {
    ...item,
    dueDate: item.dueDate ? (item.dueDate instanceof Date ? item.dueDate.toISOString() : new Date(item.dueDate).toISOString()) : undefined,
    completedAt: item.completedAt ? (item.completedAt instanceof Date ? item.completedAt.toISOString() : new Date(item.completedAt).toISOString()) : undefined,
  };
}

/**
 * Update todo item
 */
export async function updateTodoItem(itemId: string, data: {
  title?: string;
  description?: string;
  completed?: boolean;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  order?: number;
}): Promise<TodoItem> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.completed !== undefined) {
    updates.push(`completed = $${paramIndex++}`);
    values.push(data.completed);
  }
  if (data.dueDate !== undefined) {
    updates.push(`due_date = $${paramIndex++}`);
    values.push(data.dueDate ? new Date(data.dueDate).toISOString() : null);
  }
  if (data.priority !== undefined) {
    updates.push(`priority = $${paramIndex++}`);
    values.push(data.priority || null);
  }
  if (data.order !== undefined) {
    updates.push(`"order" = $${paramIndex++}`);
    values.push(data.order);
  }

  if (updates.length === 0) {
    // No updates, just return existing item
    const item = await getTodoItemById(itemId);
    if (!item) {
      throw new Error(`Todo item not found: ${itemId}`);
    }
    return item;
  }

  values.push(itemId);

  const result = await query<TodoItem>(
    `UPDATE todo_items
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING 
       id,
       list_id as "listId",
       title,
       description,
       completed,
       due_date as "dueDate",
       priority,
       "order",
       created_at as "createdAt",
       updated_at as "updatedAt",
       completed_at as "completedAt"`,
    values
  );

  if (result.length === 0) {
    throw new Error(`Todo item not found: ${itemId}`);
  }

  const item = result[0];
  
  // Convert dates to ISO strings (handle both Date objects and strings)
  return {
    ...item,
    dueDate: item.dueDate ? (item.dueDate instanceof Date ? item.dueDate.toISOString() : new Date(item.dueDate).toISOString()) : undefined,
    completedAt: item.completedAt ? (item.completedAt instanceof Date ? item.completedAt.toISOString() : new Date(item.completedAt).toISOString()) : undefined,
  };
}

/**
 * Delete a todo item
 */
export async function deleteTodoItem(itemId: string): Promise<void> {
  await query(
    `DELETE FROM todo_items WHERE id = $1`,
    [itemId]
  );
}

/**
 * Toggle todo item completion status
 */
export async function toggleTodoItem(itemId: string): Promise<TodoItem> {
  const item = await getTodoItemById(itemId);
  if (!item) {
    throw new Error(`Todo item not found: ${itemId}`);
  }

  return updateTodoItem(itemId, { completed: !item.completed });
}

/**
 * Reorder todo items in a list
 */
export async function reorderTodoItems(listId: string, itemIds: string[]): Promise<void> {
  // Use a transaction to update all orders
  for (let i = 0; i < itemIds.length; i++) {
    await query(
      `UPDATE todo_items SET "order" = $1 WHERE id = $2 AND list_id = $3`,
      [i + 1, itemIds[i], listId]
    );
  }
}
