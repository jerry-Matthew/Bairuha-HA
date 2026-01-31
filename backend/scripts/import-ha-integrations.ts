/**
 * Import Full Home Assistant Integration Catalog
 * 
 * Imports 2000+ integrations from Home Assistant's GitHub repository
 * by parsing manifest.json files and bulk importing into integration_catalog table.
 * 
 * Usage:
 *   tsx scripts/import-ha-integrations.ts                    # Full import
 *   tsx scripts/import-ha-integrations.ts --dry-run          # Preview only
 *   tsx scripts/import-ha-integrations.ts --limit 10         # Test with 10 integrations
 *   tsx scripts/import-ha-integrations.ts --skip-existing    # Only import new
 */

// Load environment variables from .env FIRST (before importing db module)
import * as dotenv from "dotenv";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env");
if (require("fs").existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import { query, transaction } from "./db";

// GitHub API configuration
const GITHUB_REPO = "home-assistant/core";
const GITHUB_API_BASE = "https://api.github.com";
const COMPONENTS_PATH = "homeassistant/components";
const BRANDS_REPO = "home-assistant/brands";
const BRANDS_BASE_URL = "https://brands.home-assistant.io";

// Rate limiting: 60 requests/hour unauthenticated, 5000/hour authenticated
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const RATE_LIMIT_DELAY = GITHUB_TOKEN ? 100 : 1000; // ms between requests

// Flow type definitions
type FlowType = 'none' | 'manual' | 'discovery' | 'oauth' | 'wizard' | 'hybrid';

interface FlowConfig {
  discovery_protocols?: {
    dhcp?: any[];
    zeroconf?: any[];
    ssdp?: any[];
    homekit?: any;
  };
  oauth_provider?: string;
  scopes?: string[];
  authorization_url?: string;
  token_url?: string;
  steps?: Array<{
    step_id: string;
    title: string;
    schema: any;
  }>;
  [key: string]: any; // Allow other flow-specific config
}

// Interfaces
interface HAManifest {
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
  [key: string]: any; // Allow other fields
}

interface CatalogEntry {
  domain: string;
  name: string;
  description?: string;
  icon?: string;
  supports_devices: boolean;
  is_cloud: boolean;
  documentation_url?: string;
  brand_image_url?: string;
  // Flow metadata fields
  flow_type: FlowType;
  flow_config?: FlowConfig;
  handler_class?: string;
  metadata?: Record<string, any>;
}

interface ImportResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ domain: string; error: string }>;
}

interface GitHubTreeItem {
  path: string;
  type: "file" | "dir" | "tree";
  sha: string;
  url: string;
}

interface GitHubContent {
  name: string;
  path: string;
  type: "file" | "dir" | "tree";
  sha?: string;
  download_url: string | null;
  content?: string;
  encoding?: string;
}

// Helper: Sleep for rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Fetch with retry and error handling
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Bairuha-HA-Import-Script",
    ...(options.headers as Record<string, string> || {}),
  };

  if (GITHUB_TOKEN) {
    headers["Authorization"] = `token ${GITHUB_TOKEN}`;
  }

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { ...options, headers });

      // Handle rate limiting
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
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }

  throw new Error("Failed after retries");
}

