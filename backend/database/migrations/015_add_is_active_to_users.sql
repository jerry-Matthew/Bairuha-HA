-- Migration: Add is_active column to users table
-- This column is required by the authentication system

-- Add is_active column with default value of true
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for is_active lookups (useful for filtering active users)
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Update any existing users to be active by default
UPDATE users SET is_active = true WHERE is_active IS NULL;
