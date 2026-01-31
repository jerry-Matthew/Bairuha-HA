
import * as dotenv from "dotenv";
import * as path from "path";
import pool from "./db";
import * as bcrypt from "bcryptjs";

// Load environment variables from .env only
dotenv.config({ path: path.join(process.cwd(), ".env") });

async function fixLogin() {
    console.log("🛠️  Starting Login Fix Script...");
    console.log(`   DB Host: ${process.env.DB_HOST}`);
    console.log(`   DB Name: ${process.env.DB_NAME}`);

    const email = "aisotop@gmail.com";
    const password = "password123";

    try {
        // 1. Check if user exists
        console.log(`🔍 Checking for user: ${email}`);
        const checkResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (checkResult.rows.length === 0) {
            console.log("⚠️  User not found. Creating new user...");
            const hashedPassword = await bcrypt.hash(password, 10);
            const name = "Aisotop User";

            const insertResult = await pool.query(
                "INSERT INTO users (name, email, password_hash, is_active, created_at, updated_at) VALUES ($1, $2, $3, true, NOW(), NOW()) RETURNING id",
                [name, email, hashedPassword]
            );
            console.log(`✅ User created with ID: ${insertResult.rows[0].id}`);
        } else {
            console.log("ℹ️  User exists. Updating password to be sure...");
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                "UPDATE users SET password_hash = $1, is_active = true WHERE email = $2",
                [hashedPassword, email]
            );
            console.log("✅ Password updated.");
        }

        // 2. Verify IMMEDIATELY
        console.log("🔐 Verifying login immediately...");
        const verifyResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (verifyResult.rows.length === 0) {
            console.error("❌ CRITICAL ERROR: User was created/updated but SELECT returned nothing!");
        } else {
            const user = verifyResult.rows[0];
            const isMatch = await bcrypt.compare(password, user.password_hash);

            if (isMatch) {
                console.log("✅ VERIFICATION SUCCESS: Login should work now.");
                console.log(`   Email: ${email}`);
                console.log(`   Password: ${password}`);
            } else {
                console.error("❌ VERIFICATION FAILED: Password mismatch even after reset!");
            }
        }

    } catch (error) {
        console.error("❌ Script failed:", error);
    } finally {
        await pool.end();
    }
}

fixLogin();
