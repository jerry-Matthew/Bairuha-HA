/**
 * Area Registry
 * 
 * Backend-owned registry for managing areas (rooms, zones, etc.)
 */

import { query } from "@/lib/db";
import type { Area } from "./registries.types";

/**
 * Get all areas
 */
export async function getAllAreas(): Promise<Area[]> {
  const rows = await query<Area>(
    `SELECT id, name, icon, created_at, updated_at
     FROM areas
     ORDER BY name ASC`
  );
  return rows;
}

/**
 * Get area by ID
 */
export async function getAreaById(id: string): Promise<Area | null> {
  const rows = await query<Area>(
    `SELECT id, name, icon, created_at, updated_at
     FROM areas
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Get area by name (case-insensitive)
 */
export async function getAreaByName(name: string): Promise<Area | null> {
  const rows = await query<Area>(
    `SELECT id, name, icon, created_at, updated_at
     FROM areas
     WHERE LOWER(name) = LOWER($1)`,
    [name]
  );
  return rows[0] || null;
}

/**
 * Create a new area
 */
export async function createArea(area: Omit<Area, "id" | "created_at" | "updated_at">): Promise<Area> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await query(
    `INSERT INTO areas (id, name, icon, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, area.name, area.icon || null, now, now]
  );

  const created = await getAreaById(id);
  if (!created) {
    throw new Error("Failed to create area");
  }
  return created;
}

/**
 * Update area
 */
export async function updateArea(id: string, updates: Partial<Area>): Promise<Area> {
  const updatesList: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    updatesList.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.icon !== undefined) {
    updatesList.push(`icon = $${paramIndex++}`);
    values.push(updates.icon);
  }

  updatesList.push(`updated_at = $${paramIndex++}`);
  values.push(new Date().toISOString());
  values.push(id);

  if (updatesList.length > 1) {
    await query(
      `UPDATE areas SET ${updatesList.join(", ")} WHERE id = $${paramIndex}`,
      values
    );
  }

  const updated = await getAreaById(id);
  if (!updated) {
    throw new Error("Area not found");
  }
  return updated;
}

/**
 * Delete area
 */
export async function deleteArea(id: string): Promise<void> {
  await query("DELETE FROM areas WHERE id = $1", [id]);
}

