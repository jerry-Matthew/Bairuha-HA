-- Integration Catalog Table
-- Represents all brands/integrations the platform supports
-- This is separate from the integrations table (registry) which tracks what is configured

CREATE TABLE IF NOT EXISTS integration_catalog (
  domain TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  supports_devices BOOLEAN DEFAULT false,
  is_cloud BOOLEAN DEFAULT false,
  documentation_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalog_supports_devices
  ON integration_catalog (supports_devices);
