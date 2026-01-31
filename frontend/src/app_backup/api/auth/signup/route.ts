/**
 * POST /api/auth/signup
 * 
 * Create a new user account and generate tokens
 * 
 * Security features:
 * - Rate limiting (3 attempts per 15 minutes per IP)
 * - Input validation and sanitization
 * - Password strength validation (8+ chars, uppercase, lowercase, number, special)
 * - Generic error messages (prevents email enumeration)
 * - HttpOnly cookie for refresh token
 * - Case-insensitive email checking
 * 
 * Note: Tokens are generated but user must explicitly login.
 * This endpoint returns tokens for convenience, but the user
 * should be redirected to login page for explicit authentication.
 * 
 * @route POST /api/auth/signup
 * @body { email: string, password: string, confirmPassword: string, name?: string }
 * @returns { message: string, user: User, accessToken: string }
 * @cookie refreshToken (HttpOnly, Secure, SameSite=strict)
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/auth/auth-service";
import { validatePasswordStrength } from "@/lib/auth/password";
import { validateSignupRequest, validateAndSanitizeEmail, validateName } from "@/lib/auth/auth-validation";
import rateLimit from "@/lib/rate-limit";

// Rate limiting: 3 signup attempts per 15 minutes per IP
const limiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 500, // Max 500 users per interval
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting to prevent abuse
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
    await limiter.check(3, ip); // 3 requests per interval

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error("[Signup] Failed to parse request body:", error);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Normalize empty strings to undefined for optional fields
    if (body.name === "" || (typeof body.name === "string" && body.name.trim().length === 0)) {
      body.name = undefined;
    }

    // Log request body for debugging (sanitize password for security)
    console.log("[Signup] Request body:", {
      email: body.email,
      password: body.password ? "[REDACTED]" : undefined,
      confirmPassword: body.confirmPassword ? "[REDACTED]" : undefined,
      name: body.name,
    });

    // Validate input using centralized validation
    const validation = validateSignupRequest(body);
    console.log("[Signup] Validation result:", { valid: validation.valid, errors: validation.errors });
    if (!validation.valid) {
      console.error("[Signup] Validation failed:", {
        errors: validation.errors,
        receivedData: {
          email: body.email,
          hasPassword: !!body.password,
          hasConfirmPassword: !!body.confirmPassword,
          name: body.name,
        },
      });
      return NextResponse.json(
        { 
          error: validation.errors[0] || "Invalid input",
          details: validation.errors.length > 1 ? validation.errors.slice(1) : undefined
        },
        { status: 400 }
      );
    }

    console.log("[Signup] Basic validation passed, validating email...");
    // Validate and sanitize email
    const sanitizedEmail = validateAndSanitizeEmail(body.email);
    if (!sanitizedEmail) {
      console.error("[Signup] Email validation failed");
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }
    console.log("[Signup] Email validated:", sanitizedEmail);

    // Validate password strength
    console.log("[Signup] Validating password strength...");
    const passwordValidation = validatePasswordStrength(body.password);
    if (!passwordValidation.valid) {
      console.error("[Signup] Password validation failed:", passwordValidation.errors);
      return NextResponse.json(
        { 
          error: "Password does not meet requirements",
          details: passwordValidation.errors
        },
        { status: 400 }
      );
    }
    console.log("[Signup] Password validation passed");

    // Validate and sanitize name (optional)
    const sanitizedName = validateName(body.name);
    console.log("[Signup] Name validated:", sanitizedName || "undefined");

    // Create user account and generate tokens
    console.log("[Signup] Calling authService.signup...");
    const result = await authService.signup(sanitizedEmail, body.password, sanitizedName || undefined);
    console.log("[Signup] User created successfully, user ID:", result.user.id);

    // Create success response
    const response = NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          is_active: result.user.is_active,
          created_at: result.user.created_at,
        },
        accessToken: result.accessToken, // Token generated but user should login explicitly
      },
      { status: 201 }
    );

    // Set refresh token in HttpOnly cookie
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30); // 30 days

    response.cookies.set("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: refreshTokenExpiry,
      path: "/",
    });

    return response;
  } catch (error: any) {
    // Log full error for debugging
    console.error("[Signup] Caught error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
    });

    // Rate limit error
    if (error.message?.includes("rate limit")) {
      console.error("[Signup] Rate limit error");
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429 }
      );
    }

    // Generic error message to prevent email enumeration
    // Don't expose whether email exists or other internal details
    if (error.message === "Unable to create account") {
      console.error("[Signup] Unable to create account error");
      return NextResponse.json(
        { error: "Unable to create account. Please try again." },
        { status: 400 }
      );
    }

    // Database constraint errors (e.g., unique violation)
    if (error.code === "23505") {
      // PostgreSQL unique constraint violation
      console.error("[Signup] Database unique constraint violation (email already exists)");
      return NextResponse.json(
        { error: "Unable to create account. Please try again." },
        { status: 400 }
      );
    }

    // Log error for debugging (but don't expose to client)
    console.error("[Signup] Unexpected error:", error);

    return NextResponse.json(
      { error: "Unable to create account. Please try again." },
      { status: 500 }
    );
  }
}

