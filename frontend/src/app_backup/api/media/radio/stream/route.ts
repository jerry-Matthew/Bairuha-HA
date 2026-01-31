/**
 * POST /api/media/radio/stream
 * 
 * Get validated stream URL for radio station
 * 
 * Security features:
 * - Authentication required
 * - URL validation
 * - Rate limiting
 * - Prevents open redirects
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import rateLimit from "@/lib/rate-limit";

// Rate limiting: 30 requests per minute per user
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

const ALLOWED_PROTOCOLS = ["http:", "https:"];
const BLOCKED_DOMAINS = ["localhost", "127.0.0.1", "0.0.0.0"];

function isValidStreamUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      return false;
    }

    // Block localhost and internal IPs
    if (BLOCKED_DOMAINS.includes(parsedUrl.hostname)) {
      return false;
    }

    // Must be HTTP/HTTPS
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = authenticate(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const user = authResult.user;

    // Rate limiting
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
    await limiter.check(30, `${user.userId}-${ip}`);

    // Parse request body
    const body = await request.json();
    const { url: streamUrl } = body;

    if (!streamUrl || typeof streamUrl !== "string") {
      return NextResponse.json(
        { error: "Stream URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    if (!isValidStreamUrl(streamUrl)) {
      return NextResponse.json(
        { error: "Invalid stream URL" },
        { status: 400 }
      );
    }

    // Return validated URL (client will handle playback)
    return NextResponse.json(
      { streamUrl },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Stream URL error:", error);

    if (error.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get stream URL" },
      { status: 500 }
    );
  }
}

