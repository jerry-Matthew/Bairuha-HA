
import * as dotenv from "dotenv";
import * as path from "path";
import pool from "./db";

// Load environment variables from .env only
dotenv.config({ path: path.join(process.cwd(), ".env") });

async function dumpSchema() {
    console.log("📊 Database Schema Dump");
    console.log("======================");

    try {
        const query = `
      SELECT table_name, column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;

        const result = await pool.query(query);

        // Group by table
        const tables: Record<string, any[]> = {};
        result.rows.forEach(row => {
            if (!tables[row.table_name]) {
                tables[row.table_name] = [];
            }
            tables[row.table_name].push(row);
        });

        // Print each table
        for (const [tableName, columns] of Object.entries(tables)) {
            if (tableName === 'schema_migrations') continue; // Skip migration tracking table

            console.log(`\n📦 Table: [ ${tableName} ]`);
            console.log(`| Column Name | Type | Nullable | Default |`);
            console.log(`|---|---|---|---|`);

            columns.forEach(col => {
                const def = col.column_default ? (col.column_default.length > 20 ? col.column_default.substring(0, 20) + '...' : col.column_default) : '-';
                console.log(`| ${col.column_name.padEnd(15)} | ${col.data_type.padEnd(10)} | ${col.is_nullable.padEnd(3)} | ${def} |`);
            });
        }

    } catch (error) {
        console.error("Error dumping schema:", error);
    } finally {
        await pool.end();
    }
}

dumpSchema();
