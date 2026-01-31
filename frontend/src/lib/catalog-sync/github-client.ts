/**
 * GitHub Client for Catalog Sync
 * 
 * Shared GitHub API client for fetching Home Assistant integration data.
 * Can be used by both import script and sync service.
 */

// Load environment variables
import * as dotenv from "dotenv";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env");
if (require("fs").existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const GITHUB_REPO = "home-assistant/core";
const GITHUB_API_BASE = "https://api.github.com";
const COMPONENTS_PATH = "homeassistant/components";
const BRANDS_REPO = "home-assistant/brands";
const BRANDS_BASE_URL = "https://brands.home-assistant.io";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const RATE_LIMIT_DELAY = GITHUB_TOKEN ? 100 : 1000; // ms between requests

export interface HAManifest {
  domain: string;
  name?: string;
  documentation?: string | string[];
  requirements?: string[];
  dependencies?: string[];
  after_dependencies?: string[];
  config_flow?: boolean;
  iot_class?: "local_polling" | "local_push" | "cloud_polling" | "cloud_push" | "assumed_state" | "calculated";
  dhcp?: any[];
  zeroconf?: any[];
  ssdp?: any[];
  homekit?: any;
  codeowners?: string[];
  [key: string]: any;
}

export interface GitHubContent {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
  content?: string;
  encoding?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  const headers: HeadersInit = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Bairuha-HA-Sync",
    ...options.headers as HeadersInit,
  };

  if (GITHUB_TOKEN) {
    headers["Authorization"] = `token ${GITHUB_TOKEN}`;
  }

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { ...options, headers });
      
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
        const rateLimitReset = response.headers.get("x-ratelimit-reset");
        
        if (rateLimitRemaining === "0" && rateLimitReset) {
          const resetTime = parseInt(rateLimitReset) * 1000;
          const waitTime = Math.max(resetTime - Date.now(), 0) + 1000;
          console.log(`⏳ Rate limit exceeded. Waiting ${Math.round(waitTime / 1000)}s...`);
          await sleep(waitTime);
          continue;
        }
      }

      if (!response.ok && response.status !== 404) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error: any) {
      if (i === retries - 1) throw error;
      await sleep(1000 * (i + 1));
    }
  }

  throw new Error("Failed after retries");
}

export async function fetchHAIntegrationDomains(): Promise<string[]> {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${COMPONENTS_PATH}`;
  const response = await fetchWithRetry(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch components directory: ${response.statusText}`);
  }

  const items = await response.json() as GitHubContent[];
  
  const domains = items
    .filter(item => item.type === "dir")
    .filter(item => !item.name.startsWith("__") && item.name !== "tests")
    .map(item => item.name)
    .sort();

  return domains;
}

export async function fetchManifest(domain: string): Promise<HAManifest | null> {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${COMPONENTS_PATH}/${domain}/manifest.json`;
  
  try {
    const response = await fetchWithRetry(url);
    
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.json() as GitHubContent;
    
    if (content.encoding === "base64" && content.content) {
      const decoded = Buffer.from(content.content, "base64").toString("utf-8");
      return JSON.parse(decoded) as HAManifest;
    }

    throw new Error("Unexpected content encoding");
  } catch (error: any) {
    if (error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

export async function fetchBrandImageDomains(): Promise<Set<string>> {
  const brandDomains = new Set<string>();
  
  try {
    const coreUrl = `${GITHUB_API_BASE}/repos/${BRANDS_REPO}/contents/core_integrations`;
    const customUrl = `${GITHUB_API_BASE}/repos/${BRANDS_REPO}/contents/custom_integrations`;
    
    const [coreResponse, customResponse] = await Promise.all([
      fetchWithRetry(coreUrl).catch(() => null),
      fetchWithRetry(customUrl).catch(() => null),
    ]);
    
    if (coreResponse && coreResponse.ok) {
      const coreItems = await coreResponse.json() as GitHubContent[];
      coreItems
        .filter(item => item.type === "dir")
        .forEach(item => brandDomains.add(item.name));
    }
    
    if (customResponse && customResponse.ok) {
      const customItems = await customResponse.json() as GitHubContent[];
      customItems
        .filter(item => item.type === "dir")
        .forEach(item => brandDomains.add(item.name));
    }
    
    return brandDomains;
  } catch (error: any) {
    console.warn(`⚠️  Could not fetch brand image domains: ${error.message}`);
    return brandDomains;
  }
}

export function getBrandImageUrl(domain: string, brandDomains: Set<string>): string | undefined {
  if (brandDomains.has(domain)) {
    return `${BRANDS_BASE_URL}/${domain}/icon.png`;
  }
  return undefined;
}

export { RATE_LIMIT_DELAY };
