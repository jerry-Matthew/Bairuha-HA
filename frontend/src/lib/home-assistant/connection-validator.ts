/**
 * Home Assistant Connection Validator
 * 
 * Validates connection to a Home Assistant instance by calling /api/config
 * This is used during config flow validation step (Task 26)
 */

export interface HAConfigResponse {
  location_name: string;
  version: string;
  time_zone: string;
  unit_system: {
    length: string;
    mass: string;
    temperature: string;
    volume: string;
  };
  components: string[];
  config_dir: string;
  allowlist_external_dirs: string[];
  allowlist_external_urls: string[];
  version_latest?: string;
  safe_mode?: boolean;
  state?: string;
  external_url?: string;
  internal_url?: string;
  currency?: string;
  country?: string;
  language?: string;
}

export interface ValidationResult {
  success: boolean;
  error?: string;
  config?: HAConfigResponse;
}

/**
 * Validate connection to Home Assistant instance
 * Calls GET /api/config to verify connectivity and authentication
 */
export async function validateHAConnection(
  baseUrl: string,
  accessToken: string
): Promise<ValidationResult> {
  try {
    // Normalize base URL (remove trailing slash)
    const normalizedUrl = baseUrl.replace(/\/$/, "");
    
    // Validate URL format
    try {
      new URL(normalizedUrl);
    } catch {
      return {
        success: false,
        error: "Invalid URL format",
      };
    }

    // Call Home Assistant /api/config endpoint
    const response = await fetch(`${normalizedUrl}/api/config`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Ignore JSON parse errors, use default message
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    // Parse response
    const config: HAConfigResponse = await response.json();

    // Validate that we got a valid config response
    if (!config || typeof config !== "object") {
      return {
        success: false,
        error: "Invalid response from Home Assistant",
      };
    }

    // Check for required fields that indicate a valid HA instance
    if (!config.version) {
      return {
        success: false,
        error: "Invalid Home Assistant response: missing version",
      };
    }

    return {
      success: true,
      config,
    };
  } catch (error: any) {
    // Handle network errors, timeouts, etc.
    let errorMessage = "Failed to connect to Home Assistant";
    
    if (error instanceof TypeError && error.message.includes("fetch")) {
      errorMessage = "Network error: Could not reach Home Assistant instance";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
