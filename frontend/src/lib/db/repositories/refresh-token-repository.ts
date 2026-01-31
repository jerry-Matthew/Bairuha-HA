/**
 * Refresh Token Repository
 * Handles all database operations for refresh tokens
 * IMPORTANT: Only stores hashed tokens, never plaintext
 */

import { query } from "@/lib/db";

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked: boolean;
  created_at: Date;
}

export interface CreateRefreshTokenData {
  user_id: string;
  token_hash: string;
  expires_at: Date;
}

export class RefreshTokenRepository {
  /**
   * Find refresh token by hash
   */
  async findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const rows = await query<RefreshTokenRecord>(
      `SELECT * FROM refresh_tokens 
       WHERE token_hash = $1 
       AND revoked = false 
       AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );
    return rows[0] || null;
  }

  /**
   * Find all active tokens for a user
   */
  async findByUserId(userId: string): Promise<RefreshTokenRecord[]> {
    return await query<RefreshTokenRecord>(
      `SELECT * FROM refresh_tokens 
       WHERE user_id = $1 
       AND revoked = false 
       AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  /**
   * Create a new refresh token
   */
  async create(data: CreateRefreshTokenData): Promise<RefreshTokenRecord> {
    const rows = await query<RefreshTokenRecord>(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.user_id, data.token_hash, data.expires_at]
    );
    return rows[0];
  }

  /**
   * Revoke a refresh token
   */
  async revoke(tokenHash: string): Promise<void> {
    await query(
      "UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1",
      [tokenHash]
    );
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await query(
      "UPDATE refresh_tokens SET revoked = true WHERE user_id = $1",
      [userId]
    );
  }

  /**
   * Delete expired tokens (cleanup job)
   */
  async deleteExpired(): Promise<number> {
    const result = await query(
      "DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = true"
    );
    return result.length;
  }

  /**
   * Rotate token: revoke old, create new
   */
  async rotate(
    oldTokenHash: string,
    newTokenData: CreateRefreshTokenData
  ): Promise<RefreshTokenRecord> {
    // Revoke old token
    await this.revoke(oldTokenHash);

    // Create new token
    return await this.create(newTokenData);
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();

