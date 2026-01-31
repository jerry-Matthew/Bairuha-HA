-- Add Home Assistant entity tracking fields to entities table
-- This migration adds ha_entity_id and source fields to track entity origin

-- Add ha_entity_id column (nullable - only HA entities have this)
ALTER TABLE entities 
  ADD COLUMN IF NOT EXISTS ha_entity_id TEXT;

-- Add source column with default 'internal'
ALTER TABLE entities 
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'internal';

-- Update existing entities to have 'internal' source if not set
UPDATE entities SET source = 'internal' WHERE source IS NULL;

-- Add CHECK constraint for source values
ALTER TABLE entities 
  DROP CONSTRAINT IF EXISTS check_source;
  
ALTER TABLE entities 
  ADD CONSTRAINT check_source CHECK (source IN ('ha', 'internal', 'hybrid'));

-- Create unique index on ha_entity_id (only for non-null values)
-- This prevents duplicate HA entities
CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_ha_entity_id 
  ON entities(ha_entity_id) 
  WHERE ha_entity_id IS NOT NULL;

-- Create index on source for fast filtering
CREATE INDEX IF NOT EXISTS idx_entities_source 
  ON entities(source);