// Fetch list of all integration domains from GitHub using Tree API (bypasses 1000 file limit)
async function fetchHAIntegrationDomains(): Promise<string[]> {
  console.log("📡 Fetching integration list from GitHub (using Tree API)...");

  // Get the SHA of the 'dev' branch (or specific tag) to ensure consistency
  // Then get the tree recursively
  // For simplicity, we'll try to get the tree of the components folder directly if possible,
  // or get the main tree and filter.
  // Actually, the best way for a specific large folder is:
  // 1. Get default branch SHA
  // 2. Get tree recursively? No, that's too huge.
  // 3. GitHub API 'Get repository content' is limited to 1000.
  // The workaround is to use the Tree API.
  // We need to find the SHA of 'homeassistant/components' first.

  // Step 1: Get the main tree (root) to find 'homeassistant' folder SHA
  // Then 'homeassistant' folder to find 'components' folder SHA
  // Then 'components' tree to get all integrations.

  // However, simpler approach: Use the recursive tree of the repo and filter paths starting with 'homeassistant/components/'
  // But that is HUGE.
  // Better: We already know the path. we can try to get the tree of that specific path? 
  // Git Trees API requires a SHA.

  // Let's first get the SHA of 'homeassistant/components'.
  // We can do this by getting the content of 'homeassistant' dir (should be small) and finding 'components'.

  // 1. Get 'homeassistant' dir contents
  const haDirUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/homeassistant`;
  const haDirResponse = await fetchWithRetry(haDirUrl);
  if (!haDirResponse.ok) throw new Error(`Failed to fetch homeassistant dir: ${haDirResponse.statusText}`);
  const haDirItems = await haDirResponse.json() as GitHubContent[];
  const componentsItem = haDirItems.find(item => item.name === "components");

  if (!componentsItem) throw new Error("Could not find components directory");

  // 2. Get the Tree of the components directory using its SHA
  // This allows listing > 1000 items
  const treeUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/git/trees/${componentsItem.sha}`;
  const treeResponse = await fetchWithRetry(treeUrl);

  if (!treeResponse.ok) {
    throw new Error(`Failed to fetch components tree: ${treeResponse.statusText}`);
  }

  const treeData = await treeResponse.json() as { tree: GitHubTreeItem[], truncated: boolean };

  if (treeData.truncated) {
    console.warn("⚠️  Warning: Tree response was truncated. We might still be missing some items.");
  }

  // Filter: only directories, exclude __pycache__, tests, etc.
  const domains = treeData.tree
    .filter(item => item.type === "tree") // 'tree' is directory in Git API
    .filter(item => !item.path.startsWith("__") && item.path !== "tests")
    .map(item => item.path)
    .sort();

  console.log(`✅ Found ${domains.length} integration domains (Tree API)`);
  return domains;
}

