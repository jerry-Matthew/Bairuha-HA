/**
 * Authentication Middleware
 * Validates JWT tokens and extracts user information
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, AccessTokenPayload } from "./tokens";

export interface AuthenticatedRequest extends NextRequest {
  user?: AccessTokenPayload;
}

/**
 * Middleware to authenticate requests
 * Extracts and validates JWT access token from Authorization header
 */
export function authenticate(
  request: NextRequest
): { user: AccessTokenPayload } | { error: string; status: number } {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: "Missing or invalid authorization header",
      status: 401,
    };
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    const user = verifyAccessToken(token);
    return { user };
  } catch (error: any) {
    return {
      error: error.message || "Invalid token",
      status: 401,
    };
  }
}

/**
 * Create authenticated request handler wrapper
 */
export function withAuth(
  handler: (req: NextRequest, user: AccessTokenPayload) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const authResult = authenticate(req);

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    return handler(req, authResult.user);
  };
}

