/**
 * HACS Service
 * 
 * Business logic for HACS operations
 * Handles install, update, refresh, and state management
 */

import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { getAllCatalogEntries, getCatalogEntryByFullName, type HACSCatalogEntry } from './utils/hacs-catalog';
import { fetchGitHubMetadata } from './utils/hacs-github-utils';
import { NotificationsService } from '../notifications/notifications.service';
import simpleGit from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';
import type {
    HacsExtension,
    HacsExtensionDetails,
    HacsInstallResponse,
    HacsUpdateResponse,
    HacsRefreshResponse,
    HacsAgentCommand,
    ExtensionType,
} from './hacs.types';

@Injectable()
export class HacsService implements OnModuleInit {
    private readonly logger = new Logger(HacsService.name);

    constructor(
        @Inject(DATABASE_POOL) private readonly pool: Pool,
        private readonly notificationsService: NotificationsService,
    ) { }

    async onModuleInit() {
        await this.ensureTableExists();
    }

    private async ensureTableExists() {
        const query = `
            CREATE TABLE IF NOT EXISTS hacs_extensions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL,
                github_repo TEXT NOT NULL,
                stars INTEGER DEFAULT 0,
                downloads INTEGER DEFAULT 0,
                last_activity TEXT,
                version TEXT,
                installed_version TEXT,
                status TEXT NOT NULL,
                restart_required BOOLEAN DEFAULT FALSE,
                avatar_url TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `;
        try {
            await this.pool.query(query);
            this.logger.log('Ensured hacs_extensions table exists');
        } catch (error: any) {
            this.logger.error(`Failed to ensure hacs_extensions table exists: ${error.message}`);
        }
    }

    // --- Database Helpers ---

    private async getIntegration(id: string): Promise<HacsExtension | null> {
        const query = `
            SELECT 
                id, name, description, type, github_repo as "githubRepo", 
                stars, downloads, last_activity as "lastActivity", 
                version, installed_version as "installedVersion", 
                status, restart_required as "restartRequired", 
                avatar_url as "avatarUrl"
            FROM hacs_extensions WHERE id = $1
        `;
        const result = await this.pool.query(query, [id]);
        return result.rows[0] as HacsExtension || null;
    }

    private async saveIntegration(integration: HacsExtension): Promise<void> {
        const query = `
            INSERT INTO hacs_extensions (
                id, name, description, type, github_repo, 
                stars, downloads, last_activity, 
                version, installed_version, 
                status, restart_required, avatar_url, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                type = EXCLUDED.type,
                github_repo = EXCLUDED.github_repo,
                stars = EXCLUDED.stars,
                downloads = EXCLUDED.downloads,
                last_activity = EXCLUDED.last_activity,
                version = EXCLUDED.version,
                installed_version = EXCLUDED.installed_version,
                status = EXCLUDED.status,
                restart_required = EXCLUDED.restart_required,
                avatar_url = EXCLUDED.avatar_url,
                updated_at = CURRENT_TIMESTAMP
        `;
        const values = [
            integration.id, integration.name, integration.description, integration.type, integration.githubRepo,
            integration.stars, integration.downloads, integration.lastActivity,
            integration.version, integration.installedVersion,
            integration.status, integration.restartRequired, integration.avatarUrl
        ];
        await this.pool.query(query, values);
    }

    private async deleteIntegration(id: string): Promise<void> {
        await this.pool.query('DELETE FROM hacs_extensions WHERE id = $1', [id]);
    }

