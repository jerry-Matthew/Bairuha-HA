/**
 * HACS Service
 * 
 * Business logic for HACS operations
 * Handles install, update, refresh, and state management
 */

import { getIntegration, saveIntegration, getAllIntegrations } from "@/lib/hacs-database";
import { getExtensionById } from "./hacs.catalog";
import { fetchGitHubMetadata } from "@/lib/hacs-github-utils";
import type {
  HacsExtension,
  HacsExtensionDetails,
  HacsInstallResponse,
  HacsUpdateResponse,
  HacsRefreshResponse,
  HacsAgentCommand,
} from "./hacs.types";

/**
 * Create agent command object (for future HA Agent integration)
 */
function createAgentCommand(
  type: "HACS_INSTALL" | "HACS_UPDATE" | "HACS_REMOVE" | "HACS_REFRESH",
  extensionId: string,
  status: "queued" | "running" | "completed" | "failed" = "queued"
): HacsAgentCommand {
  return {
    type,
    extensionId,
    status,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Install extension
 * Simulates installation process with async delay
 */
export async function installExtension(extensionId: string): Promise<HacsInstallResponse> {
  // Get extension from catalog
  const extension = await getExtensionById(extensionId);
  if (!extension) {
    return {
      success: false,
      extension: extension as any,
      message: "Extension not found in catalog",
      restartRequired: false,
    };
  }

  // Check if already installed
  const existing = getIntegration(extensionId);
  if (existing && existing.status === "installed") {
    return {
      success: false,
      extension: existing,
      message: "Extension is already installed",
      restartRequired: false,
    };
  }

  // Create agent command
  const agentCommand = createAgentCommand("HACS_INSTALL", extensionId, "queued");

  // Simulate installation (update status to installing)
  const installingExtension: HacsExtension = {
    ...extension,
    status: "installing",
    installedVersion: null,
    restartRequired: false,
  };
  saveIntegration(installingExtension);

  // Simulate async installation delay (2-3 seconds)
  await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 1000));

  // Mark as installed
  const installedExtension: HacsExtension = {
    ...extension,
    status: "installed",
    installedVersion: extension.version,
    restartRequired: true, // Mock: installation requires restart
  };
  saveIntegration(installedExtension);

  // Update agent command
  agentCommand.status = "completed";
  agentCommand.completedAt = new Date().toISOString();

  return {
    success: true,
    extension: installedExtension,
    message: "Extension installed successfully",
    restartRequired: true,
    agentCommand,
  };
}

/**
 * Update extension
 */
export async function updateExtension(extensionId: string): Promise<HacsUpdateResponse> {
  const existing = getIntegration(extensionId);
  if (!existing || existing.status !== "installed") {
    return {
      success: false,
      extension: existing || ({} as HacsExtension),
      message: "Extension is not installed",
      restartRequired: false,
    };
  }

  // Get latest version from catalog
  const latest = await getExtensionById(extensionId);
  if (!latest) {
    return {
      success: false,
      extension: existing,
      message: "Extension not found in catalog",
      restartRequired: false,
    };
  }

  // Create agent command
  const agentCommand = createAgentCommand("HACS_UPDATE", extensionId, "queued");

  // Simulate update delay
  await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

  // Update extension
  const updatedExtension: HacsExtension = {
    ...latest,
    status: "installed",
    installedVersion: latest.version,
    restartRequired: true,
  };
  saveIntegration(updatedExtension);

  agentCommand.status = "completed";
  agentCommand.completedAt = new Date().toISOString();

  return {
    success: true,
    extension: updatedExtension,
    message: "Extension updated successfully",
    restartRequired: true,
    agentCommand,
  };
}

/**
 * Refresh extension metadata from GitHub
 */
export async function refreshExtension(extensionId: string): Promise<HacsRefreshResponse> {
  const existing = getIntegration(extensionId);
  if (!existing) {
    return {
      success: false,
      extension: {} as HacsExtension,
      message: "Extension not found",
    };
  }

  try {
    // Fetch fresh GitHub metadata
    const githubMetadata = await fetchGitHubMetadata(existing.githubRepo);
    if (!githubMetadata) {
      return {
        success: false,
        extension: existing,
        message: "Failed to fetch GitHub metadata",
      };
    }

    // Update extension with fresh data
    const refreshedExtension: HacsExtension = {
      ...existing,
      stars: githubMetadata.stargazers_count,
      lastActivity: formatActivityDate(githubMetadata.pushed_at),
      avatarUrl: githubMetadata.owner?.avatar_url || existing.avatarUrl,
    };
    saveIntegration(refreshedExtension);

    return {
      success: true,
      extension: refreshedExtension,
      message: "Extension metadata refreshed",
    };
  } catch (error) {
    console.error(`Error refreshing extension ${extensionId}:`, error);
    return {
      success: false,
      extension: existing,
      message: "Error refreshing extension metadata",
    };
  }
}

/**
 * Get extension details (with README)
 */
export async function getExtensionDetails(extensionId: string): Promise<HacsExtensionDetails | null> {
  const extension = getIntegration(extensionId) || (await getExtensionById(extensionId));
  if (!extension) {
    return null;
  }

  // Fetch README from GitHub (simplified - in production would fetch from GitHub API)
  const readme = `# ${extension.name}\n\n${extension.description}\n\n## Installation\n\nInstall via HACS.`;

  return {
    ...extension,
    readme,
    versionHistory: [
      {
        version: extension.version,
        releasedAt: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Format activity date helper
 */
function formatActivityDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

