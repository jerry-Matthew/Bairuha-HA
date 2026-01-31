/**
 * Command Registry
 * 
 * Backend-owned registry for managing command intent records.
 * Commands represent user intent only - they are never executed by this system.
 * 
 * Architectural Rules (STRICT):
 * - Commands do NOT update entity state directly
 * - Commands are auditable and persistent
 * - Commands are write-only intent artifacts
 * - Command status is immutable (always 'pending')
 * - No execution, no delivery, no acknowledgements
 */

import { query } from "@/lib/db";

export interface Command {
  id: string;
  entityId: string;
  command: string; // e.g., "turn_on", "turn_off", "set_value"
  payload: Record<string, any>;
  status: 'pending'; // Status is locked to 'pending' - commands are intent-only
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommandParams {
  entityId: string; // Entity UUID
  command: string; // Command name
  payload?: Record<string, any>; // Command parameters
}

/**
 * Create a new command intent record
 * Commands are created with status 'pending' and remain immutable.
 * Commands represent user intent only - they are never executed by this system.
 */
export async function createCommand(params: CreateCommandParams): Promise<Command> {
  const { entityId, command, payload = {} } = params;
  const now = new Date().toISOString();
  
  const result = await query<{ id: string }>(
    `INSERT INTO commands (entity_id, command, payload, status, created_at, updated_at)
     VALUES ($1, $2, $3::jsonb, 'pending', $4, $4)
     RETURNING id`,
    [entityId, command, JSON.stringify(payload), now]
  );
  
  if (result.length === 0) {
    throw new Error("Failed to create command");
  }
  
  const created = await getCommandById(result[0].id);
  if (!created) {
    throw new Error("Failed to retrieve created command");
  }
  
  return created;
}

/**
 * Get command by ID
 */
export async function getCommandById(id: string): Promise<Command | null> {
  const rows = await query<Command>(
    `SELECT 
      id,
      entity_id as "entityId",
      command,
      payload,
      status,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM commands
    WHERE id = $1`,
    [id]
  );
  
  if (rows.length === 0) {
    return null;
  }
  
  const row = rows[0];
  return {
    ...row,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {}),
    status: 'pending' as const // Status is always 'pending' - commands are intent-only
  };
}

// Execution lifecycle functions removed:
// - markCommandAsSent: Commands are never dispatched
// - acknowledgeCommand: Commands are never acknowledged
// Commands are intent-only records with immutable status.

/**
 * Get commands by entity ID
 * Useful for debugging and auditing intent records
 */
export async function getCommandsByEntity(entityId: string): Promise<Command[]> {
  const rows = await query<Command>(
    `SELECT 
      id,
      entity_id as "entityId",
      command,
      payload,
      status,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM commands
    WHERE entity_id = $1
    ORDER BY created_at DESC`,
    [entityId]
  );
  
  return rows.map(row => ({
    ...row,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {}),
    status: 'pending' as const // Status is always 'pending' - commands are intent-only
  }));
}
