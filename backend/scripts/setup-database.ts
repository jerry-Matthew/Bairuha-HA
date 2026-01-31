/**
 * Database Verification Script
 * Checks if the database is correctly set up by the application (TypeORM)
 * 
 * Usage: npm run setup-db
 */

import * as dotenv from "dotenv";
import * as path from "path";
import pool from "./db";

// Load environment variables from .env only
dotenv.config({ path: path.join(process.cwd(), ".env") });

async function setupDatabase() {
  console.log("🔧 Verifying database setup...");
  console.log("");

  try {
    // 1. Check for Users table (Primary Indicator)
    const usersTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!usersTable.rows[0].exists) {
      console.log("❌ Database schema not found.");
      console.log("");
      console.log("💡 The application is configured to auto-create the schema (synchronize: true).");
      console.log("   Please run the backend to initialize the database:");
      console.log("");
      console.log("   npm run start:dev");
      console.log("");
      await pool.end();
      process.exit(0);
    }

    console.log("✅ Database schema found (created by TypeORM)");

    // 2. Check for required columns (Sanity Check)
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);

    const columnNames = columns.rows.map((c: any) => c.column_name);
    console.log(`   Users table columns: ${columnNames.join(", ")}`);

    if (!columnNames.includes('name')) {
      console.warn("⚠️  'name' column missing in users table. TypeORM should have created this.");
    }

    if (!columnNames.includes('password_hash')) {
      console.warn("⚠️  'password_hash' column missing. This looks like a legacy table.");
    }

    // 3. Check for specific Entity tables
    const tablesToCheck = ['integrations', 'devices', 'hacs_extensions'];
    for (const table of tablesToCheck) {
      const check = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            );
        `, [table]);

      if (check.rows[0].exists) {
        console.log(`✅ Table '${table}' exists`);
      } else {
        console.log(`⚠️  Table '${table}' is missing`);
      }
    }

    console.log("");
    console.log("🎉 Database structure looks correct!");
    console.log("");

    // 4. Check for Users
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const count = parseInt(userCount.rows[0].count);

    if (count === 0) {
      console.log("ℹ️  No users found.");
      console.log("   Run 'npm run create-user' to create your first admin account.");
    } else {
      console.log(`✅ Found ${count} existing user(s).`);
    }

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error("");
    console.error("❌ Database verification failed!");
    console.error("Error:", error.message);

    if (error.code === "3D000") {
      console.error("💡 Database does not exist.");
      console.error(`   Create it: CREATE DATABASE ${process.env.DB_NAME || "homeassistant"};`);
    } else if (error.code === "28P01") {
      console.error("💡 Authentication failed. Check your .env file.");
    }

    console.error("");
    await pool.end();
    process.exit(1);
  }
}

setupDatabase();
