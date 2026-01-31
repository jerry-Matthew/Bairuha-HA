-- Add Integration Flow Definitions Table
-- Stores complete flow definitions for each integration, including step definitions, validation rules, and UI components
-- This enables dynamic flow rendering based on stored definitions rather than hardcoded logic

CREATE TABLE IF NOT EXISTS integration_flow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_domain TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  flow_type TEXT NOT NULL CHECK (flow_type IN ('none', 'manual', 'discovery', 'oauth', 'wizard', 'hybrid')),
  
  -- Flow definition structure (JSONB)
  definition JSONB NOT NULL,
  
  -- Handler configuration
  handler_class TEXT, -- Optional custom handler class name
  handler_config JSONB, -- Handler-specific configuration
  
  -- Metadata
  is_active BOOLEAN DEFAULT true, -- Only one active version per domain
  is_default BOOLEAN DEFAULT false, -- Default definition for domain
  description TEXT,
  created_by TEXT, -- User/system that created this definition
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_definition CHECK (jsonb_typeof(definition) = 'object')
);

-- Unique constraint: Only one active version per domain
CREATE UNIQUE INDEX IF NOT EXISTS idx_flow_definitions_unique_active 
  ON integration_flow_definitions(integration_domain) 
  WHERE is_active = true;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_flow_definitions_domain 
  ON integration_flow_definitions(integration_domain);

CREATE INDEX IF NOT EXISTS idx_flow_definitions_domain_version 
  ON integration_flow_definitions(integration_domain, version);

CREATE INDEX IF NOT EXISTS idx_flow_definitions_active 
  ON integration_flow_definitions(integration_domain, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_flow_definitions_type 
  ON integration_flow_definitions(flow_type);

CREATE INDEX IF NOT EXISTS idx_flow_definitions_default 
  ON integration_flow_definitions(integration_domain, is_default) 
  WHERE is_default = true;

-- Comments for documentation
COMMENT ON TABLE integration_flow_definitions IS 'Stores flow definitions for integration setup flows';
COMMENT ON COLUMN integration_flow_definitions.integration_domain IS 'Integration domain (e.g., homeassistant, nest, philips_hue)';
COMMENT ON COLUMN integration_flow_definitions.version IS 'Version number of this flow definition';
COMMENT ON COLUMN integration_flow_definitions.flow_type IS 'Type of configuration flow: none, manual, discovery, oauth, wizard, or hybrid';
COMMENT ON COLUMN integration_flow_definitions.definition IS 'Complete flow definition including steps, validation rules, and UI components (JSONB)';
COMMENT ON COLUMN integration_flow_definitions.handler_class IS 'Optional custom flow handler class name (overrides default handler)';
COMMENT ON COLUMN integration_flow_definitions.handler_config IS 'Handler-specific configuration (JSONB)';
COMMENT ON COLUMN integration_flow_definitions.is_active IS 'Only one active version per integration domain';
COMMENT ON COLUMN integration_flow_definitions.is_default IS 'Default definition for domain (used when no active version exists)';
COMMENT ON COLUMN integration_flow_definitions.description IS 'Human-readable description of this flow definition';
COMMENT ON COLUMN integration_flow_definitions.created_by IS 'User or system identifier that created this definition';
