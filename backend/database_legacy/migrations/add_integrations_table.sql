-- Integrations/Config Entries Table
-- Stores installed device integrations that can provide devices

CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    status VARCHAR(50) DEFAULT 'loaded',
    config_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_integrations_domain ON integrations(domain);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_integrations_created_at ON integrations(created_at);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add supports_devices column
ALTER TABLE integrations
ADD COLUMN IF NOT EXISTS supports_devices BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_integrations_supports_devices ON integrations(supports_devices);

-- Insert some default/common integrations
INSERT INTO integrations (domain, name, description, icon, status, supports_devices) VALUES
    ('zigbee', 'Zigbee', 'Zigbee devices via coordinator', 'mdi:zigbee', 'loaded', true),
    ('zwave', 'Z-Wave', 'Z-Wave devices via controller', 'mdi:zwave', 'loaded', true),
    ('wifi', 'WiFi Devices', 'WiFi-enabled smart devices', 'mdi:wifi', 'loaded', true),
    ('bluetooth', 'Bluetooth', 'Bluetooth Low Energy devices', 'mdi:bluetooth', 'loaded', true)
ON CONFLICT (domain) DO NOTHING;

-- Update existing rows to set supports_devices
UPDATE integrations
SET supports_devices = true
WHERE domain IN ('zigbee', 'zwave', 'wifi', 'bluetooth');

