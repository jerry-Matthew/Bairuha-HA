/**
 * Script to create a user in the database
 * Usage: npx ts-node scripts/create-user.ts <email> <password>
 */

// Load environment variables from .env only
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env file
dotenv.config({ path: path.join(process.cwd(), ".env") });


import { query } from "./db";
import * as bcrypt from "bcryptjs"; // Added bcryptjs import

async function createUser(email: string, password: string) {
  try {
    // Check if user exists
    const existingUser = await query("SELECT * FROM users WHERE email = $1", [email]);
    if (existingUser.rowCount && existingUser.rowCount > 0) {
      console.log(`❌ User already exists: ${email}`);
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Default values
    const name = email.split('@')[0]; // Derive a name from email

    // Create user
    // Using password_hash instead of password
    const newUser = await query(
      "INSERT INTO users (name, email, password_hash, is_active, created_at, updated_at) VALUES ($1, $2, $3, true, NOW(), NOW()) RETURNING id, email, is_active",
      [name, email, hashedPassword]
    );

    console.log(`✅ User created successfully: ${newUser.rows[0].email}`);
    console.log(`  ID: ${newUser.rows[0].id}`);
    console.log(`  Email: ${newUser.rows[0].email}`);
    console.log(`  Active: ${newUser.rows[0].is_active}`);
  } catch (error: any) {
    console.error("Error creating user:", error.message);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: npx ts-node scripts/create-user.ts <email> <password>");
  process.exit(1);
}

const [email, password] = args;
createUser(email, password).then(() => {
  process.exit(0);
});

