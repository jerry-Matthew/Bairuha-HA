
import * as dotenv from "dotenv";
import * as path from "path";
import pool from "./db";

// Load environment variables from .env only
dotenv.config({ path: path.join(process.cwd(), ".env") });

async function dropPeopleTable() {
    console.log("🗑️  Dropping 'people' table...");

    try {
        await pool.query("DROP TABLE IF EXISTS people");
        console.log("✅ Table 'people' dropped successfully.");
    } catch (error) {
        console.error("Error dropping table:", error);
    } finally {
        await pool.end();
    }
}

dropPeopleTable();
