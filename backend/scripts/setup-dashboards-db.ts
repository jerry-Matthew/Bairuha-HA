
import * as dotenv from "dotenv";
import * as path from "path";
import pool from "./db";
import * as fs from "fs";

// Load environment variables from .env only
dotenv.config({ path: path.join(process.cwd(), ".env") });

async function setupDashboards() {
    console.log("🔧 Setting up dashboards tables...");

    try {
        const schemaPath = path.join(process.cwd(), "database", "dashboards_schema.sql");
        const schemaSQL = fs.readFileSync(schemaPath, "utf-8");

        console.log("⚙️  Executing schema...");
        await pool.query(schemaSQL);

        console.log("✅ Dashboards tables created successfully!");

        // Create a default overview dashboard if none exists
        const dashboardCount = await pool.query('SELECT count(*) FROM dashboards');
        if (parseInt(dashboardCount.rows[0].count) === 0) {
            console.log("📝 Creating default Overview dashboard...");
            await pool.query(`
            INSERT INTO dashboards (title, icon, url_path, "order")
            VALUES ('Overview', 'dashboard', 'overview', 0);
        `);
        }

        await pool.end();
        process.exit(0);
    } catch (error: any) {
        console.error("❌ Setup failed:", error.message);
        await pool.end();
        process.exit(1);
    }
}

setupDashboards();
