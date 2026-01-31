/**
 * TTS Table Setup Script
 * Creates tts_entries table
 * 
 * Usage: npm run setup-tts-table
 * Or: tsx scripts/setup-tts-table.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import pool from "./db";
import * as fs from "fs";

// Load environment variables from .env
dotenv.config({ path: path.join(process.cwd(), ".env") });

async function setupTTSTable() {
  console.log("🔧 Setting up TTS table...");
  console.log("");

  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), "database", "migrations", "add_tts_table.sql");

    if (!fs.existsSync(migrationPath)) {
      console.error("❌ Migration file not found:", migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    console.log("📄 Reading migration file...");
    console.log(`   Path: ${migrationPath}`);
    console.log("");

    // Execute the migration
    console.log("⚙️  Creating TTS table...");
    await pool.query(migrationSQL);

    console.log("");
    console.log("✅ TTS table created successfully!");
    console.log("");

    // Verify table was created
    console.log("🔍 Verifying table...");

    const ttsTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tts_entries'
      );
    `);

    if (ttsTable.rows[0].exists) {
      console.log("✅ tts_entries table exists");

      // Check columns
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'tts_entries' 
        ORDER BY ordinal_position;
      `);
      console.log(`   Columns: ${columns.rows.map((c: any) => c.column_name).join(", ")}`);
    } else {
      console.log("❌ tts_entries table does not exist");
    }

    console.log("");
    console.log("🎉 TTS table is ready!");
    console.log("");
    console.log("You can now:");
    console.log("  1. Generate TTS at /media/tts");
    console.log("  2. View your saved TTS entries on the same page");

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error("");
    console.error("❌ TTS table setup failed!");
    console.error("");
    console.error("Error:", error.message);
    console.error("");

    if (error.code === "42P01") {
      console.error("💡 Table might already exist. This is okay - tables use IF NOT EXISTS.");
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

setupTTSTable();

