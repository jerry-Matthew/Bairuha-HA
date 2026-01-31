/**
 * HACS Catalog
 * 
 * Fetches curated list from HACS official data API
 * This is the source of truth - only repos from HACS API appear in the store
 * 
 * GitHub API is used only to enrich this data with stars, activity, etc.
 * 
 * VALIDATION STRATEGY:
 * - Only entries from HACS official data API are included (pre-validated by HACS)
 * - Additional validation ensures entries can actually be integrated:
 *   1. Repository format must be "owner/repo"
 *   2. Integrations MUST have a domain field (required for Home Assistant to load them)
 *   3. Entries must have valid names
 * - GitHub repository existence is validated during enrichment (in repositories route)
 * 
 * HACS Official Data API:
 * - https://data-v2.hacs.xyz/integration/data.json
 * - https://data-v2.hacs.xyz/theme/data.json
 * - https://data-v2.hacs.xyz/plugin/data.json
 */

export interface HACSCatalogEntry {
    id: string;
    fullName: string; // e.g., "user/repo-name"
    name: string;
    description: string;
    type: "Integration" | "Dashboard" | "Plugin" | "Theme";
    domain?: string; // For integrations, the domain from manifest.json
    category?: string; // e.g., "solar", "energy", "climate", etc.
}

interface HACSAPIRepository {
    name: string;
    description: string;
    full_name: string;
    topics?: string[];
    category?: string;
    domain?: string;
}

interface HACSAPIData {
    [key: string]: HACSAPIRepository;
}

const HACS_DATA_API_BASE = "https://data-v2.hacs.xyz";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Use Map to store cache per environment (server vs client)
const cacheStore = new Map<string, { data: HACSCatalogEntry[]; timestamp: number }>();

function getCacheKey(): string {
    // Always use server cache - catalog should only be accessed from API routes
    // This prevents hydration mismatches
    return "server";
}

function getCache(): { data: HACSCatalogEntry[]; timestamp: number } | null {
    return cacheStore.get(getCacheKey()) || null;
}

function setCache(data: HACSCatalogEntry[]): void {
    cacheStore.set(getCacheKey(), { data, timestamp: Date.now() });
}

/**
 * Fetch catalog from HACS official data API
 */
