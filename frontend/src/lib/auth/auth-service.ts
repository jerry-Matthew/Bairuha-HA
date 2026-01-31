/**
 * Authentication Service
 * Core business logic for authentication flows
 */

import { userRepository, UserRecord } from "@/lib/db/repositories/user-repository";
import { refreshTokenRepository } from "@/lib/db/repositories/refresh-token-repository";
import { hashPassword, verifyPassword } from "./password";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiry,
  AccessTokenPayload,
} from "./tokens";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  user: Omit<UserRecord, "password_hash">;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  user: Omit<UserRecord, "password_hash">;
}

export class AuthService {
  /**
   * Authenticate user and generate tokens
   * 
   * Security features:
   * - Revokes all existing refresh tokens for the user (prevents token reuse)
   * - Generates new access and refresh tokens
   * - Stores refresh token hash (never plaintext)
   * 
   * @param credentials - User login credentials
   * @returns User data and tokens
   * @throws Error with generic message to prevent user enumeration
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    // Normalize email (case-insensitive lookup)
    const normalizedEmail = credentials.email.trim().toLowerCase();

    // Find user by email (case-insensitive)
    const user = await userRepository.findByEmail(normalizedEmail);

    // Generic error message to prevent user enumeration
    // Don't reveal whether email exists or password is wrong
    if (!user || !user.is_active) {
      throw new Error("Invalid email or password");
    }

    // Verify password using bcrypt
    const isValid = await verifyPassword(credentials.password, user.password_hash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    // SECURITY: Revoke all existing refresh tokens for this user
    // This prevents token reuse attacks and ensures only one active session
    // per login (or configure to allow multiple sessions if needed)
    await refreshTokenRepository.revokeAllForUser(user.id);

    // Generate new access token (short-lived: 15 minutes)
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    // Generate new refresh token (long-lived: 30 days)
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = getRefreshTokenExpiry();

    // Store hashed refresh token in database (never store plaintext)
    await refreshTokenRepository.create({
      user_id: user.id,
      token_hash: refreshTokenHash,
      expires_at: expiresAt,
    });

    // Return user data (without password hash) and tokens
    const { password_hash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   * 
   * Implements token rotation for security:
   * - Old refresh token is revoked
   * - New refresh token is generated
   * - Prevents token reuse attacks
   * 
   * @param refreshToken - Current refresh token (will be revoked)
   * @returns New access and refresh tokens
   * @throws Error if token is invalid, expired, or user is inactive
   */
  async refreshToken(refreshToken: string): Promise<RefreshResult> {
    // Hash the provided refresh token for database lookup
    const tokenHash = hashRefreshToken(refreshToken);

    // Find token in database (must be active and not expired)
    const tokenRecord = await refreshTokenRepository.findByTokenHash(tokenHash);
    if (!tokenRecord) {
      throw new Error("Invalid or expired refresh token");
    }

    // Verify user still exists and is active
    const user = await userRepository.findById(tokenRecord.user_id);
    if (!user || !user.is_active) {
      // Revoke token if user is inactive
      await refreshTokenRepository.revoke(tokenHash);
      throw new Error("User not found or inactive");
    }

    // Generate new access token (15 minutes expiry)
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    // Generate new refresh token (30 days expiry)
    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
    const expiresAt = getRefreshTokenExpiry();

    // SECURITY: Token rotation - revoke old token, create new one
    // This prevents token reuse if a token is compromised
    await refreshTokenRepository.rotate(tokenHash, {
      user_id: user.id,
      token_hash: newRefreshTokenHash,
      expires_at: expiresAt,
    });

    // Return user data without password hash
    const { password_hash, ...userWithoutPassword } = user;

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: userWithoutPassword,
    };
  }

  /**
   * Logout: revoke refresh token
   * 
   * Invalidates the refresh token so it cannot be used again.
   * This ensures logged-out sessions cannot be reused.
   * 
   * @param refreshToken - Refresh token to revoke
   */
  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) {
      return; // No token to revoke
    }
    const tokenHash = hashRefreshToken(refreshToken);
    await refreshTokenRepository.revoke(tokenHash);
  }

  /**
   * Logout all sessions for a user
   */
  async logoutAll(userId: string): Promise<void> {
    await refreshTokenRepository.revokeAllForUser(userId);
  }

  /**
   * Register a new user (optional, for signup flow)
   * Note: This method auto-logs in the user. Use signup() for registration without auto-login.
   */
  async register(email: string, password: string): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await userRepository.create({
      email,
      password_hash: passwordHash,
    });

    // Generate tokens (same as login)
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = getRefreshTokenExpiry();

    await refreshTokenRepository.create({
      user_id: user.id,
      token_hash: refreshTokenHash,
      expires_at: expiresAt,
    });

    const { password_hash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Signup: Create a new user account and generate tokens
   * 
   * Note: This generates tokens but does NOT auto-login the user.
   * The user must explicitly call login() to authenticate.
   * 
   * Security features:
   * - Case-insensitive email checking
   * - Password hashing with bcrypt (12 salt rounds)
   * - Generic error messages (prevents email enumeration)
   * - Email normalization
   * 
   * @param email - User email (will be normalized to lowercase)
   * @param password - Plain text password (will be hashed)
   * @param name - Optional user name
   * @returns User data and tokens (user must login separately)
   * @throws Error if user already exists or creation fails
   */
  async signup(
    email: string,
    password: string,
    name?: string
  ): Promise<AuthResult> {
    // Normalize email (case-insensitive)
    const normalizedEmail = email.trim().toLowerCase();
    console.log("[AuthService.signup] Starting signup for email:", normalizedEmail);

    // Check if user already exists (case-insensitive)
    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      console.error("[AuthService.signup] User already exists with email:", normalizedEmail);
      // Generic error to prevent email enumeration
      // Don't reveal whether email exists
      throw new Error("Unable to create account");
    }
    console.log("[AuthService.signup] No existing user found, proceeding with account creation");

    // Hash password with bcryptjs (12 salt rounds, >= 10 requirement)
    console.log("[AuthService.signup] Hashing password...");
    const passwordHash = await hashPassword(password);
    console.log("[AuthService.signup] Password hashed successfully");

    // Create user in database
    console.log("[AuthService.signup] Creating user in database...");
    let user;
    try {
      user = await userRepository.create({
        email: normalizedEmail,
        password_hash: passwordHash,
        name: name?.trim() || undefined,
      });
      console.log("[AuthService.signup] User created successfully, ID:", user.id);
    } catch (error: any) {
      console.error("[AuthService.signup] Database error creating user:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
      });
      // Re-throw as generic error to prevent information leakage
      throw new Error("Unable to create account");
    }

    // Generate tokens for the new user
    // Note: User must still call login() to authenticate
    // These tokens are generated but not automatically used
    console.log("[AuthService.signup] Generating tokens...");
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = getRefreshTokenExpiry();

    // Store refresh token hash in database
    console.log("[AuthService.signup] Storing refresh token...");
    await refreshTokenRepository.create({
      user_id: user.id,
      token_hash: refreshTokenHash,
      expires_at: expiresAt,
    });

    // Return user data (without password hash) and tokens
    const { password_hash, ...userWithoutPassword } = user;
    console.log("[AuthService.signup] Signup completed successfully");

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }
}

export const authService = new AuthService();

