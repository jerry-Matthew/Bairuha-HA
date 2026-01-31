/**
 * Shared GitHub utilities for HACS
 * 
 * Moved from app/api/hacs/[id]/utils.ts to avoid import path issues with dynamic routes
 * Implements industry-standard rate limiting and error handling
 */

import { githubRateLimiter } from "./github-rate-limiter";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN?.replace(/^["']|["']$/g, "").trim();

export interface GitHubRepositoryMetadata {
    id: number;
    name: string;
    full_name: string;
    description: string;
    stargazers_count: number;
    updated_at: string;
    pushed_at: string;
    html_url: string;
    owner: {
        login: string;
        avatar_url: string;
        html_url?: string;
    };
}

/**
 * Fetch GitHub repository metadata
 * Uses rate limiter to respect GitHub API limits
 */
export async function fetchGitHubMetadata(fullName: string): Promise<GitHubRepositoryMetadata | null> {
    try {
        const headers: HeadersInit = {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "HomeAssistant-Frontend",
        };

        if (GITHUB_TOKEN) {
            headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
        }

        const response = await githubRateLimiter.executeRequest(() =>
            fetch(`${GITHUB_API_BASE}/repos/${fullName}`, { headers })
        );

        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            return null;
        }

        return await response.json();
    } catch (error) {
        // Only log non-rate-limit errors to reduce noise
        if (error instanceof Error && !error.message.includes("rate limit")) {
            console.error(`Error fetching GitHub metadata for ${fullName}:`, error.message);
        }
        return null;
    }
}

/**
 * Fetch README content from GitHub
 * Uses rate limiter to respect GitHub API limits
 */
export async function fetchReadme(fullName: string): Promise<string | null> {
    try {
        const headers: HeadersInit = {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "HomeAssistant-Frontend",
        };

        if (GITHUB_TOKEN) {
            headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
        }

        const response = await githubRateLimiter.executeRequest(() =>
            fetch(`${GITHUB_API_BASE}/repos/${fullName}/readme`, { headers })
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        // Decode base64 content
        if (data.content) {
            const content = Buffer.from(data.content, "base64").toString("utf-8");
            return content;
        }

        return null;
    } catch (error) {
        if (error instanceof Error && !error.message.includes("rate limit")) {
            console.error(`Error fetching README for ${fullName}:`, error.message);
        }
        return null;
    }
}

/**
 * Fetch total download count from GitHub releases
 * Sums up download_count from all release assets
 * Uses rate limiter to respect GitHub API limits (100 requests/minute)
 */
export async function fetchDownloadCount(fullName: string): Promise<number> {
    try {
        const headers: HeadersInit = {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "HomeAssistant-Frontend",
        };

        if (GITHUB_TOKEN) {
            headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
        }

        // Fetch all releases (paginated)
        let totalDownloads = 0;
        let page = 1;
        const perPage = 100;
        let hasMore = true;

        while (hasMore) {
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            try {
                const response = await githubRateLimiter.executeRequest(() =>
                    fetch(
                        `${GITHUB_API_BASE}/repos/${fullName}/releases?page=${page}&per_page=${perPage}`,
                        {
                            headers,
                            signal: controller.signal,
                        }
                    )
                );

                clearTimeout(timeoutId);

                if (!response.ok) {
                    // If releases endpoint fails, return 0
                    if (response.status === 404 || response.status === 403) {
                        return 0;
                    }
                    // For other errors, stop pagination
                    break;
                }

                const releases = await response.json();

                // If no more releases, break
                if (!Array.isArray(releases) || releases.length === 0) {
                    hasMore = false;
                    break;
                }

                // Sum download counts from all assets in all releases
                for (const release of releases) {
                    if (release.assets && Array.isArray(release.assets)) {
                        for (const asset of release.assets) {
                            totalDownloads += asset.download_count || 0;
                        }
                    }
                }

                // If we got fewer than perPage results, we're done
                if (releases.length < perPage) {
                    hasMore = false;
                } else {
                    page++;
                }
            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                if (fetchError.name === "AbortError") {
                    // Timeout - return what we have so far
                    return totalDownloads;
                }
                // For other errors, return what we have
                return totalDownloads;
            }
        }

        return totalDownloads;
    } catch (error: any) {
        // Silently return 0 on error (rate limiter handles retries)
        return 0;
    }
}
