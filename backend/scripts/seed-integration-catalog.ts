/**
 * Seed Integration Catalog
 * 
 * Loads integration catalog data from JSON file into the database
 */

// Load environment variables from .env FIRST (before importing db module)
import * as dotenv from "dotenv";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env");
if (require("fs").existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import { query } from "./db";
import * as fs from "fs";

type FlowType = 'none' | 'manual' | 'discovery' | 'oauth' | 'wizard' | 'hybrid';

interface FlowConfig {
  discovery_protocols?: {
    dhcp?: any[];
    zeroconf?: any[];
    ssdp?: any[];
    homekit?: any;
  };
  oauth_provider?: string;
  scopes?: string[];
  authorization_url?: string;
  token_url?: string;
  steps?: Array<{
    step_id: string;
    title: string;
    schema: any;
  }>;
  [key: string]: any;
}

interface CatalogEntry {
  domain: string;
  name: string;
  description?: string;
  icon?: string;
  supports_devices: boolean;
  is_cloud: boolean;
  documentation_url?: string;
  flow_type?: FlowType;
  flow_config?: FlowConfig;
  handler_class?: string;
  metadata?: Record<string, any>;
}

async function seedIntegrationCatalog() {
  try {
    console.log("Loading integration catalog seed data...");

    const seedFilePath = path.join(
      process.cwd(),
      "database/integration-catalog.seed.json"
    );

    const seedData = JSON.parse(
      fs.readFileSync(seedFilePath, "utf-8")
    ) as CatalogEntry[];

    console.log(`Found ${seedData.length} catalog entries to seed`);

    let inserted = 0;
    let skipped = 0;

    for (const entry of seedData) {
      try {
        // Check if entry already exists
        const existing = await query(
          `SELECT domain FROM integration_catalog WHERE domain = $1`,
          [entry.domain]
        );

        if (existing.rowCount && existing.rowCount > 0) {
          skipped++;
          console.log(`  - Skipped (exists): ${entry.name} (${entry.domain})`);
          continue;
        }

        // Insert new entry
        await query(
          `INSERT INTO integration_catalog 
           (domain, name, description, icon, supports_devices, is_cloud, documentation_url,
            flow_type, flow_config, handler_class, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            entry.domain,
            entry.name,
            entry.description || null,
            entry.icon || null,
            entry.supports_devices,
            entry.is_cloud,
            entry.documentation_url || null,
            entry.flow_type || 'manual',
            entry.flow_config ? JSON.stringify(entry.flow_config) : null,
            entry.handler_class || null,
            entry.metadata ? JSON.stringify(entry.metadata) : null,
          ]
        );

        inserted++;
        console.log(`  ✓ Inserted: ${entry.name} (${entry.domain})`);
      } catch (error: any) {
        console.error(`  ✗ Error inserting ${entry.domain}:`, error.message);
      }
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${seedData.length}`);
  } catch (error: any) {
    console.error("Failed to seed integration catalog:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedIntegrationCatalog()
    .then(() => {
      console.log("Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

export { seedIntegrationCatalog };

