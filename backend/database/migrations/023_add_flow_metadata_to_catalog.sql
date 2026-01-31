-- Add Flow Metadata Columns to Integration Catalog
-- Extends integration_catalog table to store flow type information and flow configuration metadata
-- This enables the system to know which flow type each integration uses and store flow-specific configuration

-- Add flow_type column with CHECK constraint (more compatible than ENUM)
ALTER TABLE integration_catalog
  ADD COLUMN IF NOT EXISTS flow_type TEXT DEFAULT 'manual'
    CHECK (flow_type IN ('none', 'manual', 'discovery', 'oauth', 'wizard', 'hybrid'));

-- Add flow_config JSONB column for flow-specific configuration
ALTER TABLE integration_catalog
  ADD COLUMN IF NOT EXISTS flow_config JSONB;

-- Add handler_class column for custom flow handlers (optional, nullable)
ALTER TABLE integration_catalog
  ADD COLUMN IF NOT EXISTS handler_class TEXT;

-- Add metadata JSONB column for flexible additional fields
ALTER TABLE integration_catalog
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create index for flow_type queries
CREATE INDEX IF NOT EXISTS idx_catalog_flow_type
  ON integration_catalog (flow_type);

-- Add comments for documentation
COMMENT ON COLUMN integration_catalog.flow_type IS 'Type of configuration flow: none, manual, discovery, oauth, wizard, or hybrid';
COMMENT ON COLUMN integration_catalog.flow_config IS 'Flow-specific configuration (discovery protocols, OAuth settings, wizard steps, etc.)';
COMMENT ON COLUMN integration_catalog.handler_class IS 'Optional custom flow handler class name';
COMMENT ON COLUMN integration_catalog.metadata IS 'Additional flexible metadata for future extensibility';

-- Update existing rows to have default flow_type
UPDATE integration_catalog
SET flow_type = 'manual'
WHERE flow_type IS NULL;
