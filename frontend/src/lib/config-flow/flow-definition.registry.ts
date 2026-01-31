/**
 * Flow Definition Registry
 * 
 * Service layer for managing flow definitions stored in integration_flow_definitions table
 * Provides CRUD operations, versioning, and activation management
 */

import { query } from "@/lib/db";
import type {
  FlowDefinition,
  FlowDefinitionRecord,
  CreateFlowDefinitionInput,
  UpdateFlowDefinitionInput,
  FlowDefinitionFilters,
} from "./flow-definition.types";
import { validateFlowDefinition } from "./flow-definition.validator";
import type { FlowType } from "./flow-type-resolver";

/**
 * Create a new flow definition
 */
export async function createFlowDefinition(
  input: CreateFlowDefinitionInput
): Promise<FlowDefinitionRecord> {
  // Validate the flow definition
  const validation = validateFlowDefinition(input.definition);
  if (!validation.valid) {
    throw new Error(`Invalid flow definition: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  // If is_active is true, deactivate other active definitions for this domain
  if (input.is_active !== false) {
    await query(
      `UPDATE integration_flow_definitions 
       SET is_active = false, updated_at = NOW()
       WHERE integration_domain = $1 AND is_active = true`,
      [input.integration_domain]
    );
  }

  // Get next version number
  const versionRows = await query<{ max_version: number }>(
    `SELECT COALESCE(MAX(version), 0) as max_version 
     FROM integration_flow_definitions 
     WHERE integration_domain = $1`,
    [input.integration_domain]
  );
  const nextVersion = (versionRows && versionRows.length > 0 && versionRows[0]?.max_version ? versionRows[0].max_version : 0) + 1;

  // Insert new flow definition
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await query(
    `INSERT INTO integration_flow_definitions (
      id, integration_domain, version, flow_type, definition,
      handler_class, handler_config, is_active, is_default,
      description, created_by, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      id,
      input.integration_domain,
      nextVersion,
      input.flow_type,
      JSON.stringify(input.definition),
      input.handler_class || null,
      input.handler_config ? JSON.stringify(input.handler_config) : null,
      input.is_active !== false, // Default to true
      input.is_default || false,
      input.description || null,
      input.created_by || 'system',
      now,
      now,
    ]
  );

  const created = await getFlowDefinitionById(id);
  if (!created) {
    throw new Error("Failed to create flow definition");
  }

  return created;
}

/**
 * Get flow definition by ID
 */
export async function getFlowDefinitionById(id: string): Promise<FlowDefinitionRecord | null> {
  const rows = await query<any>(
    `SELECT 
      id,
      integration_domain as "integrationDomain",
      version,
      flow_type as "flowType",
      definition,
      handler_class as "handlerClass",
      handler_config as "handlerConfig",
      is_active as "isActive",
      is_default as "isDefault",
      description,
      created_by as "createdBy",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM integration_flow_definitions
    WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  return mapRowToFlowDefinitionRecord(rows[0]);
}

/**
 * Get active flow definition for a domain
 */
export async function getActiveFlowDefinition(domain: string): Promise<FlowDefinitionRecord | null> {
  const rows = await query<any>(
    `SELECT 
      id,
      integration_domain as "integrationDomain",
      version,
      flow_type as "flowType",
      definition,
      handler_class as "handlerClass",
      handler_config as "handlerConfig",
      is_active as "isActive",
      is_default as "isDefault",
      description,
      created_by as "createdBy",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM integration_flow_definitions
    WHERE integration_domain = $1 AND is_active = true
    ORDER BY version DESC
    LIMIT 1`,
    [domain]
  );

  if (rows.length === 0) {
    return null;
  }

  return mapRowToFlowDefinitionRecord(rows[0]);
}

/**
 * Get flow definition for a domain (active or default)
 */
export async function getFlowDefinition(
  domain: string,
  version?: number
): Promise<FlowDefinitionRecord | null> {
  if (version !== undefined) {
    // Get specific version
    const rows = await query<any>(
      `SELECT 
        id,
        integration_domain as "integrationDomain",
        version,
        flow_type as "flowType",
        definition,
        handler_class as "handlerClass",
        handler_config as "handlerConfig",
        is_active as "isActive",
        is_default as "isDefault",
        description,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM integration_flow_definitions
      WHERE integration_domain = $1 AND version = $2
      LIMIT 1`,
      [domain, version]
    );

    if (rows.length === 0) {
      return null;
    }

    return mapRowToFlowDefinitionRecord(rows[0]);
  }

  // Get active, fallback to default
  const active = await getActiveFlowDefinition(domain);
  if (active) {
    return active;
  }

  // Fallback to default
  const rows = await query<any>(
    `SELECT 
      id,
      integration_domain as "integrationDomain",
      version,
      flow_type as "flowType",
      definition,
      handler_class as "handlerClass",
      handler_config as "handlerConfig",
      is_active as "isActive",
      is_default as "isDefault",
      description,
      created_by as "createdBy",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM integration_flow_definitions
    WHERE integration_domain = $1 AND is_default = true
    ORDER BY version DESC
    LIMIT 1`,
    [domain]
  );

  if (rows.length === 0) {
    return null;
  }

  return mapRowToFlowDefinitionRecord(rows[0]);
}

/**
 * Get all versions for a domain
 */
export async function getFlowDefinitionVersions(domain: string): Promise<FlowDefinitionRecord[]> {
  const rows = await query<any>(
    `SELECT 
      id,
      integration_domain as "integrationDomain",
      version,
      flow_type as "flowType",
      definition,
      handler_class as "handlerClass",
      handler_config as "handlerConfig",
      is_active as "isActive",
      is_default as "isDefault",
      description,
      created_by as "createdBy",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM integration_flow_definitions
    WHERE integration_domain = $1
    ORDER BY version DESC`,
    [domain]
  );

  return rows.map(mapRowToFlowDefinitionRecord);
}

/**
 * Update flow definition
 */
export async function updateFlowDefinition(
  id: string,
  updates: UpdateFlowDefinitionInput
): Promise<FlowDefinitionRecord> {
  const existing = await getFlowDefinitionById(id);
  if (!existing) {
    throw new Error(`Flow definition not found: ${id}`);
  }

  // Validate definition if provided
  if (updates.definition) {
    const validation = validateFlowDefinition(updates.definition);
    if (!validation.valid) {
      throw new Error(`Invalid flow definition: ${validation.errors.map(e => e.message).join(', ')}`);
    }
  }

  // Build update query dynamically
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  let paramIndex = 1;

  if (updates.definition !== undefined) {
    updateFields.push(`definition = $${paramIndex++}`);
    updateValues.push(JSON.stringify(updates.definition));
  }

  if (updates.handler_class !== undefined) {
    updateFields.push(`handler_class = $${paramIndex++}`);
    updateValues.push(updates.handler_class || null);
  }

  if (updates.handler_config !== undefined) {
    updateFields.push(`handler_config = $${paramIndex++}`);
    updateValues.push(updates.handler_config ? JSON.stringify(updates.handler_config) : null);
  }

  if (updates.description !== undefined) {
    updateFields.push(`description = $${paramIndex++}`);
    updateValues.push(updates.description || null);
  }

  if (updates.is_active !== undefined) {
    updateFields.push(`is_active = $${paramIndex++}`);
    updateValues.push(updates.is_active);

    // If activating, deactivate others
    if (updates.is_active) {
      await query(
        `UPDATE integration_flow_definitions 
         SET is_active = false, updated_at = NOW()
         WHERE integration_domain = $1 AND is_active = true AND id != $2`,
        [existing.integration_domain, id]
      );
    }
  }

  if (updates.is_default !== undefined) {
    updateFields.push(`is_default = $${paramIndex++}`);
    updateValues.push(updates.is_default);
  }

  if (updateFields.length === 0) {
    return existing; // No updates
  }

  updateFields.push(`updated_at = NOW()`);
  updateValues.push(id);

  await query(
    `UPDATE integration_flow_definitions 
     SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex}`,
    updateValues
  );

  const updated = await getFlowDefinitionById(id);
  if (!updated) {
    throw new Error("Failed to update flow definition");
  }

  return updated;
}

/**
 * Activate a specific flow definition version
 */
export async function activateFlowDefinition(id: string): Promise<FlowDefinitionRecord> {
  const definition = await getFlowDefinitionById(id);
  if (!definition) {
    throw new Error(`Flow definition not found: ${id}`);
  }

  // Deactivate all other versions for this domain
  await query(
    `UPDATE integration_flow_definitions 
     SET is_active = false, updated_at = NOW()
     WHERE integration_domain = $1 AND is_active = true AND id != $2`,
    [definition.integration_domain, id]
  );

  // Activate this version
  return await updateFlowDefinition(id, { is_active: true });
}

/**
 * Deactivate a flow definition
 */
export async function deactivateFlowDefinition(id: string): Promise<FlowDefinitionRecord> {
  return await updateFlowDefinition(id, { is_active: false });
}

/**
 * Delete a flow definition
 */
export async function deleteFlowDefinition(id: string): Promise<void> {
  const result = await query(
    `DELETE FROM integration_flow_definitions WHERE id = $1`,
    [id]
  );

  if (!result || (result as any).rowCount === 0) {
    throw new Error(`Flow definition not found: ${id}`);
  }
}

/**
 * List flow definitions with filtering
 */
export async function listFlowDefinitions(
  filters: FlowDefinitionFilters = {},
  options: { page?: number; limit?: number; sort?: string; order?: 'asc' | 'desc' } = {}
): Promise<{ definitions: FlowDefinitionRecord[]; total: number; page: number; limit: number; totalPages: number }> {
  const page = options.page || 1;
  const limit = options.limit || 50;
  const sort = options.sort || 'created_at';
  const order = options.order || 'desc';
  const offset = (page - 1) * limit;

  // Build WHERE clause
  const whereConditions: string[] = [];
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (filters.domain) {
    whereConditions.push(`integration_domain = $${paramIndex++}`);
    queryParams.push(filters.domain);
  }

  if (filters.flow_type) {
    whereConditions.push(`flow_type = $${paramIndex++}`);
    queryParams.push(filters.flow_type);
  }

  if (filters.is_active !== undefined) {
    whereConditions.push(`is_active = $${paramIndex++}`);
    queryParams.push(filters.is_active);
  }

  if (filters.is_default !== undefined) {
    whereConditions.push(`is_default = $${paramIndex++}`);
    queryParams.push(filters.is_default);
  }

  if (filters.version !== undefined) {
    whereConditions.push(`version = $${paramIndex++}`);
    queryParams.push(filters.version);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Get total count
  const countRows = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM integration_flow_definitions ${whereClause}`,
    queryParams
  );
  const total = countRows && countRows.length > 0 ? parseInt(countRows[0]?.count || '0', 10) : 0;
  const totalPages = Math.ceil(total / limit);

  // Get definitions
  const rows = await query<any>(
    `SELECT 
      id,
      integration_domain as "integrationDomain",
      version,
      flow_type as "flowType",
      definition,
      handler_class as "handlerClass",
      handler_config as "handlerConfig",
      is_active as "isActive",
      is_default as "isDefault",
      description,
      created_by as "createdBy",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM integration_flow_definitions
    ${whereClause}
    ORDER BY ${sort} ${order}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...queryParams, limit, offset]
  );

  return {
    definitions: rows.map(mapRowToFlowDefinitionRecord),
    total,
    page,
    limit,
    totalPages,
  };
}

/**
 * Map database row to FlowDefinitionRecord
 */
function mapRowToFlowDefinitionRecord(row: any): FlowDefinitionRecord {
  return {
    id: row.id,
    integration_domain: row.integrationDomain,
    version: row.version,
    flow_type: row.flowType,
    definition: typeof row.definition === 'string' ? JSON.parse(row.definition) : row.definition,
    handler_class: row.handlerClass,
    handler_config: row.handlerConfig
      ? typeof row.handlerConfig === 'string'
        ? JSON.parse(row.handlerConfig)
        : row.handlerConfig
      : null,
    is_active: row.isActive,
    is_default: row.isDefault,
    description: row.description,
    created_by: row.createdBy,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}
