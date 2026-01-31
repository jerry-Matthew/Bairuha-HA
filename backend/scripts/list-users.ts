
import * as dotenv from "dotenv";
import * as path from "path";
import pool from "./db";

// Load environment variables from .env only
dotenv.config({ path: path.join(process.cwd(), ".env") });

async function listUsers() {
  console.log("🔍 Checking users table...");
  try {
    const result = await pool.query("SELECT id, email, name, is_active, created_at FROM users");
    console.log(`Found ${result.rows.length} users:`);
    result.rows.forEach(user => {
        console.log(` - ${user.email} (ID: ${user.id}, Active: ${user.is_active})`);
    });
    
    // Also check if any users have NULL passwords
    const nullPwd = await pool.query("SELECT email FROM users WHERE password_hash IS NULL");
    if (nullPwd.rows.length > 0) {
        console.log("⚠️  WARNING: The following users have no password hash:");
        nullPwd.rows.forEach(u => console.log(`   - ${u.email}`));
    }

  } catch (error) {
    console.error("Error querying users:", error);
  } finally {
    await pool.end();
  }
}

listUsers();
