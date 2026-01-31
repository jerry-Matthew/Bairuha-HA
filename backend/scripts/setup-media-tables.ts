/**
 * Media Tables Setup Script
 * Creates media_files and recordings tables
 * 
 * Usage: npm run setup-media-tables
 * Or: tsx scripts/setup-media-tables.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
import pool from "./db";
import * as fs from "fs";

// Load environment variables from .env
dotenv.config({ path: path.join(process.cwd(), ".env") });

async function setupMediaTables() {
  console.log("🔧 Setting up media tables...");
  console.log("");

  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), "database", "migrations", "add_media_tables.sql");

    if (!fs.existsSync(migrationPath)) {
      console.error("❌ Migration file not found:", migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    console.log("📄 Reading migration file...");
    console.log(`   Path: ${migrationPath}`);
    console.log("");

    // Execute the migration
    console.log("⚙️  Creating media tables...");
    await pool.query(migrationSQL);

    console.log("");
    console.log("✅ Media tables created successfully!");
    console.log("");

    // Verify tables were created
    console.log("🔍 Verifying tables...");

    const mediaFilesTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'media_files'
      );
    `);

    const recordingsTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'recordings'
      );
    `);

    if (mediaFilesTable.rows[0].exists) {
      console.log("✅ media_files table exists");

      // Check columns
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'media_files' 
        ORDER BY ordinal_position;
      `);
      console.log(`   Columns: ${columns.rows.map((c: any) => c.column_name).join(", ")}`);
    } else {
      console.log("❌ media_files table does not exist");
    }

    if (recordingsTable.rows[0].exists) {
      console.log("✅ recordings table exists");

      // Check columns
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'recordings' 
        ORDER BY ordinal_position;
      `);
      console.log(`   Columns: ${columns.rows.map((c: any) => c.column_name).join(", ")}`);
    } else {
      console.log("❌ recordings table does not exist");
    }

    console.log("");
    console.log("🎉 Media tables are ready!");
    console.log("");
    console.log("You can now:");
    console.log("  1. Upload images at /media/upload");
    console.log("  2. View your media at /media/library");
    console.log("  3. View recordings at /media/recordings");

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error("");
    console.error("❌ Media tables setup failed!");
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

setupMediaTables();

