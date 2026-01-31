/**
 * Setup script for registry tables
 * 
 * Run this script to create the database tables for:
 * - Devices
 * - Automations
 * - Areas
 * - People
 * 
 * Usage: npx tsx scripts/setup-registries.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import pool from "./db";
import * as fs from "fs";

// Load environment variables from .env only
dotenv.config({ path: path.join(process.cwd(), ".env") });

async function setupRegistries() {
  console.log("🔧 Setting up registry tables...");
  console.log("");

  try {
    // Run registries migration
    const registriesMigrationPath = path.join(process.cwd(), "database", "migrations", "add_registries_tables.sql");

    if (!fs.existsSync(registriesMigrationPath)) {
      console.error(`❌ Migration file not found: ${registriesMigrationPath}`);
      process.exit(1);
    }

    console.log("📄 Reading registries migration file...");
    console.log(`   Path: ${registriesMigrationPath}`);
    console.log("");

    const registriesSQL = fs.readFileSync(registriesMigrationPath, "utf-8");

    console.log("⚙️  Executing registries migration...");
    await pool.query(registriesSQL);

    // Run integrations migration
    const integrationsMigrationPath = path.join(process.cwd(), "database", "migrations", "add_integrations_table.sql");

    if (fs.existsSync(integrationsMigrationPath)) {
      console.log("");
      console.log("📄 Reading integrations migration file...");
      console.log(`   Path: ${integrationsMigrationPath}`);
      console.log("");

      const integrationsSQL = fs.readFileSync(integrationsMigrationPath, "utf-8");

      console.log("⚙️  Executing integrations migration...");
      await pool.query(integrationsSQL);
    }

    console.log("");
    console.log("✅ Registry tables created successfully!");
    console.log("");

    // Verify tables were created
    console.log("");
    console.log("🔍 Verifying tables...");

    const tables = ["devices", "automations", "areas", "people", "integrations"];
    for (const tableName of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);

      if (result.rows[0].exists) {
        console.log(`✅ ${tableName} table exists`);
      } else {
        console.log(`❌ ${tableName} table does not exist`);
      }
    }

    console.log("");
    console.log("🎉 Registry setup complete!");
    console.log("");
    console.log("You can now use the Global '+' menu to:");
    console.log("  - Add devices");
    console.log("  - Create automations");
    console.log("  - Create areas");
    console.log("  - Add people");

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error("");
    console.error("❌ Registry setup failed!");
    console.error("");
    console.error("Error:", error.message);
    console.error("");

    if (error.code === "42P01") {
      console.error("💡 Table might already exist.");
    } else if (error.code === "3D000") {
      console.error("💡 Database does not exist.");
      console.error(`   Create it: CREATE DATABASE ${process.env.DB_NAME || "homeassistant"};`);
    } else if (error.code === "28P01") {
      console.error("💡 Authentication failed.");
      console.error("   Check your DB_PASSWORD in .env");
    }

    console.error("");
    await pool.end();
    process.exit(1);
  }
}

setupRegistries();

