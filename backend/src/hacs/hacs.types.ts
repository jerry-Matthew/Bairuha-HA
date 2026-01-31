/**
 * HACS Server Types
 * 
 * Canonical data model for HACS extensions
 * All fields are backend-driven, no UI-only state
 */

export type ExtensionType = "integration" | "frontend" | "theme" | "panel";
export type ExtensionStatus = "not_installed" | "installing" | "installed";
export type SortField = "name" | "stars" | "activity" | "downloads";

/**
 * Canonical HACS Extension model
 * This is the source of truth - all UI state derives from this
 */
export interface HacsExtension {
    id: string;
    name: string;
    description: string;
    type: ExtensionType;
    githubRepo: string; // e.g., "user/repo-name"
    stars: number;
    downloads: number;
    lastActivity: string; // Human-readable activity string
    version: string; // Latest available version
    installedVersion?: string | null;
    status: ExtensionStatus;
    restartRequired: boolean;
    avatarUrl?: string; // GitHub owner avatar URL
}

/**
 * Extended details for extension detail view
 */
export interface HacsExtensionDetails extends HacsExtension {
    readme: string; // Full README markdown content
    versionHistory?: Array<{
        version: string;
        releasedAt: string;
        changelog?: string;
    }>;
    compatibility?: {
        homeAssistantVersion?: string;
        pythonVersion?: string;
    };
    maintainer?: {
        name: string;
        avatarUrl: string;
        githubUrl: string;
    };
    lastActivityDetails?: {
        type: "commit" | "release" | "issue";
        date: string;
        message?: string;
    };
}

/**
 * Agent command object (for future HA Agent integration)
 */
export interface HacsAgentCommand {
    type: "HACS_INSTALL" | "HACS_UPDATE" | "HACS_REMOVE" | "HACS_REFRESH";
    extensionId: string;
    status: "queued" | "running" | "completed" | "failed";
    createdAt: string;
    completedAt?: string;
    error?: string;
}

/**
 * API Response types
 */
export interface HacsCatalogResponse {
    extensions: HacsExtension[];
    total: number;
    page?: number;
    perPage?: number;
    totalPages?: number;
}

export interface HacsExtensionResponse {
    extension: HacsExtensionDetails;
}

export interface HacsInstallResponse {
    success: boolean;
    extension: HacsExtension;
    message?: string;
    restartRequired: boolean;
    agentCommand?: HacsAgentCommand;
}

export interface HacsUpdateResponse {
    success: boolean;
    extension: HacsExtension;
    message?: string;
    restartRequired: boolean;
    agentCommand?: HacsAgentCommand;
}

export interface HacsRefreshResponse {
    success: boolean;
    extension: HacsExtension;
    message?: string;
}
