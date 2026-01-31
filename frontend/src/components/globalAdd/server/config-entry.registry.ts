/**
 * Config Entry Registry
 * 
 * Backend-owned registry for managing integration configuration entries
 * Config entries store integration configuration separately from integration metadata
 * This follows Home Assistant's pattern of separating config from integration registry
 */

import { query } from "@/lib/db";

export interface ConfigEntry {
  id: string;
  integrationDomain: string;
  title: string;
  data: Record<string, any>;
  options?: Record<string, any>;
  status: "loaded" | "setup" | "error";
  createdAt: string;
  updatedAt: string;
}

export interface CreateConfigEntryInput {
  integrationDomain: string;
  title: string;
  data: Record<string, any>;
  options?: Record<string, any>;
  status?: "loaded" | "setup" | "error";
}

export interface UpdateConfigEntryInput {
  title?: string;
  data?: Record<string, any>;
  options?: Record<string, any>;
  status?: "loaded" | "setup" | "error";
}

/**
 * Create a new config entry
 */
export async function createConfigEntry(input: CreateConfigEntryInput): Promise<ConfigEntry> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const status = input.status || "loaded";

  await query(
    `INSERT INTO config_entries (
      id, integration_domain, title, data, options, status, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      input.integrationDomain,
      input.title,
      JSON.stringify(input.data),
      input.options ? JSON.stringify(input.options) : JSON.stringify({}),
      status,
      now,
      now,
    ]
  );

  const created = await getConfigEntryById(id);
  if (!created) {
    throw new Error("Failed to create config entry");
  }
  return created;
}

/**
 * Get all config entries
 */
export async function getConfigEntries(integrationDomain?: string): Promise<ConfigEntry[]> {
  let sql = `
    SELECT 
      id,
      integration_domain as "integrationDomain",
      title,
      data,
      options,
      status,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM config_entries
  `;

  const params: any[] = [];

  if (integrationDomain) {
    sql += ` WHERE integration_domain = $1`;
    params.push(integrationDomain);
  }

  sql += ` ORDER BY created_at DESC`;

  const rows = await query<any>(sql, params);
  return rows.map((row) => ({
    ...row,
    data: typeof row.data === "string" ? JSON.parse(row.data) : (row.data || {}),
    options: typeof row.options === "string" ? JSON.parse(row.options) : (row.options || {}),
  }));
}

/**
 * Get config entry by ID
 */
export async function getConfigEntryById(id: string): Promise<ConfigEntry | null> {
  const rows = await query<any>(
    `SELECT 
      id,
      integration_domain as "integrationDomain",
      title,
      data,
      options,
      status,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM config_entries
    WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    ...row,
    data: typeof row.data === "string" ? JSON.parse(row.data) : (row.data || {}),
    options: typeof row.options === "string" ? JSON.parse(row.options) : (row.options || {}),
  };
}

/**
 * Get config entry by integration domain
 * Returns the most recent config entry for a given integration
 */
export async function getConfigEntryByIntegration(
  integrationDomain: string
): Promise<ConfigEntry | null> {
  const entries = await getConfigEntries(integrationDomain);
  return entries.length > 0 ? entries[0] : null;
}

/**
 * Update config entry
 */
export async function updateConfigEntry(
  id: string,
  input: UpdateConfigEntryInput
): Promise<ConfigEntry> {
  const existing = await getConfigEntryById(id);
  if (!existing) {
    throw new Error("Config entry not found");
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    params.push(input.title);
  }

  if (input.data !== undefined) {
    updates.push(`data = $${paramIndex++}`);
    params.push(JSON.stringify(input.data));
  }

  if (input.options !== undefined) {
    updates.push(`options = $${paramIndex++}`);
    params.push(JSON.stringify(input.options));
  }

  if (input.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(input.status);
  }

  if (updates.length === 0) {
    return existing;
  }

  params.push(id);

  await query(
    `UPDATE config_entries
     SET ${updates.join(", ")}
     WHERE id = $${paramIndex}`,
    params
  );

  const updated = await getConfigEntryById(id);
  if (!updated) {
    throw new Error("Failed to update config entry");
  }
  return updated;
}

/**
 * Delete config entry
 */
export async function deleteConfigEntry(id: string): Promise<void> {
  const result = await query(
    `DELETE FROM config_entries WHERE id = $1`,
    [id]
  );

  // Check if any row was deleted
  if (result.rowCount === 0) {
    throw new Error("Config entry not found");
  }
}
