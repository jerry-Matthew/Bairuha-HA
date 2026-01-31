/**
 * POST /api/auth/logout
 * 
 * Industry-standard logout implementation
 * 
 * Security features:
 * - Invalidates refresh token in database (prevents token reuse)
 * - Clears HttpOnly cookie (prevents XSS attacks)
 * - Clears all cookie variations (compatibility)
 * - Always clears cookies even on error (fail-secure)
 * - Prevents information leakage (generic responses)
 * - Security audit logging
 * 
 * Industry best practices:
 * - Idempotent: Can be called multiple times safely
 * - Fail-secure: Always clears cookies even if token revocation fails
 * - No information leakage: Generic success message regardless of token state
 * - Comprehensive cleanup: Clears all possible cookie paths and domains
 * 
 * @route POST /api/auth/logout
 * @cookie refreshToken (will be revoked and cleared)
 * @returns { message: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/auth/auth-service";

/**
 * Clear refresh token cookie with all possible variations
 * Ensures cookie is cleared regardless of path/domain settings
 */
function clearRefreshTokenCookie(response: NextResponse): void {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    expires: new Date(0), // Expire immediately
  };

  // Clear with different paths to ensure complete removal
  const paths = ["/", "/api", "/api/auth"];
  
  paths.forEach((path) => {
    // Delete method
    response.cookies.delete("refreshToken");
    
    // Set to empty with specific path
    response.cookies.set("refreshToken", "", {
      ...cookieOptions,
      path,
    });
  });
}

export async function POST(request: NextRequest) {
  // Always create success response (even on error, we clear cookies)
  // This prevents information leakage about token state
  const response = NextResponse.json(
    { message: "Logged out successfully" },
    { status: 200 }
  );

  // Get client IP for security logging
  const clientIp = request.ip || 
                   request.headers.get("x-forwarded-for") || 
                   request.headers.get("x-real-ip") || 
                   "unknown";

  try {
    // Get refresh token from HttpOnly cookie
    const refreshToken = request.cookies.get("refreshToken")?.value;

    // Revoke token in database if present
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
        
        // Security audit log (in production, use proper logging service)
        if (process.env.NODE_ENV === "production") {
          console.log(`[AUDIT] User logged out successfully - IP: ${clientIp} - ${new Date().toISOString()}`);
        }
      } catch (error) {
        // Token might already be invalid/revoked, continue with logout
        // This is not a critical error - we still want to clear cookies
        // Log for monitoring but don't fail the request
        console.warn(`[AUDIT] Token revocation failed during logout (non-critical) - IP: ${clientIp}`, error);
      }
    } else {
      // No token present - user might already be logged out
      // Still clear cookies to ensure clean state
      if (process.env.NODE_ENV === "production") {
        console.log(`[AUDIT] Logout called without token - IP: ${clientIp} - ${new Date().toISOString()}`);
      }
    }

    // Clear refresh token cookie (comprehensive cleanup)
    clearRefreshTokenCookie(response);

    // Add security headers to prevent caching of logout response
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error: any) {
    // Log error for debugging and monitoring
    console.error(`[ERROR] Logout error - IP: ${clientIp}`, error);

    // Still clear cookies even on error (security best practice)
    // User should be logged out even if token revocation fails
    clearRefreshTokenCookie(response);

    // Add security headers
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    // Return success even on error (cookies are cleared)
    // This prevents information leakage about token state
    // Idempotent: Can be called multiple times safely
    return response;
  }
}

