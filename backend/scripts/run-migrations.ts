/**
 * Migration Runner Script
 * Runs all database migrations in order and tracks which ones have been executed
 * 
 * Usage: npm run migrate
 * 
 * This will:
 * 1. Create a migrations tracking table if it doesn't exist
 * 2. Read all migration files from database/migrations/
 * 3. Execute them in alphabetical order
 * 4. Track which migrations have been run
 * 5. Skip migrations that have already been executed
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import pool from "./db";

// Load environment variables from .env only
dotenv.config({ path: path.join(process.cwd(), ".env") });

interface Migration {
  filename: string;
  filepath: string;
  sql: string;
}

async function createMigrationsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_schema_migrations_filename 
      ON schema_migrations(filename);
  `;

  await pool.query(createTableSQL);
  console.log("✅ Migrations tracking table ready");
}

async function getExecutedMigrations(): Promise<string[]> {
  try {
    const result = await pool.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations ORDER BY filename"
    );
    return result.rows.map(row => row.filename);
  } catch (error: any) {
    // Table might not exist yet, return empty array
    if (error.code === "42P01") {
      return [];
    }
    throw error;
  }
}

async function markMigrationAsExecuted(filename: string) {
  await pool.query(
    "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING",
    [filename]
  );
}

async function getMigrationFiles(): Promise<Migration[]> {
  const migrationsDir = path.join(process.cwd(), "database_legacy", "migrations");

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith(".sql"))
    .sort(); // Sort alphabetically to ensure consistent execution order

  const migrations: Migration[] = [];

  for (const file of files) {
    const filepath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filepath, "utf-8");

    migrations.push({
      filename: file,
      filepath,
      sql: sql.trim()
    });
  }

  return migrations;
}

async function runMigration(migration: Migration): Promise<void> {
  console.log(`\n📄 Running migration: ${migration.filename}`);

  try {
    // Execute the migration in a transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(migration.sql);
      await markMigrationAsExecuted(migration.filename);
      await client.query("COMMIT");
      console.log(`✅ Migration completed: ${migration.filename}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error(`❌ Migration failed: ${migration.filename}`);
    console.error(`   Error: ${error.message}`);
    throw error;
  }
}

async function runAllMigrations() {
  console.log("🚀 Starting migration runner...");
  console.log("");

  try {
    // Ensure migrations table exists
    await createMigrationsTable();
    console.log("");

    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations();
    console.log(`📋 Found ${executedMigrations.length} previously executed migration(s)`);
    if (executedMigrations.length > 0) {
      console.log(`   Executed: ${executedMigrations.join(", ")}`);
    }
    console.log("");

    // Get all migration files
    const allMigrations = await getMigrationFiles();
    console.log(`📦 Found ${allMigrations.length} migration file(s) in database/migrations/`);
    console.log("");

    if (allMigrations.length === 0) {
      console.log("⚠️  No migration files found. Nothing to run.");
      await pool.end();
      process.exit(0);
    }

    // Filter out already executed migrations
    const pendingMigrations = allMigrations.filter(
      migration => !executedMigrations.includes(migration.filename)
    );

    if (pendingMigrations.length === 0) {
      console.log("✅ All migrations have already been executed!");
      console.log("");
      await pool.end();
      process.exit(0);
    }

    console.log(`🔄 Running ${pendingMigrations.length} pending migration(s)...`);
    console.log("");

    // Run each pending migration
    for (const migration of pendingMigrations) {
      await runMigration(migration);
    }

    console.log("");
    console.log("🎉 All migrations completed successfully!");
    console.log("");

    // Show final status
    const finalExecuted = await getExecutedMigrations();
    console.log(`📊 Total migrations executed: ${finalExecuted.length}`);
    console.log(`   ${finalExecuted.join(", ")}`);

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error("");
    console.error("❌ Migration runner failed!");
    console.error("");
    console.error("Error:", error.message);
    console.error("");

    if (error.code === "42P01") {
      console.error("💡 Table might not exist. Check your database connection.");
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

runAllMigrations();

