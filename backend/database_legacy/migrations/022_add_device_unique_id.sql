-- Add unique_id and identifiers columns to devices table for duplicate prevention
-- unique_id: A unique identifier for the device (serial number, MAC address, etc.)
-- identifiers: JSONB field storing device identifiers (MAC, serial, etc.)

ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS unique_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS identifiers JSONB;

-- Create unique index on unique_id (allows NULL for devices without unique IDs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_unique_id ON devices(unique_id) 
WHERE unique_id IS NOT NULL;

-- Create GIN index on identifiers for fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_devices_identifiers ON devices USING GIN(identifiers);

-- Create index on integration_id + unique_id combination for faster duplicate checks
CREATE INDEX IF NOT EXISTS idx_devices_integration_unique ON devices(integration_id, unique_id) 
WHERE unique_id IS NOT NULL;
