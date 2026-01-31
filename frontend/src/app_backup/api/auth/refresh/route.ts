/**
 * POST /api/auth/refresh
 * 
 * Refresh access token using refresh token from cookie
 * 
 * Security features:
 * - Token rotation (old token revoked, new token generated)
 * - Prevents token reuse attacks
 * - Validates token expiry and user status
 * - Clears invalid tokens automatically
 * 
 * @route POST /api/auth/refresh
 * @cookie refreshToken (will be rotated)
 * @returns { accessToken: string }
 * @cookie refreshToken (new token, HttpOnly, Secure, SameSite=strict)
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/auth/auth-service";

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from HttpOnly cookie
    const refreshToken = request.cookies.get("refreshToken")?.value;

    if (!refreshToken) {
      // No refresh token provided
      const response = NextResponse.json(
        { error: "Refresh token not found" },
        { status: 401 }
      );
      // Clear any invalid cookie
      response.cookies.delete("refreshToken");
      return response;
    }

    // Refresh tokens (implements token rotation)
    const result = await authService.refreshToken(refreshToken);

    // Create success response with new access token and user data
    const response = NextResponse.json(
      {
        accessToken: result.accessToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          is_active: result.user.is_active,
          created_at: result.user.created_at,
        },
      },
      { status: 200 }
    );

    // Update refresh token cookie with new token (token rotation)
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
    // Token is invalid, expired, or user is inactive
    // Clear the invalid refresh token cookie
    const response = NextResponse.json(
      { error: "Invalid or expired refresh token" },
      { status: 401 }
    );

    // Clear invalid token cookie
    response.cookies.delete("refreshToken");
    response.cookies.set("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0), // Expire immediately
      path: "/",
    });

    return response;
  }
}

