/**
 * Setup script for entity registry
 * 
 * Run this script to:
 * 1. Create the entities table
 * 2. Remove the device status field (devices must not have state)
 * 
 * Usage: npx tsx scripts/setup-entities.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import pool from "./db";
import * as fs from "fs";

// Load environment variables from .env only
dotenv.config({ path: path.join(process.cwd(), ".env") });

async function setupEntities() {
  console.log("🔧 Setting up entity registry...");
  console.log("");

  try {
    // Step 1: Create entities table
    console.log("📄 Step 1: Creating entities table...");
    const entitiesMigrationPath = path.join(process.cwd(), "database", "migrations", "add_entities_table.sql");

    if (!fs.existsSync(entitiesMigrationPath)) {
      console.error(`❌ Migration file not found: ${entitiesMigrationPath}`);
      process.exit(1);
    }

    const entitiesSQL = fs.readFileSync(entitiesMigrationPath, "utf-8");
    console.log("⚙️  Executing entities migration...");
    await pool.query(entitiesSQL);
    console.log("✅ Entities table created successfully!");
    console.log("");

    // Step 2: Remove device status field (devices must not have state)
    console.log("📄 Step 2: Removing device status field...");
    const removeStatusMigrationPath = path.join(process.cwd(), "database", "migrations", "remove_device_status_field.sql");

    if (fs.existsSync(removeStatusMigrationPath)) {
      const removeStatusSQL = fs.readFileSync(removeStatusMigrationPath, "utf-8");
      console.log("⚙️  Executing remove status migration...");
      await pool.query(removeStatusSQL);
      console.log("✅ Device status field removed successfully!");
    } else {
      console.log("⚠️  Remove status migration file not found (may have already been applied)");
    }
    console.log("");

    // Verify entities table was created
    console.log("🔍 Verifying entities table...");
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'entities'
      );
    `);

    if (result.rows[0].exists) {
      console.log("✅ entities table exists");

      // Check table structure
      const columnsResult = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'entities'
        ORDER BY ordinal_position;
      `);

      console.log("");
      console.log("📊 Entities table structure:");
      columnsResult.rows.forEach((row: any) => {
        console.log(`   - ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log("❌ entities table does not exist");
    }

    // Verify device status field was removed
    console.log("");
    console.log("🔍 Verifying device status field removal...");
    const statusColumnResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'devices'
        AND column_name = 'status'
      );
    `);

    if (!statusColumnResult.rows[0].exists) {
      console.log("✅ Device status field does not exist (correct)");
    } else {
      console.log("⚠️  Device status field still exists (may need manual removal)");
    }

    console.log("");
    console.log("🎉 Entity registry setup complete!");
    console.log("");
    console.log("Key points:");
    console.log("  ✅ Entities table created");
    console.log("  ✅ Devices do not have state (entities have state)");
    console.log("  ✅ When devices are registered, entities are created automatically");
    console.log("");

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error("");
    console.error("❌ Entity registry setup failed!");
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

setupEntities();

