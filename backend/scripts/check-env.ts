/**
 * Check Environment Variables
 * Verifies .env is configured correctly
 * 
 * Usage: npm run check-env
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load .env file only
dotenv.config({ path: path.join(process.cwd(), ".env") });

console.log("🔍 Checking environment configuration (.env)...");
console.log("");

const requiredVars = [
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
];

let allGood = true;

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  const isSet = value !== undefined && value !== null && value.trim() !== "";
  
  if (varName === "DB_PASSWORD") {
    // Special handling for password
    if (!isSet) {
      console.log(`❌ ${varName}: NOT SET or EMPTY`);
      console.log(`   ⚠️  This is likely causing your connection error!`);
      allGood = false;
    } else {
      console.log(`✅ ${varName}: SET (${value.length} characters)`);
      if (value.trim() === "") {
        console.log(`   ⚠️  Password is empty - this might be OK if PostgreSQL allows it`);
      }
    }
  } else {
    if (isSet) {
      console.log(`✅ ${varName}: ${value}`);
    } else {
      console.log(`❌ ${varName}: NOT SET`);
      allGood = false;
    }
  }
});

console.log("");

if (allGood) {
  console.log("✅ All required environment variables are set!");
  console.log("");
  console.log("💡 If you're still getting connection errors:");
  console.log("   1. Verify your PostgreSQL password is correct");
  console.log("   2. Make sure PostgreSQL is running");
  console.log("   3. Check that the database exists");
  console.log("   4. Try: psql -U postgres -h localhost (to test manually)");
} else {
  console.log("❌ Some environment variables are missing!");
  console.log("");
  console.log("💡 Fix the issues above and try again.");
}

console.log("");

