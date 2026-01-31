-- Enhance entity source constraints and indexes for conflict resolution
-- This migration adds additional constraints to ensure data consistency

-- Ensure source is always set (should already be default, but make it explicit)
ALTER TABLE entities 
  ALTER COLUMN source SET DEFAULT 'internal';

-- Fix existing data inconsistencies before adding constraint
-- Case 1: Entities with source 'ha' or 'hybrid' but no ha_entity_id
--         -> Change to 'internal' since we can't determine ha_entity_id
UPDATE entities 
SET source = 'internal' 
WHERE source IN ('ha', 'hybrid') AND ha_entity_id IS NULL;

-- Case 2: Entities with source 'internal' but ha_entity_id is set
--         -> Clear ha_entity_id since internal entities shouldn't have it
UPDATE entities 
SET ha_entity_id = NULL 
WHERE source = 'internal' AND ha_entity_id IS NOT NULL;

-- Add check constraint for source and ha_entity_id consistency
-- HA and hybrid entities must have ha_entity_id, internal entities must not
ALTER TABLE entities 
  DROP CONSTRAINT IF EXISTS check_source_ha_entity_id;
  
ALTER TABLE entities 
  ADD CONSTRAINT check_source_ha_entity_id 
  CHECK (
    (source IN ('ha', 'hybrid') AND ha_entity_id IS NOT NULL) OR
    (source = 'internal' AND ha_entity_id IS NULL)
  );

-- Add index for faster duplicate detection (entity_id + source)
CREATE INDEX IF NOT EXISTS idx_entities_entity_id_source 
  ON entities(entity_id, source);

-- Add partial index for source filtering (only HA and hybrid entities)
-- This is more efficient than a full index
DROP INDEX IF EXISTS idx_entities_source;
CREATE INDEX IF NOT EXISTS idx_entities_source 
  ON entities(source) 
  WHERE source IN ('ha', 'hybrid');
