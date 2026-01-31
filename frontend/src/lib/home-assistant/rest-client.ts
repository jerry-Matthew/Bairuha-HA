/**
 * Home Assistant REST API Client
 * 
 * Provides a robust client for communicating with Home Assistant's REST API.
 * Handles authentication, error handling, retry logic, and core endpoints.
 * 
 * This client is used for:
 * - Entity state retrieval (GET /api/states) - Task 28
 * - Service call execution (POST /api/services/{domain}/{service}) - Task 30
 */

import { getConfigEntryByIntegration } from "@/components/globalAdd/server/config-entry.registry";

/**
 * Custom error class for Home Assistant REST API errors
 */
export class HARestClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRetryable: boolean = false,
    public originalError?: Error
  ) {
    super(message);
    this.name = "HARestClientError";
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HARestClientError);
    }
  }
}

/**
 * Home Assistant entity state structure
 */
export interface HAEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

/**
 * Home Assistant service call response
 * Response format varies by service (often empty array or result data)
 */
export type HAServiceResponse = any[] | Record<string, any> | null;

/**
 * Home Assistant credentials
 */
interface HACredentials {
  baseUrl: string;
  accessToken: string;
}

/**
 * Retrieve Home Assistant credentials from config entry
 * 
 * @throws {HARestClientError} If Home Assistant integration is not configured
 */
async function getHACredentials(): Promise<HACredentials> {
  const configEntry = await getConfigEntryByIntegration("homeassistant");

  if (!configEntry) {
    throw new HARestClientError(
      "Home Assistant integration not configured. Please set up Home Assistant integration first.",
      undefined,
      false
    );
  }

  const { base_url, access_token } = configEntry.data;

  if (!base_url || !access_token) {
    throw new HARestClientError(
      "Home Assistant credentials are missing or invalid. Please reconfigure the integration.",
      undefined,
      false
    );
  }

  return {
    baseUrl: base_url,
    accessToken: access_token,
  };
}

/**
 * Normalize and validate Home Assistant base URL
 * Removes trailing slashes and validates URL format
 * 
 * @param url - Base URL to normalize
 * @returns Normalized URL without trailing slash
 * @throws {HARestClientError} If URL is invalid
 */
function normalizeHAUrl(url: string): string {
  // Remove trailing slash
  const normalizedUrl = url.replace(/\/$/, "");

  // Validate URL format
  try {
    const parsedUrl = new URL(normalizedUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new HARestClientError(
        "Home Assistant URL must use http or https protocol",
        undefined,
        false
      );
    }
    return normalizedUrl;
  } catch (error) {
    if (error instanceof HARestClientError) {
      throw error;
    }
    throw new HARestClientError(
      "Invalid Home Assistant URL format",
      undefined,
      false,
      error as Error
    );
  }
}

/**
 * Determine if an error is retryable
 * Network errors and 5xx HTTP errors are retryable
 * 4xx errors (auth, validation) are not retryable
 */
function isRetryableError(error: HARestClientError): boolean {
  // Non-retryable if explicitly marked
  if (!error.isRetryable) {
    return false;
  }

  // 4xx errors are not retryable (auth, validation issues)
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return false;
  }

  // 5xx errors and network errors are retryable
  return true;
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000ms)
 * @returns Result of the function
 * @throws {HARestClientError} If all retries fail
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: HARestClientError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof HARestClientError
        ? error
        : new HARestClientError(
          error instanceof Error ? error.message : "Unknown error",
          undefined,
          true,
          error instanceof Error ? error : undefined
        );

      // Don't retry if error is not retryable
      if (!isRetryableError(lastError)) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Make an authenticated request to Home Assistant REST API
 * 
 * @param url - Full URL to request
 * @param accessToken - Bearer token for authentication
 * @param options - Fetch options (method, body, etc.)
 * @returns Response data
 * @throws {HARestClientError} On request failure
 */
