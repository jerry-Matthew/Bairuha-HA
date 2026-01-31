-- Commands Table
-- 
-- Stores command intent records created from UI.
-- Commands represent user intent only - they are never executed by this system.
-- Commands are auditable and persistent intent artifacts.
--
-- Commands do NOT directly update entity state.
-- Commands do NOT trigger execution.
-- Commands are write-only intent records with immutable status ('pending').
--
-- This table enables the flow:
-- UI → Command API → Command Registry (intent storage only)
--
-- Note: Historical fields (sent_at, acknowledged_at, error_message, status enum)
-- remain in schema for backward compatibility but are not used by runtime code.

CREATE TABLE IF NOT EXISTS commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  command TEXT NOT NULL, -- e.g., "turn_on", "turn_off", "set_value"
  payload JSONB DEFAULT '{}', -- Command parameters
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, acknowledged, failed
  error_message TEXT, -- Error message if status is 'failed'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ, -- When command was sent for execution
  acknowledged_at TIMESTAMPTZ -- When command was acknowledged
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_commands_entity_id ON commands(entity_id);
CREATE INDEX IF NOT EXISTS idx_commands_status ON commands(status);
CREATE INDEX IF NOT EXISTS idx_commands_created_at ON commands(created_at);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_commands_updated_at ON commands;
CREATE TRIGGER update_commands_updated_at BEFORE UPDATE ON commands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