    /**
     * Map HACS catalog type to our extension type
     */
    private mapCatalogType(catalogType: string): ExtensionType {
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
     * Format activity date helper
     */
    private formatActivityDate(dateString: string): string {
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

    /**
     * Convert HACS catalog entry + GitHub metadata to HacsExtension
     */
    private async enrichCatalogEntry(
        catalogEntry: HACSCatalogEntry,
        githubMetadata: any,
        installedVersion?: string | null,
        status: "not_installed" | "installing" | "installed" = "not_installed"
    ): Promise<HacsExtension> {
        const id = catalogEntry.id;
        const githubRepo = catalogEntry.fullName;

        // Format last activity
        const lastActivity = githubMetadata?.pushed_at
            ? this.formatActivityDate(githubMetadata.pushed_at)
            : "Unknown";

        // Estimate downloads from stars (fast, non-blocking)
        const stars = githubMetadata?.stargazers_count || 0;
        const downloads = Math.floor(stars * 10); // Rough estimate

        return {
            id,
            name: catalogEntry.name,
            description: catalogEntry.description || "No description available",
            type: this.mapCatalogType(catalogEntry.type),
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
     * Get all catalog entries enriched with GitHub metadata
     */
    async getEnrichedCatalog(
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

        // Enrich with GitHub metadata
        const enrichedExtensions = await Promise.all(
            paginatedEntries.map(async (entry) => {
                try {
                    const githubMetadata = await fetchGitHubMetadata(entry.fullName);
                    if (!githubMetadata) {
                        return null;
                    }
                    const existing = await this.getIntegration(entry.id);
                    return this.enrichCatalogEntry(
                        entry,
                        githubMetadata,
                        existing?.installedVersion,
                        existing?.status || "not_installed"
                    );
                } catch (error) {
                    this.logger.error(`Error enriching ${entry.fullName}: ${error}`);
                    return null;
                }
            })
        );

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
    async getExtensionById(id: string): Promise<HacsExtension | null> {
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
            const existing = await this.getIntegration(id);
            return this.enrichCatalogEntry(
                entry,
                githubMetadata,
                existing?.installedVersion,
                existing?.status || "not_installed"
            );
        } catch (error) {
            this.logger.error(`Error fetching extension ${id}: ${error}`);
            return null;
        }
    }

    /**
     * Create agent command object
     */
    private createAgentCommand(
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
     */
    async installExtension(extensionId: string): Promise<HacsInstallResponse> {
        const extension = await this.getExtensionById(extensionId);
        if (!extension) {
            return {
                success: false,
                extension: extension as any,
                message: "Extension not found in catalog",
                restartRequired: false,
            };
        }

        const existing = await this.getIntegration(extensionId);
        if (existing && existing.status === "installed") {
            return {
                success: false,
                extension: existing,
                message: "Extension is already installed",
                restartRequired: false,
            };
        }

        const agentCommand = this.createAgentCommand("HACS_INSTALL", extensionId, "queued");

        // Mark as installing in DB
        const installingExtension: HacsExtension = {
            ...extension,
            status: "installing",
            installedVersion: null,
            restartRequired: false,
        };
        await this.saveIntegration(installingExtension);

        try {
            // Real clone logic
            const extensionsDir = path.join(process.cwd(), 'extensions');
            if (!fs.existsSync(extensionsDir)) {
                fs.mkdirSync(extensionsDir);
            }

            const targetDir = path.join(extensionsDir, extension.name.replace(/\s+/g, '_').toLowerCase());

            // Clean up if exists (shouldn't happen if not installed, but safe)
            if (fs.existsSync(targetDir)) {
                await fs.promises.rm(targetDir, { recursive: true, force: true });
            }

            this.logger.log(`Cloning ${extension.githubRepo} to ${targetDir}`);
            const git = simpleGit();
            await git.clone(`https://github.com/${extension.githubRepo}.git`, targetDir);

            const installedExtension: HacsExtension = {
                ...extension,
                status: "installed",
                installedVersion: extension.version,
                restartRequired: true,
            };
            await this.saveIntegration(installedExtension);

            agentCommand.status = "completed";
            agentCommand.completedAt = new Date().toISOString();

            // Create success notification
            try {
                await this.notificationsService.createNotification({
                    userId: null,
                    type: 'success',
                    title: 'Integration Downloaded',
                    message: `${extension.name} has been downloaded successfully to backend/extensions/`,
                    actionUrl: '/hacs',
                    actionLabel: 'View HACS',
                });
            } catch (notifError) {
                this.logger.warn(`Failed to create notification: ${notifError}`);
            }

            return {
                success: true,
                extension: installedExtension,
                message: "Extension installed successfully",
                restartRequired: true,
                agentCommand,
            };
        } catch (error) {
            this.logger.error(`Failed to clone extension: ${error}`);

            // Revert status
            const failedExtension: HacsExtension = {
                ...extension,
                status: "not_installed",
                installedVersion: null,
                restartRequired: false,
            };
            await this.saveIntegration(failedExtension);

            agentCommand.status = "failed";

            // Create error notification
            try {
                await this.notificationsService.createNotification({
                    userId: null,
                    type: 'error',
                    title: 'Integration Download Failed',
                    message: `Failed to download ${extension.name}: ${error instanceof Error ? error.message : String(error)}`,
                    actionUrl: '/hacs',
                    actionLabel: 'View HACS',
                });
            } catch (notifError) {
                this.logger.warn(`Failed to create notification: ${notifError}`);
            }

            return {
                success: false,
                extension: failedExtension,
                message: `Installation failed: ${error instanceof Error ? error.message : String(error)}`,
                restartRequired: false,
                agentCommand
            };
        }
    }

    /**
     * Update extension
     */
    async updateExtension(extensionId: string): Promise<HacsUpdateResponse> {
        const existing = await this.getIntegration(extensionId);
        if (!existing || existing.status !== "installed") {
            return {
                success: false,
                extension: existing || ({} as HacsExtension),
                message: "Extension is not installed",
                restartRequired: false,
            };
        }

        const latest = await this.getExtensionById(extensionId);
        if (!latest) {
            return {
                success: false,
                extension: existing,
                message: "Extension not found in catalog",
                restartRequired: false,
            };
        }

        const agentCommand = this.createAgentCommand("HACS_UPDATE", extensionId, "queued");

        await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

        const updatedExtension: HacsExtension = {
            ...latest,
            status: "installed",
            installedVersion: latest.version,
            restartRequired: true,
        };
        await this.saveIntegration(updatedExtension);

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
     * Refresh extension metadata
     */
    async refreshExtension(extensionId: string): Promise<HacsRefreshResponse> {
        const existing = await this.getIntegration(extensionId);
        if (!existing) {
            return {
                success: false,
                extension: {} as HacsExtension,
                message: "Extension not found",
            };
        }

        try {
            const githubMetadata = await fetchGitHubMetadata(existing.githubRepo);
            if (!githubMetadata) {
                return {
                    success: false,
                    extension: existing,
                    message: "Failed to fetch GitHub metadata",
                };
            }

            const refreshedExtension: HacsExtension = {
                ...existing,
                stars: githubMetadata.stargazers_count,
                lastActivity: this.formatActivityDate(githubMetadata.pushed_at),
                avatarUrl: githubMetadata.owner?.avatar_url || existing.avatarUrl,
            };
            await this.saveIntegration(refreshedExtension);

            return {
                success: true,
                extension: refreshedExtension,
                message: "Extension metadata refreshed",
            };
        } catch (error) {
            this.logger.error(`Error refreshing extension ${extensionId}: ${error}`);
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
    async getExtensionDetails(extensionId: string): Promise<HacsExtensionDetails | null> {
        const extension = (await this.getIntegration(extensionId)) || (await this.getExtensionById(extensionId));
        if (!extension) {
            return null;
        }

        // Fetch README from GitHub (simplified)
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
     * Get list of integrations installed on Real Home Assistant
     */
    async getInstalledIntegrationsFromHA(): Promise<string[]> {
        const haUrl = process.env.HA_BASE_URL;
        const haToken = process.env.HA_ACCESS_TOKEN;

        if (!haUrl || !haToken) {
            this.logger.warn('HA_BASE_URL or HA_ACCESS_TOKEN not configured');
            return [];
        }

        try {
            const { queryHomeAssistant } = await import('./utils/ha-client.js');

            const components = await queryHomeAssistant(
                haUrl,
                haToken,
                async (client: any) => await client.getCustomComponents()
            );

            this.logger.log(`Found ${components.length} components on Real HA`);
            return components;
        } catch (error) {
            this.logger.error(`Failed to query Real HA: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
}