async function makeHARequest<T>(
  url: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorData: any = null;

        // Try to extract error message from response body
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            errorData = await response.json();
            if (errorData.message) {
              errorMessage = errorData.message;
            }
          }
        } catch {
          // Ignore JSON parse errors, use default message
        }

        // Determine if error is retryable
        const isRetryable = response.status >= 500 || response.status === 429; // 5xx or rate limit

        throw new HARestClientError(
          errorMessage,
          response.status,
          isRetryable,
          undefined
        );
      }

      // Parse response
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }

      // Handle non-JSON responses (shouldn't happen with HA API, but handle gracefully)
      const text = await response.text();
      return text as unknown as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  } catch (error) {
    // Handle network errors, timeouts, etc.
    if (error instanceof HARestClientError) {
      throw error;
    }

    // Network errors are retryable
    let errorMessage = "Failed to connect to Home Assistant";
    if (error instanceof TypeError && error.message.includes("fetch")) {
      errorMessage = "Network error: Could not reach Home Assistant instance";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    throw new HARestClientError(
      errorMessage,
      undefined,
      true, // Network errors are retryable
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Home Assistant REST API Client
 * 
 * Provides methods for interacting with Home Assistant's REST API
 */
export class HARestClient {
  private credentials: HACredentials | null = null;

  /**
   * Get or retrieve Home Assistant credentials
   * Caches credentials to avoid repeated database queries
   */
  private async getCredentials(): Promise<HACredentials> {
    if (!this.credentials) {
      this.credentials = await getHACredentials();
    }
    return this.credentials;
  }

  /**
   * Clear cached credentials (useful for testing or when config changes)
   */
  public clearCredentials(): void {
    this.credentials = null;
  }

  /**
   * Get all entity states from Home Assistant
   * GET /api/states
   * 
   * @returns Array of entity state objects
   * @throws {HARestClientError} On request failure
   */
  async getStates(): Promise<HAEntityState[]> {
    return retryWithBackoff(async () => {
      const { baseUrl, accessToken } = await this.getCredentials();
      const normalizedUrl = normalizeHAUrl(baseUrl);

      const states = await makeHARequest<HAEntityState[]>(
        `${normalizedUrl}/api/states`,
        accessToken,
        {
          method: "GET",
        }
      );

      // Validate response is an array
      if (!Array.isArray(states)) {
        throw new HARestClientError(
          "Invalid response from Home Assistant: expected array of states",
          undefined,
          false
        );
      }

      return states;
    });
  }

  /**
   * Call a Home Assistant service
   * POST /api/services/{domain}/{service}
   * 
   * @param domain - Service domain (e.g., "light", "switch", "climate")
   * @param service - Service name (e.g., "turn_on", "turn_off", "set_temperature")
   * @param serviceData - Optional service call parameters
   * @returns Service call response (varies by service)
   * @throws {HARestClientError} On request failure
   */
  async callService(
    domain: string,
    service: string,
    serviceData?: Record<string, any>
  ): Promise<HAServiceResponse> {
    return retryWithBackoff(async () => {
      const { baseUrl, accessToken } = await this.getCredentials();
      const normalizedUrl = normalizeHAUrl(baseUrl);

      // Validate domain and service
      if (!domain || !service) {
        throw new HARestClientError(
          "Domain and service are required",
          undefined,
          false
        );
      }

      const response = await makeHARequest<HAServiceResponse>(
        `${normalizedUrl}/api/services/${domain}/${service}`,
        accessToken,
        {
          method: "POST",
          body: serviceData ? JSON.stringify(serviceData) : undefined,
        }
      );

      return response;
    });
  }

  /**
   * Get Home Assistant configuration
   * GET /api/config
   * 
   * @returns Home Assistant configuration object
   * @throws {HARestClientError} On request failure
   */
  async getConfig(): Promise<{
    version: string;
    location_name?: string;
    time_zone?: string;
    [key: string]: any;
  }> {
    return retryWithBackoff(async () => {
      const { baseUrl, accessToken } = await this.getCredentials();
      const normalizedUrl = normalizeHAUrl(baseUrl);

      const config = await makeHARequest<{
        version: string;
        location_name?: string;
        time_zone?: string;
        [key: string]: any;
      }>(
        `${normalizedUrl}/api/config`,
        accessToken,
        {
          method: "GET",
        }
      );

      return config;
    });
  }

  /**
   * Start a config flow for an integration
   * POST /api/config/config_entries/flow
   * 
   * @param domain - Integration domain (e.g. "mqtt", "hue")
   * @param handler - Optional handler key (usually same as domain)
   * @returns Config flow response (step data)
   */
  async startConfigFlow(
    domain: string,
    handler?: string // Some flows might need specific handler keys
  ): Promise<any> {
    return retryWithBackoff(async () => {
      const { baseUrl, accessToken } = await this.getCredentials();
      const normalizedUrl = normalizeHAUrl(baseUrl);

      const response = await makeHARequest<any>(
        `${normalizedUrl}/api/config/config_entries/flow`,
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({
            handler: handler || domain,
          }),
        }
      );
      return response;
    }, 1); // Low retry count for flows, fail fast
  }

  /**
   * Submit a step in a config flow
   * POST /api/config/config_entries/flow/{flow_id}
   * 
   * @param flowId - The ID of the active flow
   * @param user_input - The data to submit for the current step
   * @returns Config flow response (next step data)
   */
  async handleConfigFlowStep(
    flowId: string,
    user_input: Record<string, any>
  ): Promise<any> {
    return retryWithBackoff(async () => {
      const { baseUrl, accessToken } = await this.getCredentials();
      const normalizedUrl = normalizeHAUrl(baseUrl);

      const response = await makeHARequest<any>(
        `${normalizedUrl}/api/config/config_entries/flow/${flowId}`,
        accessToken,
        {
          method: "POST",
          body: JSON.stringify(user_input),
        }
      );
      return response;
    }, 1);
  }

  /**
   * Abort a config flow
   * DELETE /api/config/config_entries/flow/{flow_id}
   */
  async abortConfigFlow(flowId: string): Promise<void> {
    try {
      const { baseUrl, accessToken } = await this.getCredentials();
      const normalizedUrl = normalizeHAUrl(baseUrl);

      await makeHARequest<void>(
        `${normalizedUrl}/api/config/config_entries/flow/${flowId}`,
        accessToken,
        {
          method: "DELETE",
        }
      );
    } catch (e) {
      // Ignore errors when aborting, it's best-effort
      console.warn(`Failed to abort flow ${flowId}`, e);
    }
  }
}

/**
 * Create a new Home Assistant REST API client instance
 * 
 * @returns HARestClient instance
 */
export function createHARestClient(): HARestClient {
  return new HARestClient();
}

/**
 * Default singleton client instance
 * Use this for convenience, or create your own instance with createHARestClient()
 */
export const haRestClient = createHARestClient();
