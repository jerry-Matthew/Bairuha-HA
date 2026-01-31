/**
 * Environment Setup Helper Script
 * Helps configure .env with database values
 * 
 * Usage: npx tsx scripts/setup-env.ts
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import * as dotenv from "dotenv";

const ENV_SAMPLE_PATH = path.join(process.cwd(), "ENV_SAMPLE.txt");
const ENV_PATH = path.join(process.cwd(), ".env");

function generateJWTSecret(): string {
  try {
    // Try to use openssl (Linux/Mac)
    return execSync("openssl rand -base64 32", { encoding: "utf-8" }).trim();
  } catch {
    // Fallback for Windows or if openssl is not available
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let secret = "";
    for (let i = 0; i < 43; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }
}

function readEnvSample(): string {
  if (!fs.existsSync(ENV_SAMPLE_PATH)) {
    throw new Error("ENV_SAMPLE.txt not found!");
  }
  return fs.readFileSync(ENV_SAMPLE_PATH, "utf-8");
}

function createEnv(): void {
  if (fs.existsSync(ENV_PATH)) {
    console.log("⚠️  .env already exists!");
    console.log("   If you want to recreate it, delete it first.");
    return;
  }

  let content = readEnvSample();
  
  // Generate JWT secrets
  const jwtSecret = generateJWTSecret();
  const refreshSecret = generateJWTSecret();
  
  // Replace placeholders
  content = content.replace(
    "JWT_SECRET=your_jwt_secret_here_minimum_32_characters_long_and_secure",
    `JWT_SECRET=${jwtSecret}`
  );
  content = content.replace(
    "JWT_REFRESH_SECRET=your_jwt_refresh_secret_here_minimum_32_characters_long_and_secure",
    `JWT_REFRESH_SECRET=${refreshSecret}`
  );
  
  // Write to .env
  fs.writeFileSync(ENV_PATH, content, "utf-8");
  
  console.log("✅ Created .env file!");
  console.log("📝 Generated JWT secrets automatically");
  console.log("");
  console.log("⚠️  IMPORTANT: You still need to update:");
  console.log("   1. DB_PASSWORD - Your PostgreSQL password");
  console.log("   2. Other database values if different from defaults");
  console.log("");
  console.log("📄 Edit .env to add your database credentials");
}

// Interactive setup
console.log("🔧 Environment Setup Helper");
console.log("============================");
console.log("");

createEnv();

console.log("💡 Next steps:");
console.log("   1. Open .env in your editor");
console.log("   2. Update DB_PASSWORD with your PostgreSQL password");
console.log("   3. Update other database values if needed:");
console.log("      - DB_HOST (default: localhost)");
console.log("      - DB_PORT (default: 5432)");
console.log("      - DB_NAME (default: homeassistant)");
console.log("      - DB_USER (default: postgres)");
console.log("   4. Save the file");
console.log("   5. Restart your development server");

