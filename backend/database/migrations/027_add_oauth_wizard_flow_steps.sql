-- Add OAuth and Wizard Flow Steps Support
-- Updates config_flows table constraint to allow OAuth and wizard steps
-- This enables Task 59 (OAuth flows) and Task 60 (Wizard flows) to work properly

-- Drop existing constraint
ALTER TABLE config_flows DROP CONSTRAINT IF EXISTS config_flows_step_check;

-- Add updated constraint that includes OAuth and wizard steps
ALTER TABLE config_flows 
ADD CONSTRAINT config_flows_step_check 
CHECK (
  step IN (
    'pick_integration', 
    'discover', 
    'configure', 
    'confirm', 
    'enter_connection', 
    'validate_connection',
    'oauth_authorize',
    'oauth_callback'
  ) 
  OR step LIKE 'wizard_step_%'
);

COMMENT ON CONSTRAINT config_flows_step_check ON config_flows IS 
'Allows basic flow steps, OAuth steps (oauth_authorize, oauth_callback), and wizard steps (wizard_step_*)';
