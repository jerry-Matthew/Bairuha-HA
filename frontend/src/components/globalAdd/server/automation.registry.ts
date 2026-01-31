/**
 * Automation Registry
 * 
 * Backend-owned registry for managing automations
 */

import { query } from "@/lib/db";
import type { Automation } from "./registries.types";

/**
 * Get all automations
 */
export async function getAllAutomations(): Promise<Automation[]> {
  const rows = await query<any>(
    `SELECT id, name, description, enabled, trigger, condition, action, created_at, updated_at
     FROM automations
     ORDER BY created_at DESC`
  );
  // PostgreSQL JSONB columns are already parsed as objects
  return rows.map((row) => ({
    ...row,
    trigger: row.trigger || undefined,
    condition: row.condition || undefined,
    action: row.action || undefined,
  }));
}

/**
 * Get automation by ID
 */
export async function getAutomationById(id: string): Promise<Automation | null> {
  const rows = await query<any>(
    `SELECT id, name, description, enabled, trigger, condition, action, created_at, updated_at
     FROM automations
     WHERE id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    ...row,
    trigger: row.trigger || undefined,
    condition: row.condition || undefined,
    action: row.action || undefined,
  };
}

/**
 * Create a new automation
 */
export async function createAutomation(
  automation: Omit<Automation, "id" | "created_at" | "updated_at">
): Promise<Automation> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await query(
    `INSERT INTO automations (id, name, description, enabled, trigger, condition, action, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      automation.name,
      automation.description || null,
      automation.enabled ?? true,
      automation.trigger ? JSON.stringify(automation.trigger) : null,
      automation.condition ? JSON.stringify(automation.condition) : null,
      automation.action ? JSON.stringify(automation.action) : null,
      now,
      now,
    ]
  );

  const created = await getAutomationById(id);
  if (!created) {
    throw new Error("Failed to create automation");
  }
  return created;
}

/**
 * Update automation
 */
export async function updateAutomation(id: string, updates: Partial<Automation>): Promise<Automation> {
  const updatesList: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    updatesList.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    updatesList.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }
  if (updates.enabled !== undefined) {
    updatesList.push(`enabled = $${paramIndex++}`);
    values.push(updates.enabled);
  }
  if (updates.trigger !== undefined) {
    updatesList.push(`trigger = $${paramIndex++}`);
    values.push(updates.trigger ? JSON.stringify(updates.trigger) : null);
  }
  if (updates.condition !== undefined) {
    updatesList.push(`condition = $${paramIndex++}`);
    values.push(updates.condition ? JSON.stringify(updates.condition) : null);
  }
  if (updates.action !== undefined) {
    updatesList.push(`action = $${paramIndex++}`);
    values.push(updates.action ? JSON.stringify(updates.action) : null);
  }

  updatesList.push(`updated_at = $${paramIndex++}`);
  values.push(new Date().toISOString());
  values.push(id);

  if (updatesList.length > 1) {
    await query(
      `UPDATE automations SET ${updatesList.join(", ")} WHERE id = $${paramIndex}`,
      values
    );
  }

  const updated = await getAutomationById(id);
  if (!updated) {
    throw new Error("Automation not found");
  }
  // Ensure JSON fields are properly formatted
  return {
    ...updated,
    trigger: updated.trigger || undefined,
    condition: updated.condition || undefined,
    action: updated.action || undefined,
  };
}

/**
 * Delete automation
 */
export async function deleteAutomation(id: string): Promise<void> {
  await query("DELETE FROM automations WHERE id = $1", [id]);
}

