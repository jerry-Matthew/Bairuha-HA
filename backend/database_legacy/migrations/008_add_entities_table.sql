-- Entities Table for Entity Registry
-- Devices are metadata containers, Entities are the controllable/observable units

CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  device_id UUID NOT NULL
    REFERENCES devices(id)
    ON DELETE CASCADE,
  
  entity_id TEXT NOT NULL,          -- e.g. light.living_room
  domain TEXT NOT NULL,             -- light, sensor, switch, etc.
  name TEXT,
  icon TEXT,
  
  state TEXT,
  attributes JSONB DEFAULT '{}',
  
  last_changed TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT now(),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE (device_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_entities_device_id ON entities(device_id);
CREATE INDEX IF NOT EXISTS idx_entities_domain ON entities(domain);
CREATE INDEX IF NOT EXISTS idx_entities_entity_id ON entities(entity_id);

-- Trigger to update last_updated on state changes
CREATE OR REPLACE FUNCTION update_entity_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = now();
    IF NEW.state IS DISTINCT FROM OLD.state THEN
        NEW.last_changed = now();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_entities_last_updated BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE FUNCTION update_entity_last_updated();
