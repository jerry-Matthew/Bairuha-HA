/**
 * Frontend Validation Utilities
 * Client-side validation for signup form
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || email.trim().length === 0) {
    errors.push("Email is required");
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push("Invalid email format");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate password strength
 * Reuses the same logic from password.ts for consistency
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push("Password is required");
    return { valid: false, errors };
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate password confirmation
 */
export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): ValidationResult {
  const errors: string[] = [];

  if (!confirmPassword) {
    errors.push("Please confirm your password");
  } else if (password !== confirmPassword) {
    errors.push("Passwords do not match");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate name (optional field)
 */
export function validateName(name: string | undefined): ValidationResult {
  const errors: string[] = [];

  if (name !== undefined && name !== null && name.trim().length > 0) {
    if (name.trim().length > 255) {
      errors.push("Name must be 255 characters or less");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate entire signup form
 */
export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name?: string;
}

export function validateSignupForm(data: SignupFormData): ValidationResult {
  const errors: string[] = [];

  // Validate email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    errors.push(...emailValidation.errors);
  }

  // Validate password
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    errors.push(...passwordValidation.errors);
  }

  // Validate password confirmation
  const confirmValidation = validatePasswordConfirmation(
    data.password,
    data.confirmPassword
  );
  if (!confirmValidation.valid) {
    errors.push(...confirmValidation.errors);
  }

  // Validate name (optional)
  const nameValidation = validateName(data.name);
  if (!nameValidation.valid) {
    errors.push(...nameValidation.errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