// Fetch manifest.json for a specific integration
async function fetchManifest(domain: string): Promise<HAManifest | null> {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${COMPONENTS_PATH}/${domain}/manifest.json`;

  try {
    const response = await fetchWithRetry(url);

    if (response.status === 404) {
      return null; // No manifest.json for this integration
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.json() as GitHubContent;

    // Decode base64 content
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

// Fetch list of all domains that have brand images from GitHub brands repository
// This is much more efficient than checking each domain individually
async function fetchBrandImageDomains(): Promise<Set<string>> {
  const brandDomains = new Set<string>();

  try {
    console.log("📡 Fetching brand image domains from GitHub brands repository...");

    // Fetch both core_integrations and custom_integrations directories
    const coreUrl = `${GITHUB_API_BASE}/repos/${BRANDS_REPO}/contents/core_integrations`;
    const customUrl = `${GITHUB_API_BASE}/repos/${BRANDS_REPO}/contents/custom_integrations`;

    const [coreResponse, customResponse] = await Promise.all([
      fetchWithRetry(coreUrl).catch(() => null),
      fetchWithRetry(customUrl).catch(() => null),
    ]);

    // Process core integrations
    if (coreResponse && coreResponse.ok) {
      const coreItems = await coreResponse.json() as GitHubContent[];
      coreItems
        .filter(item => item.type === "dir")
        .forEach(item => brandDomains.add(item.name));
    }

    // Process custom integrations
    if (customResponse && customResponse.ok) {
      const customItems = await customResponse.json() as GitHubContent[];
      customItems
        .filter(item => item.type === "dir")
        .forEach(item => brandDomains.add(item.name));
    }

    console.log(`✅ Found ${brandDomains.size} domains with brand images`);
    return brandDomains;
  } catch (error: any) {
    console.warn(`⚠️  Could not fetch brand image domains: ${error.message}`);
    console.warn("   Brand images will be loaded on-demand by the UI");
    return brandDomains; // Return empty set, UI will handle on-demand loading
  }
}

// Get brand image URL for a domain (if it exists in the brands repository)
function getBrandImageUrl(domain: string, brandDomains: Set<string>): string | undefined {
  if (brandDomains.has(domain)) {
    // Return URL - UI will try icon.png first, then logo.png
    return `${BRANDS_BASE_URL}/${domain}/icon.png`;
  }
  return undefined;
}

// Flow type detection functions

/**
 * Check if manifest has OAuth indicators
 */
function hasOAuthIndicators(manifest: HAManifest): boolean {
  // Look for OAuth-related fields or dependencies
  // Common patterns: 'oauth2', 'authlib', etc.
  const oauthKeywords = ['oauth', 'authlib', 'google', 'spotify', 'nest'];
  const deps = [...(manifest.dependencies || []), ...(manifest.requirements || [])];
  return deps.some(dep => oauthKeywords.some(keyword => dep.toLowerCase().includes(keyword)));
}

/**
 * Detect flow type from Home Assistant manifest
 */
function detectFlowType(manifest: HAManifest): FlowType {
  // No config flow
  if (!manifest.config_flow) {
    return 'none';
  }

  // Check for OAuth indicators
  if (hasOAuthIndicators(manifest)) {
    return 'oauth';
  }

  // Check for discovery protocols
  const hasDiscovery = !!(manifest.dhcp || manifest.zeroconf || manifest.ssdp || manifest.homekit);
  if (hasDiscovery) {
    // Could be discovery-only or hybrid
    // For now, mark as discovery (Task 57 will handle hybrid detection)
    return 'discovery';
  }

  // Default to manual for config_flow: true
  return 'manual';
}

/**
 * Build flow configuration from manifest
 */
function buildFlowConfig(manifest: HAManifest): FlowConfig | undefined {
  const config: FlowConfig = {};

  // Discovery protocols
  const discoveryProtocols: any = {};
  if (manifest.dhcp) discoveryProtocols.dhcp = manifest.dhcp;
  if (manifest.zeroconf) discoveryProtocols.zeroconf = manifest.zeroconf;
  if (manifest.ssdp) discoveryProtocols.ssdp = manifest.ssdp;
  if (manifest.homekit) discoveryProtocols.homekit = manifest.homekit;

  if (Object.keys(discoveryProtocols).length > 0) {
    config.discovery_protocols = discoveryProtocols;
  }

  // Return undefined if no flow config needed
  return Object.keys(config).length > 0 ? config : undefined;
}

/**
 * Build metadata object from manifest
 */
function buildMetadata(manifest: HAManifest): Record<string, any> {
  // Store additional manifest fields that might be useful
  const metadata: Record<string, any> = {};

  if (manifest.requirements) metadata.requirements = manifest.requirements;
  if (manifest.dependencies) metadata.dependencies = manifest.dependencies;
  if (manifest.after_dependencies) metadata.after_dependencies = manifest.after_dependencies;
  if (manifest.codeowners) metadata.codeowners = manifest.codeowners;
  if (manifest.iot_class) metadata.iot_class = manifest.iot_class;

  // Store other fields for future use
  return metadata;
}

// Map Home Assistant manifest to catalog entry
function mapManifestToCatalog(manifest: HAManifest, domain: string): CatalogEntry {
  // Extract name (fallback to domain if missing)
  const name = manifest.name || domain.split("_").map(w =>
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(" ");

  // Extract documentation URL
  let documentation_url: string | undefined;
  if (manifest.documentation) {
    if (typeof manifest.documentation === "string") {
      documentation_url = manifest.documentation;
    } else if (Array.isArray(manifest.documentation) && manifest.documentation.length > 0) {
      documentation_url = manifest.documentation[0];
    }
  }

  // Determine if cloud-based
  const is_cloud = manifest.iot_class === "cloud_polling" ||
    manifest.iot_class === "cloud_push";

  // Determine if supports devices
  // Most integrations with config_flow or iot_class support devices
  // Platform-only integrations typically don't have these
  const supports_devices = manifest.config_flow === true ||
    manifest.iot_class !== undefined ||
    manifest.dhcp !== undefined ||
    manifest.zeroconf !== undefined ||
    manifest.ssdp !== undefined ||
    manifest.homekit !== undefined;

  // Generate description
  const description = `Home Assistant ${name} integration${manifest.config_flow ? " (supports config flow)" : ""}`;

  // Infer icon from domain (Material Design Icons format)
  // Common patterns: mdi:lightbulb, mdi:thermostat, etc.
  const icon = inferIconFromDomain(domain);

  // Detect flow type and build flow metadata
  const flowType = detectFlowType(manifest);
  const flowConfig = buildFlowConfig(manifest);
  const metadata = buildMetadata(manifest);

  return {
    domain: manifest.domain || domain,
    name,
    description,
    icon,
    supports_devices,
    is_cloud,
    documentation_url,
    flow_type: flowType,
    flow_config: flowConfig,
    handler_class: undefined, // Can be populated later or from manifest
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

// Add brand image URL to catalog entry if available
function addBrandImageUrl(entry: CatalogEntry, brandDomains: Set<string>): CatalogEntry {
  const brandImageUrl = getBrandImageUrl(entry.domain, brandDomains);
  return {
    ...entry,
    brand_image_url: brandImageUrl,
  };
}

// Infer Material Design Icon from domain name
function inferIconFromDomain(domain: string): string {
  const iconMap: Record<string, string> = {
    // Common platform patterns
    light: "mdi:lightbulb",
    switch: "mdi:toggle-switch",
    sensor: "mdi:gauge",
    climate: "mdi:thermostat",
    cover: "mdi:window-shutter",
    fan: "mdi:fan",
    lock: "mdi:lock",
    camera: "mdi:cctv",
    media_player: "mdi:play-circle",
    alarm: "mdi:alarm",
    weather: "mdi:weather-cloudy",
    vacuum: "mdi:robot-vacuum",
    water_heater: "mdi:water-thermometer",
    binary_sensor: "mdi:radiobox-marked",

    // Protocol/Bridge patterns
    zigbee: "mdi:zigbee",
    zwave: "mdi:zwave",
    zwave_js: "mdi:zwave",
    mqtt: "mdi:message-text",
    bluetooth: "mdi:bluetooth",
    bluetooth_le: "mdi:bluetooth",
    wifi: "mdi:wifi",
    matter: "mdi:molecule",

    // Brand-specific - major brands
    philips_hue: "mdi:lightbulb",
    hue: "mdi:lightbulb",
    nest: "mdi:google-nest",
    google: "mdi:google",
    google_assistant: "mdi:google-assistant",
    alexa: "mdi:amazon-alexa",
    amazon_alexa: "mdi:amazon-alexa",
    apple: "mdi:apple",
    apple_tv: "mdi:apple",
    homekit: "mdi:home",
    sonos: "mdi:speaker",
    spotify: "mdi:spotify",

    // Smart home brands
    ring: "mdi:doorbell-video",
    wyze: "mdi:camera",
    tuya: "mdi:cloud",
    shelly: "mdi:lightning-bolt",
    tasmota: "mdi:flash",
    esphome: "mdi:chip",
    lifx: "mdi:lightbulb-on",
    nanoleaf: "mdi:hexagon-multiple",
    govee: "mdi:led-strip",

    // Security
    abode: "mdi:security",
    simplisafe: "mdi:shield-home",
    adt: "mdi:shield",

    // Thermostats
    ecobee: "mdi:thermostat",
    honeywell: "mdi:thermostat-box",
    sensi: "mdi:thermostat",

    // Locks
    august: "mdi:lock-smart",
    schlage: "mdi:lock",
    yale: "mdi:lock-outline",

    // Media
    roku: "mdi:roku",
    samsungtv: "mdi:television",

    // Keyword-based patterns (check these after exact matches)
    temp: "mdi:thermometer",
    temperature: "mdi:thermometer",
    humidity: "mdi:water-percent",
    motion: "mdi:motion-sensor",
    door: "mdi:door",
    window: "mdi:window-open",
    smoke: "mdi:smoke-detector",
    co2: "mdi:molecule-co2",
    water: "mdi:water",
    leak: "mdi:water-alert",
    battery: "mdi:battery",
    power: "mdi:power",
    energy: "mdi:lightning-bolt",
    meter: "mdi:gauge",
    pool: "mdi:pool",
    spa: "mdi:hot-tub",
    garage: "mdi:garage",
    gate: "mdi:gate",
    irrigation: "mdi:sprinkler",
    lawn: "mdi:flower",
    garden: "mdi:flower",
    cleaner: "mdi:vacuum",
    robot: "mdi:robot",
    car: "mdi:car",
    vehicle: "mdi:car",
    ev: "mdi:car-electric",
    charger: "mdi:ev-station",
  };

  // Normalize domain for matching
  const normalized = domain.toLowerCase();

  // Check exact match first
  if (iconMap[normalized]) {
    return iconMap[normalized];
  }

  // Check if domain contains common keywords (prioritize more specific matches)
  const matches: Array<{ key: string; icon: string; length: number }> = [];
  for (const [key, icon] of Object.entries(iconMap)) {
    if (normalized.includes(key)) {
      matches.push({ key, icon, length: key.length });
    }
  }

  // Return the longest matching key (most specific match)
  if (matches.length > 0) {
    matches.sort((a, b) => b.length - a.length);
    return matches[0].icon;
  }

  // Try to infer from common domain patterns
  if (normalized.includes("lock") || normalized.includes("lock_")) {
    return "mdi:lock";
  }
  if (normalized.includes("camera") || normalized.includes("cam")) {
    return "mdi:cctv";
  }
  if (normalized.includes("light") || normalized.includes("lamp")) {
    return "mdi:lightbulb";
  }
  if (normalized.includes("door") || normalized.includes("gate")) {
    return "mdi:door";
  }
  if (normalized.includes("window") || normalized.includes("blind") || normalized.includes("shade")) {
    return "mdi:window-shutter";
  }
  if (normalized.includes("thermostat") || normalized.includes("climate")) {
    return "mdi:thermostat";
  }
  if (normalized.includes("fan") || normalized.includes("vent")) {
    return "mdi:fan";
  }
  if (normalized.includes("sensor") || normalized.includes("detector")) {
    return "mdi:gauge";
  }
  if (normalized.includes("switch") || normalized.includes("outlet") || normalized.includes("plug")) {
    return "mdi:toggle-switch";
  }

  // Default icon
  return "mdi:package-variant";
}

// Import integrations into database
async function importIntegrations(
  entries: CatalogEntry[],
  dryRun: boolean,
  skipExisting: boolean
): Promise<ImportResult> {
  const result: ImportResult = {
    total: 0, // Will track total manifests found
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  if (dryRun) {
    console.log("\n🔍 DRY RUN MODE - No database changes will be made\n");
  }

  // Process in batches for better performance
  const BATCH_SIZE = 50;
  const batches: CatalogEntry[][] = [];

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    batches.push(entries.slice(i, i + BATCH_SIZE));
  }

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    if (!dryRun) {
      await transaction(async (client) => {
        for (const entry of batch) {
          try {
            // Start a savepoint for this entry so failures don't abort the main transaction
            await client.query("SAVEPOINT entry_sp");

            // Check if exists
            const existing = await client.query(
              `SELECT domain FROM integration_catalog WHERE domain = $1`,
              [entry.domain]
            );

            if (existing.rowCount && existing.rowCount > 0) {
              if (skipExisting) {
                // Release savepoint - no changes made/failed
                await client.query("RELEASE SAVEPOINT entry_sp");
                result.skipped++;
                continue;
              }

              // Update existing
              await client.query(
                `UPDATE integration_catalog 
                 SET name = $2, description = $3, icon = $4, 
                     supports_devices = $5, is_cloud = $6, documentation_url = $7, brand_image_url = $8,
                     flow_type = $9, flow_config = $10, handler_class = $11, metadata = $12
                 WHERE domain = $1`,
                [
                  entry.domain,
                  entry.name,
                  entry.description || null,
                  entry.icon || null,
                  entry.supports_devices,
                  entry.is_cloud,
                  entry.documentation_url || null,
                  entry.brand_image_url || null,
                  entry.flow_type,
                  entry.flow_config ? JSON.stringify(entry.flow_config) : null,
                  entry.handler_class || null,
                  entry.metadata ? JSON.stringify(entry.metadata) : null,
                ]
              );
              result.updated++;
            } else {
              // Insert new
              await client.query(
                `INSERT INTO integration_catalog 
                 (domain, name, description, icon, supports_devices, is_cloud, documentation_url, brand_image_url,
                  flow_type, flow_config, handler_class, metadata)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                  entry.domain,
                  entry.name,
                  entry.description || null,
                  entry.icon || null,
                  entry.supports_devices,
                  entry.is_cloud,
                  entry.documentation_url || null,
                  entry.brand_image_url || null,
                  entry.flow_type,
                  entry.flow_config ? JSON.stringify(entry.flow_config) : null,
                  entry.handler_class || null,
                  entry.metadata ? JSON.stringify(entry.metadata) : null,
                ]
              );
              result.imported++;
            }

            // Release savepoint on success
            await client.query("RELEASE SAVEPOINT entry_sp");

          } catch (error: any) {
            // Rollback to savepoint to salvage the transaction for other entries
            await client.query("ROLLBACK TO SAVEPOINT entry_sp");

            result.errors++;
            result.errorDetails.push({
              domain: entry.domain,
              error: error.message,
            });
            console.error(`  ✗ Error processing ${entry.domain}:`, error.message);
          }
        }
      });
    } else {
      // Dry run: just count what would happen
      for (const entry of batch) {
        const existing = await query(
          `SELECT domain FROM integration_catalog WHERE domain = $1`,
          [entry.domain]
        );

        if (existing.rowCount && existing.rowCount > 0) {
          if (skipExisting) {
            result.skipped++;
          } else {
            result.updated++;
          }
        } else {
          result.imported++;
        }
      }
    }

    // Progress reporting
    const processed = (batchIdx + 1) * BATCH_SIZE;
    const progress = Math.min(processed, entries.length);
    const percent = Math.round((progress / entries.length) * 100);
    console.log(`  Progress: ${progress}/${entries.length} (${percent}%)`);
  }

  return result;
}