async function fetchHACSCatalog(): Promise<HACSCatalogEntry[]> {
    try {
        const catalogEntries: HACSCatalogEntry[] = [];

        // Fetch all repository types from HACS API
        const types = [
            { type: "Integration", endpoint: "integration" },
            { type: "Theme", endpoint: "theme" },
            { type: "Plugin", endpoint: "plugin" },
        ];

        // Fetch all types in parallel
        // Note: This is called from API routes only, not during SSR
        const responses = await Promise.allSettled(
            types.map(({ endpoint }) =>
                fetch(`${HACS_DATA_API_BASE}/${endpoint}/data.json`, {
                    cache: "no-store", // Always fetch fresh data, cache is handled manually
                }).then((res) => {
                    if (!res.ok) {
                        throw new Error(`Failed to fetch ${endpoint}: ${res.status}`);
                    }
                    return res.json();
                })
            )
        );

        // Process each type
        responses.forEach((result, index) => {
            if (result.status === "fulfilled") {
                const data: HACSAPIData = result.value;
                const type = types[index].type as "Integration" | "Theme" | "Plugin";

                // Convert HACS API format to our catalog format
                // HACS API returns an object where keys are repo IDs and values are repo data
                Object.entries(data).forEach(([key, repo]) => {
                    // Handle different possible API response structures
                    const fullName = repo.full_name || key;
                    const name = repo.name || fullName.split("/")[1] || key;
                    const description = repo.description || "No description available";

                    // VALIDATION: Ensure entry is valid and can be integrated
                    if (!isValidCatalogEntry(repo, type, fullName)) {
                        // Log warning for debugging, but don't spam console
                        if (type === "Integration" && !repo.domain) {
                            console.warn(`[HACS Catalog] Skipping integration without domain: ${fullName}`);
                        }
                        return; // Skip invalid entries
                    }

                    catalogEntries.push({
                        id: fullName.toLowerCase().replace(/\//g, "-"),
                        fullName: fullName,
                        name: name,
                        description: description,
                        type: type,
                        domain: repo.domain,
                        category: repo.category || extractCategory(repo.topics || [], description),
                    });
                });
            } else {
                console.error(`Error fetching ${types[index].endpoint}:`, result.reason);
                // Continue with other types even if one fails
            }
        });

        return catalogEntries;
    } catch (error) {
        console.error("Error fetching HACS catalog:", error);
        // Return empty array on error - API route will handle gracefully
        return [];
    }
}

/**
 * Validate that a catalog entry can be integrated
 * Returns true if entry is valid, false otherwise
 */
function isValidCatalogEntry(
    repo: HACSAPIRepository,
    type: "Integration" | "Theme" | "Plugin",
    fullName: string
): boolean {
    // 1. Validate full_name format (must be "owner/repo")
    if (!fullName || !fullName.includes("/") || fullName.split("/").length !== 2) {
        return false;
    }

    // 2. For integrations, domain is REQUIRED (from manifest.json)
    // Without domain, the integration cannot be loaded by Home Assistant
    if (type === "Integration" && !repo.domain) {
        return false;
    }

    // 3. Validate name exists
    const name = repo.name || fullName.split("/")[1];
    if (!name || name.trim().length === 0) {
        return false;
    }

    return true;
}

/**
 * Extract category from topics or description
 */
function extractCategory(topics: string[], description: string): string | undefined {
    const lowerDescription = description.toLowerCase();

    // Check for common categories
    if (topics.some((t) => t.toLowerCase().includes("solar")) || lowerDescription.includes("solar")) {
        return "solar";
    }
    if (topics.some((t) => t.toLowerCase().includes("energy")) || lowerDescription.includes("energy")) {
        return "energy";
    }
    if (topics.some((t) => t.toLowerCase().includes("climate")) || lowerDescription.includes("climate")) {
        return "climate";
    }
    if (topics.some((t) => t.toLowerCase().includes("security")) || lowerDescription.includes("security")) {
        return "security";
    }

    return undefined;
}

/**
 * Get all catalog entries (with caching)
 */
export async function getAllCatalogEntries(): Promise<HACSCatalogEntry[]> {
    const now = Date.now();
    const cache = getCache();

    // Return cached data if still valid
    if (cache && now - cache.timestamp < CACHE_DURATION) {
        return cache.data;
    }

    // Fetch fresh data
    try {
        const freshData = await fetchHACSCatalog();
        setCache(freshData);

        // If fetch failed and we have old cache, return it
        if (freshData.length === 0 && cache) {
            console.warn("HACS API fetch returned empty, using stale cache");
            return cache.data;
        }

        return freshData;
    } catch (error) {
        console.error("Error fetching HACS catalog:", error);
        // Return cached data if available, even if stale
        if (cache) {
            console.warn("Using stale cache due to fetch error");
            return cache.data;
        }
        // Return empty array if no cache available
        return [];
    }
}

/**
 * Search catalog entries by query
 * Searches in name, description, and domain
 */
export async function searchCatalog(query: string): Promise<HACSCatalogEntry[]> {
    const allEntries = await getAllCatalogEntries();

    if (!query.trim()) {
        return allEntries;
    }

    const lowerQuery = query.toLowerCase();

    return allEntries.filter((entry) => {
        return (
            entry.name.toLowerCase().includes(lowerQuery) ||
            entry.description.toLowerCase().includes(lowerQuery) ||
            entry.domain?.toLowerCase().includes(lowerQuery) ||
            entry.category?.toLowerCase().includes(lowerQuery) ||
            entry.fullName.toLowerCase().includes(lowerQuery)
        );
    });
}

/**
 * Get catalog entry by full name or ID
 */
export async function getCatalogEntryByFullName(fullNameOrId: string): Promise<HACSCatalogEntry | undefined> {
    const allEntries = await getAllCatalogEntries();
    return allEntries.find(
        (entry) =>
            entry.fullName.toLowerCase() === fullNameOrId.toLowerCase() ||
            entry.id.toLowerCase() === fullNameOrId.toLowerCase()
    );
}
