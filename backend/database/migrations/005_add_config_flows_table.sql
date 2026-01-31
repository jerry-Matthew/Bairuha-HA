-- Config Flows Table
-- Stores persistent config flows for device setup
-- This replaces in-memory flow storage for reliability and multi-user support

CREATE TABLE IF NOT EXISTS config_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    integration_domain VARCHAR(255),
    step VARCHAR(50) NOT NULL CHECK (step IN ('pick_integration', 'discover', 'configure', 'confirm', 'enter_connection', 'validate_connection')),
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_config_flows_user_id ON config_flows(user_id);
CREATE INDEX IF NOT EXISTS idx_config_flows_integration_domain ON config_flows(integration_domain);
CREATE INDEX IF NOT EXISTS idx_config_flows_step ON config_flows(step);
CREATE INDEX IF NOT EXISTS idx_config_flows_created_at ON config_flows(created_at);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_config_flows_updated_at ON config_flows;
CREATE TRIGGER update_config_flows_updated_at BEFORE UPDATE ON config_flows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