// Main import function
async function importHAIntegrations(options: {
  dryRun?: boolean;
  limit?: number;
  skipExisting?: boolean;
}) {
  const { dryRun = false, limit, skipExisting = false } = options;

  try {
    console.log("🚀 Starting Home Assistant Integration Catalog Import\n");

    // Fetch brand image domains first (efficient batch fetch - only 2 API calls)
    const brandDomains = await fetchBrandImageDomains();

    // Fetch integration domains
    const componentDomains = await fetchHAIntegrationDomains();

    // Merge domains from brands that might be missing from components list
    // (GitHub Tree API might have missed some or brands has legacy ones)
    const allDomains = new Set([...componentDomains, ...brandDomains]);
    let domains = Array.from(allDomains).sort();

    console.log(`✅ Merged list has ${domains.length} total domains to check`);

    // Apply limit if specified (for testing)
    if (limit) {
      domains = domains.slice(0, limit);
      console.log(`⚠️  Limited to first ${limit} integrations for testing\n`);
    }

    console.log(`📦 Fetching manifests for ${domains.length} integrations...\n`);

    // Aggregate results from batch imports
    const result: ImportResult = {
      total: 0,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [],
    };
    const fetchErrors: Array<{ domain: string; error: string }> = [];

    // Buffer for batch processing
    let entryBuffer: CatalogEntry[] = [];
    const SAVE_BATCH_SIZE = 20;

    // Fetch manifests with rate limiting
    for (let i = 0; i < domains.length; i++) {
      const domain = domains[i];

      try {
        // Apply rate limiting delay
        if (i > 0 && i % 10 === 0) {
          await sleep(RATE_LIMIT_DELAY);
        }

        const manifest = await fetchManifest(domain);

        let entryToBuffer: CatalogEntry;

        if (!manifest) {
          // No manifest.json - create basic entry
          entryToBuffer = {
            domain,
            name: domain.split("_").map(w =>
              w.charAt(0).toUpperCase() + w.slice(1)
            ).join(" "),
            description: `Home Assistant ${domain} integration`,
            icon: inferIconFromDomain(domain),
            supports_devices: false, // Unknown without manifest
            is_cloud: false,
            flow_type: 'none', // No config flow without manifest
          };
        } else {
          // Validate manifest has domain
          if (!manifest.domain) {
            manifest.domain = domain;
          }
          entryToBuffer = mapManifestToCatalog(manifest, domain);
        }

        const enrichedEntry = addBrandImageUrl(entryToBuffer, brandDomains);
        entryBuffer.push(enrichedEntry);
        result.total++;

        // Process batch if full
        if (entryBuffer.length >= SAVE_BATCH_SIZE) {
          console.log(`\n💾 Saving batch of ${entryBuffer.length} integrations...`);
          const batchResult = await importIntegrations(entryBuffer, dryRun, skipExisting);

          result.imported += batchResult.imported;
          result.updated += batchResult.updated;
          result.skipped += batchResult.skipped;
          result.errors += batchResult.errors;
          result.errorDetails.push(...batchResult.errorDetails);

          entryBuffer = [];
        }

        // Progress indicator
        if ((i + 1) % 50 === 0 || i === domains.length - 1) {
          console.log(`  Fetched ${i + 1}/${domains.length} manifests...`);
        }
      } catch (error: any) {
        fetchErrors.push({ domain, error: error.message });
        console.error(`  ✗ Error fetching ${domain}:`, error.message);
      }

      // Small delay between requests
      await sleep(RATE_LIMIT_DELAY);
    }

    console.log(`\n✅ Fetched and processed manifests`);
    if (fetchErrors.length > 0) {
      console.log(`⚠️  ${fetchErrors.length} fetch errors encountered`);
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 IMPORT SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total integrations processed: ${result.total}`);
    console.log(`✅ New integrations: ${result.imported}`);
    console.log(`🔄 Updated integrations: ${result.updated}`);
    console.log(`⏭️  Skipped (existing): ${result.skipped}`);
    console.log(`❌ Errors: ${result.errors}`);

    if (result.errorDetails.length > 0) {
      console.log("\n❌ Error Details:");
      result.errorDetails.slice(0, 10).forEach(({ domain, error }) => {
        console.log(`   ${domain}: ${error}`);
      });
      if (result.errorDetails.length > 10) {
        console.log(`   ... and ${result.errorDetails.length - 10} more errors`);
      }
    }

    if (dryRun) {
      console.log("\n⚠️  DRY RUN - No changes were made to the database");
    }

    console.log("\n✅ Import complete!\n");

    return result;
  } catch (error: any) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    dryRun?: boolean;
    limit?: number;
    skipExisting?: boolean;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--dry-run" || arg === "-d") {
      options.dryRun = true;
    } else if (arg === "--limit" || arg === "-l") {
      const limit = parseInt(args[++i], 10);
      if (!isNaN(limit)) {
        options.limit = limit;
      }
    } else if (arg === "--skip-existing" || arg === "-s") {
      options.skipExisting = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: tsx scripts/import-ha-integrations.ts [options]

Options:
  --dry-run, -d          Preview import without making database changes
  --limit N, -l N        Limit to first N integrations (for testing)
  --skip-existing, -s     Skip integrations that already exist
  --help, -h             Show this help message

Environment Variables:
  GITHUB_TOKEN           GitHub token for higher rate limits (optional)
      `);
      process.exit(0);
    }
  }

  return options;
}

// Run if called directly
if (require.main === module) {
  const options = parseArgs();

  importHAIntegrations(options)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

export { importHAIntegrations, mapManifestToCatalog, fetchHAIntegrationDomains, inferIconFromDomain };
