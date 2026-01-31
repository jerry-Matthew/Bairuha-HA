/**
 * Database Setup Script
 * Creates all required tables for the authentication system
 * 
 * Usage: npm run setup-db
 * 
 * This will:
 * 1. Create users table
 * 2. Create refresh_tokens table
 * 3. Create indexes
 * 4. Create triggers
 */

import * as dotenv from "dotenv";
import * as path from "path";
import pool from "./db";
import * as fs from "fs";

// Load environment variables from .env only
dotenv.config({ path: path.join(process.cwd(), ".env") });

async function setupDatabase() {
  console.log("🔧 Setting up database...");
  console.log("");

  try {
    // Read the schema file
    const schemaPath = path.join(process.cwd(), "database", "schema.sql");
    const schemaSQL = fs.readFileSync(schemaPath, "utf-8");

    console.log("📄 Reading schema file...");
    console.log(`   Path: ${schemaPath}`);
    console.log("");

    // Execute the schema
    console.log("⚙️  Executing schema...");
    await pool.query(schemaSQL);

    console.log("");
    console.log("✅ Database setup complete!");
    console.log("");

    // Verify tables were created
    console.log("🔍 Verifying tables...");

    const usersTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    const refreshTokensTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'refresh_tokens'
      );
    `);

    if (usersTable.rows[0].exists) {
      console.log("✅ Users table exists");

      // Check columns
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position;
      `);
      console.log(`   Columns: ${columns.rows.map((c: any) => c.column_name).join(", ")}`);
    } else {
      console.log("❌ Users table does not exist");
    }

    if (refreshTokensTable.rows[0].exists) {
      console.log("✅ Refresh tokens table exists");
    } else {
      console.log("❌ Refresh tokens table does not exist");
    }

    // Check if name column exists (for signup)
    const nameColumn = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'name'
      );
    `);

    if (nameColumn.rows[0].exists) {
      console.log("✅ Name column exists (signup ready)");
    } else {
      console.log("⚠️  Name column missing - running migration...");
      const migrationPath = path.join(process.cwd(), "database", "migrations", "add_name_to_users.sql");
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, "utf-8");
        await pool.query(migrationSQL);
        console.log("✅ Name column added");
      } else {
        console.log("⚠️  Migration file not found, adding name column manually...");
        await pool.query(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS name VARCHAR(255);
        `);
        console.log("✅ Name column added");
      }
    }

    // Check and create media tables
    console.log("");
    console.log("🔍 Checking media tables...");

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

    if (!mediaFilesTable.rows[0].exists || !recordingsTable.rows[0].exists) {
      console.log("⚠️  Media tables missing - running migration...");
      const mediaMigrationPath = path.join(process.cwd(), "database", "migrations", "add_media_tables.sql");
      if (fs.existsSync(mediaMigrationPath)) {
        const migrationSQL = fs.readFileSync(mediaMigrationPath, "utf-8");
        await pool.query(migrationSQL);
        console.log("✅ Media tables created");
      } else {
        console.log("⚠️  Migration file not found");
      }
    } else {
      console.log("✅ Media tables already exist");
    }

    console.log("");
    console.log("🎉 Database is ready!");
    console.log("");
    console.log("You can now:");
    console.log("  1. Sign up new users at /signup");
    console.log("  2. Login at /login");
    console.log("  3. Use the app normally");

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error("");
    console.error("❌ Database setup failed!");
    console.error("");
    console.error("Error:", error.message);
    console.error("");

    if (error.code === "42P01") {
      console.error("💡 Table might already exist. Try dropping and recreating:");
      console.error("   DROP TABLE IF EXISTS refresh_tokens CASCADE;");
      console.error("   DROP TABLE IF EXISTS users CASCADE;");
      console.error("   Then run this script again.");
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

setupDatabase();

