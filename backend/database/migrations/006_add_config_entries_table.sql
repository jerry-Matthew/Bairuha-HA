-- Config Entries Table
-- Stores integration configuration separately from integrations table
-- This follows Home Assistant's pattern of separating config from integration metadata

CREATE TABLE IF NOT EXISTS config_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_domain VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    options JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'loaded' CHECK (status IN ('loaded', 'setup', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_config_entries_integration_domain ON config_entries(integration_domain);
CREATE INDEX IF NOT EXISTS idx_config_entries_status ON config_entries(status);
CREATE INDEX IF NOT EXISTS idx_config_entries_created_at ON config_entries(created_at);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_config_entries_updated_at ON config_entries;
CREATE TRIGGER update_config_entries_updated_at BEFORE UPDATE ON config_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
