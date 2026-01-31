/**
 * HACS Service
 * 
 * Business logic for HACS operations
 * Handles install, update, refresh, and state management
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HacsExtension as HacsExtensionEntity } from './entities/hacs-extension.entity';
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
        @InjectRepository(HacsExtensionEntity)
        private readonly hacsRepository: Repository<HacsExtensionEntity>,
        private readonly notificationsService: NotificationsService,
    ) { }

    async onModuleInit() {
        // Schema synchronization is handled by TypeORM globally
    }

    // --- Database Helpers ---

    private async getIntegration(id: string): Promise<HacsExtensionEntity | null> {
        return this.hacsRepository.findOne({ where: { id } });
    }

    private async saveIntegration(integration: Partial<HacsExtensionEntity> & { id: string }): Promise<void> {
        await this.hacsRepository.save(integration);
    }

    private async deleteIntegration(id: string): Promise<void> {
        await this.hacsRepository.delete(id);
    }

    /**
     * Map HACS catalog type to our extension type
     */
    private mapCatalogType(catalogType: string): ExtensionType {
        switch (catalogType.toLowerCase()) {
            case "integration": return "integration";
            case "plugin": return "frontend";
            case "theme": return "theme";
            case "dashboard": return "panel";
            default: return "integration";
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

        const lastActivity = githubMetadata?.pushed_at
            ? this.formatActivityDate(githubMetadata.pushed_at)
            : "Unknown";

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
            version: "latest",
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

        const enrichedExtensions = await Promise.all(
            paginatedEntries.map(async (entry) => {
                try {
                    const githubMetadata = await fetchGitHubMetadata(entry.fullName);
                    if (!githubMetadata) return null;
                    const existing = await this.getIntegration(entry.id);
                    return this.enrichCatalogEntry(
                        entry,
                        githubMetadata,
                        existing?.installedVersion,
                        existing?.status as any || "not_installed"
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

        return { extensions, total, page, perPage, totalPages };
    }

    /**
     * Get single extension by ID
     */
    async getExtensionById(id: string): Promise<HacsExtension | null> {
        const allEntries = await getAllCatalogEntries();
        const entry = allEntries.find((e) => e.id === id);

        if (!entry) return null;

        try {
            const githubMetadata = await fetchGitHubMetadata(entry.fullName);
            if (!githubMetadata) return null;
            const existing = await this.getIntegration(id);
            return this.enrichCatalogEntry(
                entry,
                githubMetadata,
                existing?.installedVersion,
                existing?.status as any || "not_installed"
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
                extension: null as any,
                message: "Extension not found in catalog",
                restartRequired: false,
            };
        }

        const existing = await this.getIntegration(extensionId);
        if (existing && existing.status === "installed") {
            return {
                success: false,
                extension: existing as any,
                message: "Extension is already installed",
                restartRequired: false,
            };
        }

        const agentCommand = this.createAgentCommand("HACS_INSTALL", extensionId, "queued");

        // Mark as installing in DB
        await this.saveIntegration({
            id: extensionId,
            name: extension.name,
            description: extension.description,
            type: extension.type,
            githubRepo: extension.githubRepo,
            stars: extension.stars,
            downloads: extension.downloads,
            lastActivity: extension.lastActivity,
            version: extension.version,
            status: "installing",
            restartRequired: false,
            avatarUrl: extension.avatarUrl,
        });

        try {
            const extensionsDir = path.join(process.cwd(), 'extensions');
            if (!fs.existsSync(extensionsDir)) {
                fs.mkdirSync(extensionsDir);
            }

            const targetDir = path.join(extensionsDir, extension.name.replace(/\s+/g, '_').toLowerCase());

            if (fs.existsSync(targetDir)) {
                await fs.promises.rm(targetDir, { recursive: true, force: true });
            }

            this.logger.log(`Cloning ${extension.githubRepo} to ${targetDir}`);
            const git = simpleGit();
            await git.clone(`https://github.com/${extension.githubRepo}.git`, targetDir);

            await this.saveIntegration({
                id: extensionId,
                status: "installed",
                installedVersion: extension.version,
                restartRequired: true,
            });

            agentCommand.status = "completed";
            agentCommand.completedAt = new Date().toISOString();

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

            const updated = await this.getIntegration(extensionId);
            return {
                success: true,
                extension: updated as any,
                message: "Extension installed successfully",
                restartRequired: true,
                agentCommand,
            };
        } catch (error: any) {
            this.logger.error(`Failed to clone extension: ${error}`);

            await this.saveIntegration({
                id: extensionId,
                status: "not_installed",
                installedVersion: null,
                restartRequired: false,
            });

            agentCommand.status = "failed";

            try {
                await this.notificationsService.createNotification({
                    userId: null,
                    type: 'error',
                    title: 'Integration Download Failed',
                    message: `Failed to download ${extension.name}: ${error.message || String(error)}`,
                    actionUrl: '/hacs',
                    actionLabel: 'View HACS',
                });
            } catch (notifError) {
                this.logger.warn(`Failed to create notification: ${notifError}`);
            }

            const updated = await this.getIntegration(extensionId);
            return {
                success: false,
                extension: updated as any,
                message: `Installation failed: ${error.message || String(error)}`,
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
                extension: existing as any || {} as HacsExtension,
                message: "Extension is not installed",
                restartRequired: false,
            };
        }

        const latest = await this.getExtensionById(extensionId);
        if (!latest) {
            return {
                success: false,
                extension: existing as any,
                message: "Extension not found in catalog",
                restartRequired: false,
            };
        }

        const agentCommand = this.createAgentCommand("HACS_UPDATE", extensionId, "queued");

        await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

        await this.saveIntegration({
            id: extensionId,
            status: "installed",
            installedVersion: latest.version,
            restartRequired: true,
        });

        agentCommand.status = "completed";
        agentCommand.completedAt = new Date().toISOString();

        const updated = await this.getIntegration(extensionId);
        return {
            success: true,
            extension: updated as any,
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
                    extension: existing as any,
                    message: "Failed to fetch GitHub metadata",
                };
            }

            await this.saveIntegration({
                id: extensionId,
                stars: githubMetadata.stargazers_count,
                lastActivity: this.formatActivityDate(githubMetadata.pushed_at),
                avatarUrl: githubMetadata.owner?.avatar_url || existing.avatarUrl,
            });

            const updated = await this.getIntegration(extensionId);
            return {
                success: true,
                extension: updated as any,
                message: "Extension metadata refreshed",
            };
        } catch (error) {
            this.logger.error(`Error refreshing extension ${extensionId}: ${error}`);
            return {
                success: false,
                extension: existing as any,
                message: "Error refreshing extension metadata",
            };
        }
    }

    /**
     * Get extension details (with README)
     */
    async getExtensionDetails(extensionId: string): Promise<HacsExtensionDetails | null> {
        const extensionEntity = (await this.getIntegration(extensionId)) || (await this.getExtensionById(extensionId));
        if (!extensionEntity) return null;

        const extension = extensionEntity as any as HacsExtension;

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
        } catch (error: any) {
            this.logger.error(`Failed to query Real HA: ${error.message || String(error)}`);
            return [];
        }
    }
}
