-- Add Home Assistant config flow steps to config_flows table
-- This migration updates the CHECK constraint to allow 'enter_connection' and 'validate_connection' steps

-- Drop the existing constraint
ALTER TABLE config_flows DROP CONSTRAINT IF EXISTS config_flows_step_check;

-- Add the new constraint with Home Assistant steps
ALTER TABLE config_flows 
ADD CONSTRAINT config_flows_step_check 
CHECK (step IN ('pick_integration', 'discover', 'configure', 'confirm', 'enter_connection', 'validate_connection'));
