/**
 * Config Flow Registry
 * 
 * Backend-owned registry for managing persistent config flows
 * Flows are stored in the database instead of in-memory to survive reloads
 * This follows Home Assistant's pattern of persistent config flows
 */

import { query } from "@/lib/db";
import type { DeviceSetupFlow, FlowStep } from "./device.types";

export interface ConfigFlow {
  id: string;
  userId?: string | null;
  integrationDomain?: string | null;
  step: FlowStep;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlowInput {
  userId?: string | null;
  integrationDomain?: string | null;
  step: FlowStep;
  data?: Record<string, any>;
}

export interface UpdateFlowInput {
  integrationDomain?: string | null;
  step?: FlowStep;
  data?: Record<string, any>;
}

/**
 * Create a new config flow
 */
export async function createFlow(input: CreateFlowInput): Promise<ConfigFlow> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const data = input.data || {};

  await query(
    `INSERT INTO config_flows (
      id, user_id, integration_domain, step, data, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      input.userId || null,
      input.integrationDomain || null,
      input.step,
      JSON.stringify(data),
      now,
      now,
    ]
  );

  const created = await getFlowById(id);
  if (!created) {
    throw new Error("Failed to create config flow");
  }
  return created;
}

/**
 * Get flow by ID
 */
export async function getFlowById(id: string): Promise<ConfigFlow | null> {
  const rows = await query<any>(
    `SELECT 
      id,
      user_id as "userId",
      integration_domain as "integrationDomain",
      step,
      data,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM config_flows
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
  };
}

/**
 * Update flow step
 */
export async function updateFlowStep(id: string, step: FlowStep): Promise<ConfigFlow> {
  const existing = await getFlowById(id);
  if (!existing) {
    throw new Error("Config flow not found");
  }

  const now = new Date().toISOString();
  await query(
    `UPDATE config_flows
     SET step = $1, updated_at = $2
     WHERE id = $3`,
    [step, now, id]
  );

  const updated = await getFlowById(id);
  if (!updated) {
    throw new Error("Failed to update config flow");
  }
  return updated;
}

/**
 * Update flow data
 */
export async function updateFlowData(id: string, data: Record<string, any>): Promise<ConfigFlow> {
  const existing = await getFlowById(id);
  if (!existing) {
    throw new Error("Config flow not found");
  }

  // Merge with existing data
  const mergedData = { ...existing.data, ...data };
  const now = new Date().toISOString();

  await query(
    `UPDATE config_flows
     SET data = $1, updated_at = $2
     WHERE id = $3`,
    [JSON.stringify(mergedData), now, id]
  );

  const updated = await getFlowById(id);
  if (!updated) {
    throw new Error("Failed to update config flow");
  }
  return updated;
}

/**
 * Update flow (step and/or data and/or integration domain)
 */
export async function updateFlow(id: string, input: UpdateFlowInput): Promise<ConfigFlow> {
  const existing = await getFlowById(id);
  if (!existing) {
    throw new Error("Config flow not found");
  }

  const updates: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (input.step !== undefined) {
    updates.push(`step = $${paramIndex++}`);
    params.push(input.step);
  }

  if (input.integrationDomain !== undefined) {
    updates.push(`integration_domain = $${paramIndex++}`);
    params.push(input.integrationDomain || null);
  }

  if (input.data !== undefined) {
    // Merge with existing data
    const mergedData = { ...existing.data, ...input.data };
    updates.push(`data = $${paramIndex++}`);
    params.push(JSON.stringify(mergedData));
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push(`updated_at = $${paramIndex++}`);
  params.push(new Date().toISOString());
  params.push(id);

  await query(
    `UPDATE config_flows
     SET ${updates.join(", ")}
     WHERE id = $${paramIndex}`,
    params
  );

  const updated = await getFlowById(id);
  if (!updated) {
    throw new Error("Failed to update config flow");
  }
  return updated;
}

/**
 * Delete flow
 */
export async function deleteFlow(id: string): Promise<void> {
  const result = await query(
    `DELETE FROM config_flows WHERE id = $1`,
    [id]
  );

  // Check if any row was deleted
  if (result.rowCount === 0) {
    throw new Error("Config flow not found");
  }
}
