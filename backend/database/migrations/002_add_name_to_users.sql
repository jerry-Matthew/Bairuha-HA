-- Migration: Add optional name field to users table
-- Run this if you need to add the name field to existing databases

-- Add name column (nullable, optional)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Add index for name lookups (optional, but useful if you'll search by name)
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name) WHERE name IS NOT NULL;
