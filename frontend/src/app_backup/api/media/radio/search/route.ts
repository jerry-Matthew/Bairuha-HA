/**
 * GET /api/media/radio/search
 * 
 * Search for radio stations using Radio Browser API
 * 
 * Security features:
 * - Authentication required
 * - Input validation
 * - Rate limiting
 * - No API keys exposed to client
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import rateLimit from "@/lib/rate-limit";

// Rate limiting: 20 searches per minute per user
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

const RADIO_BROWSER_API = "https://de1.api.radio-browser.info/json/stations/search";

export async function GET(request: NextRequest) {
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
    await limiter.check(20, `${user.userId}-${ip}`);

    // Get search query
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Sanitize query (limit length)
    const sanitizedQuery = query.trim().substring(0, 100);

    // Search Radio Browser API
    const response = await fetch(
      `${RADIO_BROWSER_API}?name=${encodeURIComponent(sanitizedQuery)}&limit=20`,
      {
        headers: {
          "User-Agent": "HomeAssistant/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Radio Browser API error");
    }

    const stations = await response.json();

    // Transform and sanitize results
    const sanitizedStations = stations.slice(0, 20).map((station: any) => ({
      id: station.stationuuid || station.changeuuid || `station-${Math.random()}`,
      name: station.name || "Unknown Station",
      url: station.url || "",
      country: station.country || "Unknown",
      tags: station.tags || "",
    }));

    return NextResponse.json(
      { stations: sanitizedStations },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Radio search error:", error);

    if (error.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to search radio stations" },
      { status: 500 }
    );
  }
}

