/**
 * Permission Utilities
 * 
 * Handles permission checks for command execution.
 */

import type { PermissionLevel, CommandContext } from "../types";

/**
 * Check if user has permission to execute a command
 */
export function hasPermission(
  requiredLevel: PermissionLevel,
  context: CommandContext
): boolean {
  const roleHierarchy: Record<"admin" | "user", number> = {
    admin: 2,
    user: 1,
  };

  const userLevel = roleHierarchy[context.userRole] || 0;
  const requiredLevelValue: Record<PermissionLevel, number> = {
    admin: 2,
    user: 1,
    public: 0,
  };

  return userLevel >= requiredLevelValue[requiredLevel];
}

/**
 * Check if terminal access is allowed for user
 * Terminal is accessible to all authenticated users
 */
export function canAccessTerminal(_userRole: "admin" | "user"): boolean {
  // Allow all authenticated users (both admin and regular users)
  return true;
}
