-- State History Table
-- Stores historical entity state changes for visualization and analysis

CREATE TABLE IF NOT EXISTS state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id TEXT NOT NULL,
  state TEXT,
  attributes JSONB DEFAULT '{}',
  last_changed TIMESTAMPTZ,
  last_updated TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_state_history_entity_id ON state_history(entity_id);
CREATE INDEX IF NOT EXISTS idx_state_history_recorded_at ON state_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_state_history_entity_recorded ON state_history(entity_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_state_history_last_changed ON state_history(last_changed DESC);
