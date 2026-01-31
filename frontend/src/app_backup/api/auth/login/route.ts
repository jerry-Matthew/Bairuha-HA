/**
 * POST /api/auth/login
 * 
 * Authenticate user and return access token + refresh token
 * 
 * Security features:
 * - Rate limiting (5 attempts per 15 minutes per IP)
 * - Input validation
 * - Generic error messages (prevents user enumeration)
 * - HttpOnly cookie for refresh token
 * - Token rotation on login (old tokens revoked)
 * 
 * @route POST /api/auth/login
 * @body { email: string, password: string }
 * @returns { user: User, accessToken: string }
 * @cookie refreshToken (HttpOnly, Secure, SameSite=strict)
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/auth/auth-service";
import { validateLoginRequest } from "@/lib/auth/auth-validation";
import rateLimit from "@/lib/rate-limit";

// Rate limiting: 5 attempts per 15 minutes per IP
const limiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 500, // Max 500 users per interval
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting to prevent brute force attacks
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
    await limiter.check(5, ip); // 5 requests per interval

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate input using centralized validation
    const validation = validateLoginRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] || "Invalid input" },
        { status: 400 }
      );
    }

    // Authenticate user
    const result = await authService.login({
      email: body.email,
      password: body.password,
    });

    // Create success response
    const response = NextResponse.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          is_active: result.user.is_active,
          created_at: result.user.created_at,
        },
        accessToken: result.accessToken,
      },
      { status: 200 }
    );

    // Set refresh token in HttpOnly cookie (secure storage)
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30); // 30 days

    response.cookies.set("refreshToken", result.refreshToken, {
      httpOnly: true, // Prevents XSS attacks
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict", // CSRF protection
      expires: refreshTokenExpiry,
      path: "/",
    });

    return response;
  } catch (error: any) {
    // Rate limit error
    if (error.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    // Authentication error - use generic message to prevent user enumeration
    if (error.message === "Invalid email or password") {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Log error for debugging (but don't expose to client)
    console.error("Login error:", error);

    // Generic error response
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}

