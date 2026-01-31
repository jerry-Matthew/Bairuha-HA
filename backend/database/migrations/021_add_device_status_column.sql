-- Add status column to devices table
-- Status tracks whether device is "online" or "offline"

ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline'));

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);

-- Update existing devices to have default status
UPDATE devices SET status = 'offline' WHERE status IS NULL;
