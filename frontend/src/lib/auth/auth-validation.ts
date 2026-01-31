/**
 * Authentication Validation Utilities
 * Centralized validation logic for auth-related inputs
 * Reusable across API routes and services
 */

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Sanitize string input
 * Removes leading/trailing whitespace
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }
  return input.trim();
}

/**
 * Validate and sanitize email
 * @param email - Email to validate and sanitize
 * @returns Sanitized email in lowercase, or null if invalid
 */
export function validateAndSanitizeEmail(email: string): string | null {
  const sanitized = sanitizeString(email);
  if (!sanitized || !isValidEmail(sanitized)) {
    return null;
  }
  return sanitized.toLowerCase();
}

/**
 * Validate name field (optional)
 * @param name - Name to validate
 * @returns Sanitized name or null if invalid
 */
export function validateName(name: string | undefined | null): string | null {
  if (!name) {
    return null;
  }
  const sanitized = sanitizeString(name);
  if (sanitized.length === 0) {
    return null;
  }
  if (sanitized.length > 255) {
    return null; // Will be caught by validation
  }
  return sanitized;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate login request
 */
export function validateLoginRequest(data: {
  email?: unknown;
  password?: unknown;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.email || typeof data.email !== "string") {
    errors.push("Email is required");
  } else if (!isValidEmail(data.email)) {
    errors.push("Invalid email format");
  }

  if (!data.password || typeof data.password !== "string") {
    errors.push("Password is required");
  } else if (data.password.length === 0) {
    errors.push("Password cannot be empty");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate signup request
 */
export function validateSignupRequest(data: {
  email?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
  name?: unknown;
}): ValidationResult {
  const errors: string[] = [];

  // Email validation
  if (!data.email || typeof data.email !== "string") {
    errors.push("Email is required");
  } else if (!isValidEmail(data.email)) {
    errors.push("Invalid email format");
  }

  // Password validation
  if (!data.password || typeof data.password !== "string") {
    errors.push("Password is required");
  }

  // Confirm password validation
  if (!data.confirmPassword || typeof data.confirmPassword !== "string") {
    errors.push("Password confirmation is required");
  } else if (data.password && data.password !== data.confirmPassword) {
    errors.push("Passwords do not match");
  }

  // Name validation (optional)
  if (data.name !== undefined && data.name !== null) {
    if (typeof data.name !== "string") {
      errors.push("Name must be a string");
    } else {
      const sanitized = sanitizeString(data.name);
      if (sanitized.length > 255) {
        errors.push("Name must be 255 characters or less");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

