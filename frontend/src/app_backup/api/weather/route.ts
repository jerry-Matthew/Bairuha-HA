/**
 * GET /api/weather
 * 
 * Fetches weather data from OpenWeatherMap API
 * 
 * Security features:
 * - API key stored server-side only
 * - Input validation
 * - Error handling
 * - Rate limiting via OpenWeatherMap (free tier: 60 calls/min)
 * 
 * @route GET /api/weather
 * @query { lat?: number, lon?: number, city?: string }
 * @returns { location: string, temperature: number, condition: string, icon: string, humidity?: number, windSpeed?: number }
 */

import { NextRequest, NextResponse } from "next/server";

// Handle quoted environment variables (common in .env files)
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY?.replace(/^["']|["']$/g, "").trim();
const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

interface WeatherResponse {
  location: string;
  temperature: number;
  condition: string;
  icon: string;
  humidity?: number;
  windSpeed?: number;
}

export async function GET(request: NextRequest) {
  try {
    // DIAGNOSTIC: Check environment variable loading
    if (process.env.NODE_ENV === "development") {
      console.log("[WEATHER API DIAGNOSTIC]");
      console.log("Raw OPENWEATHER_API_KEY exists:", !!process.env.OPENWEATHER_API_KEY);
      console.log("Raw OPENWEATHER_API_KEY length:", process.env.OPENWEATHER_API_KEY?.length || 0);
      console.log("Cleaned OPENWEATHER_API_KEY exists:", !!OPENWEATHER_API_KEY);
      console.log("Cleaned OPENWEATHER_API_KEY length:", OPENWEATHER_API_KEY?.length || 0);
      console.log("Cleaned OPENWEATHER_API_KEY first 10 chars:", OPENWEATHER_API_KEY?.substring(0, 10) || "N/A");
      console.log("DEFAULT_WEATHER_CITY:", process.env.DEFAULT_WEATHER_CITY || "not set");
    }

    // Check if API key is configured
    if (!OPENWEATHER_API_KEY) {
      return NextResponse.json(
        { error: "Weather service is not configured" },
        { status: 503 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const city = searchParams.get("city");

    // Validate input - need either lat/lon or city
    if (!lat || !lon) {
      if (!city) {
        // Default to a common location if nothing provided
        // This ensures dashboard doesn't break
        const defaultCity = process.env.DEFAULT_WEATHER_CITY || "London";
        if (process.env.NODE_ENV === "development") {
          console.log("[WEATHER API] Using default city:", defaultCity);
        }
        return fetchWeatherByCity(defaultCity);
      }
      if (process.env.NODE_ENV === "development") {
        console.log("[WEATHER API] Using provided city:", city);
      }
      return fetchWeatherByCity(city);
    }

    // Validate lat/lon are numbers
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }

    // Fetch weather by coordinates
    return fetchWeatherByCoords(latitude, longitude);
  } catch (error: any) {
    // Log error for debugging (server-side only)
    if (process.env.NODE_ENV === "development") {
      console.error("Weather API error:", error);
    }

    // Return generic error to client
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 500 }
    );
  }
}

async function fetchWeatherByCoords(
  lat: number,
  lon: number
): Promise<NextResponse<WeatherResponse | { error: string }>> {
  try {
    const url = `${OPENWEATHER_BASE_URL}?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { error: "Weather service authentication failed" },
          { status: 503 }
        );
      }
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Location not found" },
          { status: 404 }
        );
      }
      throw new Error(`Weather API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(normalizeWeatherData(data));
  } catch (error) {
    throw error;
  }
}

async function fetchWeatherByCity(
  city: string
): Promise<NextResponse<WeatherResponse | { error: string }>> {
  try {
    const url = `${OPENWEATHER_BASE_URL}?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    
    // DIAGNOSTIC: Log request URL (without exposing full API key)
    if (process.env.NODE_ENV === "development") {
      const safeUrl = url.replace(/appid=[^&]+/, "appid=***");
      console.log("[WEATHER API] Request URL:", safeUrl);
      console.log("[WEATHER API] City:", city);
    }
    
    const response = await fetch(url);

    // DIAGNOSTIC: Log OpenWeather response status
    if (process.env.NODE_ENV === "development") {
      console.log("[WEATHER API] OpenWeather Status:", response.status);
    }

    if (!response.ok) {
      // Get error details from OpenWeather
      let errorMessage = "Weather service error";
      let errorData: any = null;
      try {
        const responseText = await response.text();
        if (process.env.NODE_ENV === "development") {
          console.log("[WEATHER API] OpenWeather Error Response:", responseText.substring(0, 200));
        }
        errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorMessage;
        if (process.env.NODE_ENV === "development") {
          console.log("[WEATHER API] OpenWeather Error Details:", errorData);
        }
      } catch {
        // Ignore JSON parse errors
      }

      if (response.status === 401) {
        return NextResponse.json(
          { error: "Weather service authentication failed", details: errorMessage },
          { status: 503 }
        );
      }
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Location not found", details: errorMessage },
          { status: 404 }
        );
      }
      throw new Error(`Weather API returned ${response.status}: ${errorMessage}`);
    }

    const data = await response.json();
    return NextResponse.json(normalizeWeatherData(data));
  } catch (error) {
    throw error;
  }
}

function normalizeWeatherData(data: any): WeatherResponse {
  return {
    location: `${data.name}, ${data.sys.country}`,
    temperature: Math.round(data.main.temp),
    condition: data.weather[0].main,
    icon: data.weather[0].icon,
    humidity: data.main.humidity,
    windSpeed: data.wind?.speed ? Math.round(data.wind.speed * 3.6) : undefined, // Convert m/s to km/h
  };
}

