/**
 * GET /api/hacs/:id/details
 * 
 * Get detailed information about a HACS integration
 * 
 * Returns full details including README, version history, compatibility info
 */

import { NextRequest, NextResponse } from "next/server";
import { getCatalogEntryByFullName } from "@/lib/hacs-catalog";
import { fetchGitHubMetadata, fetchReadme } from "@/lib/hacs-github-utils";
import { getIntegration } from "@/lib/hacs-database";
import type { HacsIntegrationDetails } from "@/types/hacs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const integrationId = params.id;

    // Get catalog entry
    const catalogEntry = await getCatalogEntryByFullName(integrationId);
    if (!catalogEntry) {
      return NextResponse.json(
        { error: "Integration not found in HACS catalog" },
        { status: 404 }
      );
    }

    // Fetch GitHub metadata
    const githubData = await fetchGitHubMetadata(catalogEntry.fullName);
    if (!githubData) {
      return NextResponse.json(
        { error: "Failed to fetch GitHub metadata" },
        { status: 500 }
      );
    }

    // Fetch README
    const readme = await fetchReadme(catalogEntry.fullName);

    // Get existing integration state (use catalog entry ID)
    const existing = getIntegration(catalogEntry.id);

    const details: HacsIntegrationDetails = {
      id: catalogEntry.id,
      name: catalogEntry.name,
      type: catalogEntry.type,
      github_repo: catalogEntry.fullName,
      version: "latest",
      installed_version: existing?.installed_version || null,
      status: existing?.status || "not_installed",
      last_updated: githubData.pushed_at || githubData.updated_at,
      issues_url: `${githubData.html_url}/issues`,
      readme: readme || "No README available",
      description: catalogEntry.description,
      stars: githubData.stargazers_count,
      activity: formatTimeAgo(githubData.pushed_at || githubData.updated_at),
      avatarUrl: githubData.owner.avatar_url,
      owner: githubData.owner.login,
      fullName: catalogEntry.fullName,
      restart_required: existing?.restart_required || false,
      last_refreshed_at: existing?.last_refreshed_at || new Date().toISOString(),
      // Additional details
      version_history: [], // In real implementation, fetch from releases
      compatibility: {
        home_assistant_version: "2024.1.0+", // Mock
        python_version: "3.11+", // Mock
      },
      maintainer: {
        name: githubData.owner.login,
        avatar_url: githubData.owner.avatar_url,
        github_url: githubData.owner.html_url || `https://github.com/${githubData.owner.login}`,
      },
      last_activity: {
        type: "commit",
        date: githubData.pushed_at || githubData.updated_at,
        message: "Latest commit", // In real implementation, fetch actual commit message
      },
    };

    return NextResponse.json(details);
  } catch (error: any) {
    console.error("Details error:", error);
    return NextResponse.json(
      { error: "Failed to fetch integration details", message: error.message },
      { status: 500 }
    );
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  } else if (diffInDays === 1) {
    return "yesterday";
  } else if (diffInDays < 30) {
    return `${diffInDays} days ago`;
  } else {
    return `${Math.floor(diffInDays / 30)} months ago`;
  }
}

