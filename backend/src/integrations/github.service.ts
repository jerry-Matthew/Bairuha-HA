import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GitHubContent {
    name: string;
    path: string;
    type: "file" | "dir";
    download_url: string | null;
    content?: string;
    encoding?: string;
}

export interface HAManifest {
    domain: string;
    name?: string;
    documentation?: string | string[];
    requirements?: string[];
    dependencies?: string[];
    after_dependencies?: string[];
    config_flow?: boolean;
    iot_class?: "local_polling" | "local_push" | "cloud_polling" | "cloud_push" | "assumed_state" | "calculated";
    dhcp?: any[];
    zeroconf?: any[];
    ssdp?: any[];
    homekit?: any;
    codeowners?: string[];
    integration_type?: string;
    supported_by?: string;
    [key: string]: any;
}

@Injectable()
export class GithubService {
    private readonly logger = new Logger(GithubService.name);
    private readonly githubToken: string;
    private readonly rateLimitDelay: number;

    private readonly GITHUB_REPO = "home-assistant/core";
    private readonly GITHUB_API_BASE = "https://api.github.com";
    private readonly COMPONENTS_PATH = "homeassistant/components";
    private readonly BRANDS_REPO = "home-assistant/brands";
    private readonly BRANDS_BASE_URL = "https://brands.home-assistant.io";

    constructor(private configService: ConfigService) {
        this.githubToken = this.configService.get<string>('GITHUB_TOKEN') || '';
        this.rateLimitDelay = this.githubToken ? 100 : 1000;
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
        const headers: any = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Bairuha-HA-Sync",
            ...options.headers,
        };

        if (this.githubToken) {
            headers["Authorization"] = `token ${this.githubToken}`;
        }

        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, { ...options, headers });

                if (response.status === 403) {
                    const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
                    const rateLimitReset = response.headers.get("x-ratelimit-reset");

                    if (rateLimitRemaining === "0" && rateLimitReset) {
                        const resetTime = parseInt(rateLimitReset) * 1000;
                        const waitTime = Math.max(resetTime - Date.now(), 0) + 1000;
                        this.logger.warn(`Rate limit exceeded. Waiting ${Math.round(waitTime / 1000)}s...`);
                        await this.sleep(waitTime);
                        continue;
                    }
                }

                if (!response.ok && response.status !== 404) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return response;
            } catch (error: any) {
                if (i === retries - 1) throw error;
                await this.sleep(1000 * (i + 1));
            }
        }

        throw new Error("Failed after retries");
    }

    async fetchHAIntegrationDomains(): Promise<string[]> {
        const url = `${this.GITHUB_API_BASE}/repos/${this.GITHUB_REPO}/contents/${this.COMPONENTS_PATH}`;
        const response = await this.fetchWithRetry(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch components directory: ${response.statusText}`);
        }

        const items = await response.json() as GitHubContent[];

        return items
            .filter(item => item.type === "dir")
            .filter(item => !item.name.startsWith("__") && item.name !== "tests")
            .map(item => item.name)
            .sort();
    }

    async fetchManifest(domain: string): Promise<HAManifest | null> {
        const url = `${this.GITHUB_API_BASE}/repos/${this.GITHUB_REPO}/contents/${this.COMPONENTS_PATH}/${domain}/manifest.json`;

        try {
            const response = await this.fetchWithRetry(url);

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const content = await response.json() as GitHubContent;

            if (content.encoding === "base64" && content.content) {
                const decoded = Buffer.from(content.content, "base64").toString("utf-8");
                return JSON.parse(decoded) as HAManifest;
            }

            throw new Error("Unexpected content encoding");
        } catch (error: any) {
            if (error.message.includes("404")) {
                return null;
            }
            throw error;
        }
    }

    async fetchBrandImageDomains(): Promise<Set<string>> {
        const brandDomains = new Set<string>();

        try {
            const coreUrl = `${this.GITHUB_API_BASE}/repos/${this.BRANDS_REPO}/contents/core_integrations`;
            const customUrl = `${this.GITHUB_API_BASE}/repos/${this.BRANDS_REPO}/contents/custom_integrations`;

            const [coreResponse, customResponse] = await Promise.all([
                this.fetchWithRetry(coreUrl).catch(() => null),
                this.fetchWithRetry(customUrl).catch(() => null),
            ]);

            if (coreResponse && coreResponse.ok) {
                const coreItems = await coreResponse.json() as GitHubContent[];
                coreItems
                    .filter(item => item.type === "dir")
                    .forEach(item => brandDomains.add(item.name));
            }

            if (customResponse && customResponse.ok) {
                const customItems = await customResponse.json() as GitHubContent[];
                customItems
                    .filter(item => item.type === "dir")
                    .forEach(item => brandDomains.add(item.name));
            }

            return brandDomains;
        } catch (error: any) {
            this.logger.warn(`Could not fetch brand image domains: ${error.message}`);
            return brandDomains;
        }
    }

    getBrandImageUrl(domain: string, brandDomains: Set<string>): string | undefined {
        if (brandDomains.has(domain)) {
            return `${this.BRANDS_BASE_URL}/${domain}/icon.png`;
        }
        return undefined;
    }

    getRateLimitDelay(): number {
        return this.rateLimitDelay;
    }
}
