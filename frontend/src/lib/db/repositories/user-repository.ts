/**
 * User Repository
 * Handles all database operations for users
 */

import { query } from "@/lib/db";

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  name?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  password_hash: string;
  name?: string;
}

export class UserRepository {
  /**
   * Find user by email (case-insensitive)
   */
  async findByEmail(email: string): Promise<UserRecord | null> {
    const rows = await query<UserRecord>(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email]
    );
    return rows[0] || null;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserRecord | null> {
    const rows = await query<UserRecord>(
      "SELECT * FROM users WHERE id = $1 LIMIT 1",
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserData): Promise<UserRecord> {
    const rows = await query<UserRecord>(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.email, data.password_hash, data.name || null]
    );
    return rows[0];
  }

  /**
   * Update user
   */
  async update(id: string, updates: Partial<UserRecord>): Promise<UserRecord> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }
    if (updates.password_hash !== undefined) {
      fields.push(`password_hash = $${paramIndex++}`);
      values.push(updates.password_hash);
    }
    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(updates.is_active);
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    values.push(id);
    const rows = await query<UserRecord>(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return rows[0];
  }

  /**
   * Deactivate user
   */
  async deactivate(id: string): Promise<void> {
    await query("UPDATE users SET is_active = false WHERE id = $1", [id]);
  }
}

export const userRepository = new UserRepository();

