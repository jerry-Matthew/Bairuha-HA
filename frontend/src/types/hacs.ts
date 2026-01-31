/**
 * HACS Integration Entity Types
 * 
 * These represent first-class system entities, not UI-only objects
 */

export type IntegrationType = "Integration" | "Dashboard" | "Plugin" | "Theme";
export type InstallStatus = "not_installed" | "installing" | "installed";

export interface HacsIntegration {
  id: string;
  name: string;
  type: IntegrationType;
  github_repo: string; // e.g., "user/repo-name"
  version?: string; // Latest available version
  installed_version?: string | null;
  status: InstallStatus;
  last_updated?: string; // ISO date string
  issues_url: string;
  readme?: string; // README markdown content
  description: string;
  stars: number;
  downloads?: number;
  activity: string; // Human-readable activity string
  avatarUrl?: string;
  owner?: string;
  fullName: string;
  restart_required?: boolean;
  last_refreshed_at?: string; // ISO date string
}

export interface HacsIntegrationDetails extends HacsIntegration {
  readme: string; // Full README content
  version_history?: Array<{
    version: string;
    released_at: string;
    changelog?: string;
  }>;
  compatibility?: {
    home_assistant_version?: string;
    python_version?: string;
  };
  maintainer?: {
    name: string;
    avatar_url: string;
    github_url: string;
  };
  last_activity?: {
    type: "commit" | "release" | "issue";
    date: string;
    message?: string;
  };
}

export interface InstallResponse {
  success: boolean;
  integration: HacsIntegration;
  message?: string;
  restart_required?: boolean;
}

export interface UpdateResponse {
  success: boolean;
  integration: HacsIntegration;
  message?: string;
  restart_required?: boolean;
}

export interface RefreshResponse {
  success: boolean;
  integration: HacsIntegration;
  message?: string;
}

