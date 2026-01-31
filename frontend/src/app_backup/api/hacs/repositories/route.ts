/**
 * GET /api/hacs/repositories
 * 
 * Fetches Home Assistant Community Store (HACS) repositories
 * 
 * CRITICAL: This endpoint uses a CURATED HACS catalog, NOT GitHub search
 * - Only repositories in the catalog are shown
 * - GitHub API is used ONLY to enrich catalog data with metadata (stars, activity, avatar)
 * - Search filters the catalog locally, not GitHub
 * 
 * VALIDATION STRATEGY:
 * 1. Catalog entries are pre-validated in hacs-catalog.ts:
 *    - Repository format must be "owner/repo"
 *    - Integrations MUST have domain field
 *    - Entries must have valid names
 * 2. GitHub repository existence is validated here:
 *    - Only entries with accessible GitHub repositories are included
 *    - Entries where GitHub fetch fails are filtered out (removed/private repos)
 * 
 * This ensures we ONLY list items that can actually be integrated into the system.
 * 
 * @route GET /api/hacs/repositories
 * @query { q?: string, sort?: string, order?: string, per_page?: number }
 * @returns { repositories: Repository[], total: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { searchCatalog, getAllCatalogEntries } from "@/lib/hacs-catalog";
import type { HACSCatalogEntry } from "@/lib/hacs-catalog";
import type { HacsIntegration } from "@/types/hacs";
import { fetchGitHubMetadata, fetchDownloadCount } from "@/lib/hacs-github-utils";
import { getIntegration } from "@/lib/hacs-database";

// Force dynamic rendering to prevent SSR caching issues
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Repository interface matches HacsIntegration for backward compatibility
// In production, we'd use HacsIntegration directly

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInMonths = Math.floor(diffInDays / 30);

  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  } else if (diffInDays === 1) {
    return "yesterday";
  } else if (diffInDays < 30) {
    return `${diffInDays} days ago`;
  } else if (diffInMonths === 1) {
    return "last month";
  } else if (diffInMonths < 12) {
    return `${diffInMonths} months ago`;
  } else {
    return `${Math.floor(diffInMonths / 12)} year${Math.floor(diffInMonths / 12) > 1 ? "s" : ""} ago`;
  }
}

/**
 * Enrich catalog entry with GitHub metadata and system state
 */
async function enrichCatalogEntry(
  catalogEntry: HACSCatalogEntry,
  githubData: Awaited<ReturnType<typeof fetchGitHubMetadata>>,
  downloads: number
): Promise<HacsIntegration> {
  // Get existing integration state from database
  const existing = getIntegration(catalogEntry.id);
  
  // Determine status from database state
  const status = existing?.status || "not_installed";
  
  return {
    id: catalogEntry.id,
    name: catalogEntry.name,
    type: catalogEntry.type,
    github_repo: catalogEntry.fullName,
    version: "latest",
    installed_version: existing?.installed_version || null,
    status: status as "not_installed" | "installing" | "installed",
    last_updated: githubData?.pushed_at || githubData?.updated_at,
    issues_url: githubData?.html_url ? `${githubData.html_url}/issues` : "",
    description: catalogEntry.description,
    stars: githubData?.stargazers_count || 0,
    downloads: downloads,
    activity: githubData
      ? formatTimeAgo(githubData.pushed_at || githubData.updated_at)
      : "unknown",
    avatarUrl: githubData?.owner.avatar_url || "",
    owner: githubData?.owner.login || catalogEntry.fullName.split("/")[0] || "unknown",
    fullName: catalogEntry.fullName,
    restart_required: existing?.restart_required || false,
    last_refreshed_at: existing?.last_refreshed_at || new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const sort = searchParams.get("sort") || "updated";
    const order = searchParams.get("order") || "desc";
    const perPage = parseInt(searchParams.get("per_page") || "30", 10);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10)); // Page number (1-indexed)

    // STEP 1: Filter HACS catalog locally (NOT GitHub search)
    // Catalog is fetched from HACS official data API
    const catalogEntries = query.trim()
      ? await searchCatalog(query.trim())
      : await getAllCatalogEntries();

    // STEP 2: Fetch GitHub metadata and download counts for each catalog entry (enrichment only)
    // Rate limiter ensures we stay under 100 requests/minute (GitHub secondary limit)
    // Process in controlled batches - rate limiter handles throttling automatically
    
    const metadataResults: Awaited<ReturnType<typeof fetchGitHubMetadata>>[] = [];
    const downloadCounts: number[] = [];
    
    // Process in batches of 10 to balance speed and rate limit compliance
    // Rate limiter will automatically throttle requests to stay under 100/minute
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < catalogEntries.length; i += BATCH_SIZE) {
      const batch = catalogEntries.slice(i, i + BATCH_SIZE);
      
      // Process batch with controlled concurrency
      // Rate limiter ensures we don't exceed 100 requests/minute
      const batchPromises = batch.map(async (entry) => {
        const [metadata, downloads] = await Promise.all([
          fetchGitHubMetadata(entry.fullName),
          fetchDownloadCount(entry.fullName),
        ]);
        return { metadata, downloads };
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        metadataResults.push(result.metadata);
        downloadCounts.push(result.downloads);
      }
    }

    // STEP 3: Enrich catalog entries with GitHub metadata and system state
    // FILTER: Only include entries where GitHub repository exists and is accessible
    // This ensures we only show items that can actually be integrated
    const repositories: HacsIntegration[] = [];
    
    for (let i = 0; i < catalogEntries.length; i++) {
      const entry = catalogEntries[i];
      const githubData = metadataResults[i];
      const downloads = downloadCounts[i];
      
      // VALIDATION: Skip entries where GitHub repository doesn't exist or is inaccessible
      // This means the repository was removed, made private, or never existed
      // Without valid GitHub data, we cannot integrate the item
      if (!githubData) {
        console.warn(`[HACS] Skipping entry with inaccessible GitHub repository: ${entry.fullName}`);
        continue; // Skip entries without valid GitHub data
      }
      
      repositories.push(await enrichCatalogEntry(entry, githubData, downloads));
    }

    // STEP 4: Sort repositories
    const sorted = [...repositories].sort((a, b) => {
      if (sort === "stars") {
        return order === "desc" ? b.stars - a.stars : a.stars - b.stars;
      } else if (sort === "name") {
        return order === "desc"
          ? b.name.localeCompare(a.name)
          : a.name.localeCompare(b.name);
      } else if (sort === "downloads") {
        const aDownloads = a.downloads || 0;
        const bDownloads = b.downloads || 0;
        return order === "desc" ? bDownloads - aDownloads : aDownloads - bDownloads;
      } else {
        // Default: sort by activity (last_updated)
        // Parse ISO dates for proper sorting
        const aDate = a.last_updated ? new Date(a.last_updated).getTime() : 0;
        const bDate = b.last_updated ? new Date(b.last_updated).getTime() : 0;
        return order === "desc" ? bDate - aDate : aDate - bDate;
      }
    });

    // STEP 5: Apply pagination
    // Use repositories.length (after filtering) instead of catalogEntries.length
    // This ensures pagination reflects only valid, integrable items
    const totalCount = repositories.length;
    const totalPages = Math.ceil(totalCount / perPage);
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginated = sorted.slice(startIndex, endIndex);

    return NextResponse.json({
      repositories: paginated,
      total: totalCount,
      page: page,
      perPage: perPage,
      totalPages: totalPages,
    });
  } catch (error: any) {
    console.error("HACS API error:", error);

    return NextResponse.json(
      { error: "Failed to fetch repositories", message: error.message },
      { status: 500 }
    );
  }
}
