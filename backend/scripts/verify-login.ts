
import * as dotenv from "dotenv";
import * as path from "path";
import pool from "./db";
import * as bcrypt from "bcryptjs";

// Load environment variables from .env only
dotenv.config({ path: path.join(process.cwd(), ".env") });

async function verifyLogin(email: string, password: string) {
    console.log(`🔍 Verifying login for: ${email}`);
    console.log(`   DB Host: ${process.env.DB_HOST}`);
    console.log(`   DB Name: ${process.env.DB_NAME}`);

    try {
        // 1. Fetch user from DB
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length === 0) {
            console.log("❌ User NOT found in database.");

            // List ALL users
            const allUsers = await pool.query("SELECT email FROM users");
            console.log(`   Total users in DB: ${allUsers.rows.length}`);
            if (allUsers.rows.length > 0) {
                console.log("   Existing users: " + allUsers.rows.map(u => u.email).join(", "));
            }
            return;
        }

        const user = result.rows[0];
        console.log("✅ User found in database.");
        console.log(`   ID: ${user.id}`);
        console.log(`   Hash from DB: ${user.password_hash.substring(0, 20)}...`);

        // 2. Compare password
        console.log("🔑 Comparing password...");
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (isMatch) {
            console.log("✅ Password MATCHES!");
        } else {
            console.log("❌ Password DOES NOT MATCH.");
        }

    } catch (error) {
        console.error("Error verifying login:", error);
    } finally {
        await pool.end();
    }
}

const email = "aisotop@gmail.com";
const password = "password123";

verifyLogin(email, password);
