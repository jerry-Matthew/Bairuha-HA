import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { mapManifestToCatalog } from './manifest-mapper';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ExtensionsLoaderService implements OnModuleInit {
    private readonly logger = new Logger(ExtensionsLoaderService.name);
    private readonly extensionsDir = path.join(process.cwd(), 'extensions');

    constructor(
        private readonly integrationsService: IntegrationsService
    ) {
        console.log('!!! EXTENSIONS LOADER SERVICE INSTANTIATED !!!');
    }

    async onModuleInit() {
        await this.loadExtensions();
    }

    private async loadExtensions() {
        console.log(`[ExtensionsLoader] Checking extensions dir: ${this.extensionsDir}`);
        if (!fs.existsSync(this.extensionsDir)) {
            this.logger.log('No extensions directory found, skipping custom integration load.');
            return;
        }

        const dirs = await fs.promises.readdir(this.extensionsDir, { withFileTypes: true });
        console.log(`[ExtensionsLoader] Found ${dirs.length} entries in extensions dir`);

        for (const dir of dirs) {
            if (!dir.isDirectory()) continue;
            console.log(`[ExtensionsLoader] Processing extension: ${dir.name}`);

            const extensionRoot = path.join(this.extensionsDir, dir.name);
            const customComponentsPath = path.join(extensionRoot, 'custom_components');

            // Strategy 1: Look for manifest in the root of the extension (standard/simple structure)
            const rootManifestPath = path.join(extensionRoot, 'manifest.json');
            if (fs.existsSync(rootManifestPath)) {
                console.log(`[ExtensionsLoader] Found manifest at root for ${dir.name}`);
                await this.loadManifest(rootManifestPath, dir.name);
            }
            // Strategy 2: Look for manifest inside custom_components subdirectory (HACS structure)
            else if (fs.existsSync(customComponentsPath)) {
                console.log(`[ExtensionsLoader] Found custom_components in ${dir.name}`);
                const subDirs = await fs.promises.readdir(customComponentsPath, { withFileTypes: true });
                for (const subDir of subDirs) {
                    if (subDir.isDirectory()) {
                        const subManifestPath = path.join(customComponentsPath, subDir.name, 'manifest.json');
                        if (fs.existsSync(subManifestPath)) {
                            console.log(`[ExtensionsLoader] Found manifest in custom_components/${subDir.name}`);
                            await this.loadManifest(subManifestPath, subDir.name);
                        } else {
                            console.log(`[ExtensionsLoader] No manifest in custom_components/${subDir.name}`);
                        }
                    }
                }
            } else {
                console.log(`[ExtensionsLoader] No manifest or custom_components found in ${dir.name}`);
            }
        }
    }

    private async loadManifest(manifestPath: string, folderName: string) {
        try {
            const content = await fs.promises.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(content);

            // Sanity check
            if (!manifest.domain) {
                manifest.domain = folderName;
            }

            const entry = mapManifestToCatalog(manifest, manifest.domain);

            // Mark as local/custom so we can distinguish if needed (optional)
            // entry.integration_type = 'custom'; 

            await this.integrationsService.importCustomIntegration(entry);
            this.logger.log(`Loaded custom integration: ${entry.name} (${entry.domain})`);
        } catch (error: any) {
            this.logger.error(`Failed to load extension from ${manifestPath}: ${error.message}`);
        }
    }
}
