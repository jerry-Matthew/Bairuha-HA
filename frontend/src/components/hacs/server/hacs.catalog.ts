/**
 * HACS Catalog Service
 * 
 * Fetches and validates catalog entries from HACS official data API
 * Only Home Assistant-compatible extensions are included
 */

import { getAllCatalogEntries, getCatalogEntryByFullName, type HACSCatalogEntry } from "@/lib/hacs-catalog";
import { fetchGitHubMetadata } from "@/lib/hacs-github-utils";
import { getIntegration } from "@/lib/hacs-database";
import type { HacsExtension, ExtensionType } from "./hacs.types";

/**
 * Map HACS catalog type to our extension type
 */
function mapCatalogType(catalogType: string): ExtensionType {
  switch (catalogType.toLowerCase()) {
    case "integration":
      return "integration";
    case "plugin":
      return "frontend";
    case "theme":
      return "theme";
    case "dashboard":
      return "panel";
    default:
      return "integration";
  }
}

/**
 * Convert HACS catalog entry + GitHub metadata to HacsExtension
 */
export async function enrichCatalogEntry(
  catalogEntry: HACSCatalogEntry,
  githubMetadata: any,
  installedVersion?: string | null,
  status: "not_installed" | "installing" | "installed" = "not_installed"
): Promise<HacsExtension> {
  const id = catalogEntry.id;
  const githubRepo = catalogEntry.fullName;

  // Format last activity
  const lastActivity = githubMetadata?.pushed_at
    ? formatActivityDate(githubMetadata.pushed_at)
    : "Unknown";

  // Estimate downloads from stars (fast, non-blocking)
  // Actual download counts require fetching all releases which is very slow
  // For now, use a simple estimation based on stars
  const stars = githubMetadata?.stargazers_count || 0;
  const downloads = Math.floor(stars * 10); // Rough estimate: 10x stars

  return {
    id,
    name: catalogEntry.name,
    description: catalogEntry.description || "No description available",
    type: mapCatalogType(catalogEntry.type),
    githubRepo,
    stars,
    downloads,
    lastActivity,
    version: "latest", // Version would come from releases API
    installedVersion: installedVersion || null,
    status,
    restartRequired: false,
    avatarUrl: githubMetadata?.owner?.avatar_url,
  };
}

/**
 * Format activity date to human-readable string
 */
function formatActivityDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years > 1 ? "s" : ""} ago`;
  }
}

/**
 * Get all catalog entries enriched with GitHub metadata
 */
export async function getEnrichedCatalog(
  searchQuery?: string,
  page: number = 1,
  perPage: number = 10
): Promise<{
  extensions: HacsExtension[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}> {
  // Get catalog entries (filtered by search if provided)
  let catalogEntries: HACSCatalogEntry[];
  if (searchQuery?.trim()) {
    const allEntries = await getAllCatalogEntries();
    const lowerQuery = searchQuery.toLowerCase();
    catalogEntries = allEntries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(lowerQuery) ||
        entry.description.toLowerCase().includes(lowerQuery) ||
        entry.fullName.toLowerCase().includes(lowerQuery)
    );
  } else {
    catalogEntries = await getAllCatalogEntries();
  }

  const total = catalogEntries.length;
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const paginatedEntries = catalogEntries.slice(start, end);

  // Enrich with GitHub metadata (in parallel, but rate-limited)
  const enrichedExtensions = await Promise.all(
    paginatedEntries.map(async (entry) => {
      try {
        const githubMetadata = await fetchGitHubMetadata(entry.fullName);
        if (!githubMetadata) {
          // Skip entries where GitHub repo doesn't exist
          return null;
        }
        // Check database for installed version
        const existing = getIntegration(entry.id);
        return enrichCatalogEntry(
          entry,
          githubMetadata,
          existing?.installedVersion,
          existing?.status || "not_installed"
        );
      } catch (error) {
        console.error(`Error enriching ${entry.fullName}:`, error);
        return null;
      }
    })
  );

  // Filter out null entries
  const extensions = enrichedExtensions.filter(
    (ext): ext is HacsExtension => ext !== null
  );

  return {
    extensions,
    total,
    page,
    perPage,
    totalPages,
  };
}

/**
 * Get single extension by ID
 */
export async function getExtensionById(id: string): Promise<HacsExtension | null> {
  const allEntries = await getAllCatalogEntries();
  const entry = allEntries.find((e) => e.id === id);

  if (!entry) {
    return null;
  }

  try {
    const githubMetadata = await fetchGitHubMetadata(entry.fullName);
    if (!githubMetadata) {
      return null;
    }
    // Check database for installed version
    const existing = getIntegration(id);
    return enrichCatalogEntry(
      entry,
      githubMetadata,
      existing?.installedVersion,
      existing?.status || "not_installed"
    );
  } catch (error) {
    console.error(`Error fetching extension ${id}:`, error);
    return null;
  }
}

