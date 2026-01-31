-- Add Catalog Sync Tracking
-- Extends integration_catalog table to support version tracking and sync status
-- Creates tables for tracking sync history and changes

-- Add version tracking columns to integration_catalog
ALTER TABLE integration_catalog
  ADD COLUMN IF NOT EXISTS version_hash TEXT, -- Hash of integration metadata for change detection
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ, -- When this integration was last synced
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending' -- pending, synced, error, deprecated
    CHECK (sync_status IN ('pending', 'synced', 'error', 'deprecated'));

-- Create indexes for sync queries
CREATE INDEX IF NOT EXISTS idx_catalog_last_synced_at
  ON integration_catalog (last_synced_at);

CREATE INDEX IF NOT EXISTS idx_catalog_sync_status
  ON integration_catalog (sync_status);

CREATE INDEX IF NOT EXISTS idx_catalog_version_hash
  ON integration_catalog (version_hash);

-- Add trigger to update updated_at
DROP TRIGGER IF EXISTS update_catalog_updated_at ON integration_catalog;
CREATE TRIGGER update_catalog_updated_at BEFORE UPDATE ON integration_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN integration_catalog.version_hash IS 'SHA256 hash of integration metadata for change detection';
COMMENT ON COLUMN integration_catalog.updated_at IS 'Timestamp when integration was last updated';
COMMENT ON COLUMN integration_catalog.last_synced_at IS 'Timestamp when this integration was last synced from Home Assistant';
COMMENT ON COLUMN integration_catalog.sync_status IS 'Sync status: pending (never synced), synced (successfully synced), error (sync failed), deprecated (removed from HA)';

-- Track sync operations
CREATE TABLE IF NOT EXISTS catalog_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  total_integrations INTEGER DEFAULT 0,
  new_integrations INTEGER DEFAULT 0,
  updated_integrations INTEGER DEFAULT 0,
  deleted_integrations INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_details JSONB, -- Array of error objects: [{domain: string, error: string}]
  metadata JSONB, -- Additional sync metadata (GitHub API rate limit info, snapshot data, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_history_status
  ON catalog_sync_history (status);

CREATE INDEX IF NOT EXISTS idx_sync_history_started_at
  ON catalog_sync_history (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_history_sync_type
  ON catalog_sync_history (sync_type);

-- Add comments for documentation
COMMENT ON TABLE catalog_sync_history IS 'Tracks all catalog sync operations';
COMMENT ON COLUMN catalog_sync_history.sync_type IS 'Type of sync: full (all integrations), incremental (only changes), manual (user-triggered)';
COMMENT ON COLUMN catalog_sync_history.status IS 'Sync status: running, completed, failed, cancelled';
COMMENT ON COLUMN catalog_sync_history.error_details IS 'Array of error objects for failed integrations';
COMMENT ON COLUMN catalog_sync_history.metadata IS 'Additional sync metadata (snapshot data, GitHub API info, etc.)';

-- Track what changed in each sync
CREATE TABLE IF NOT EXISTS catalog_sync_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id UUID NOT NULL REFERENCES catalog_sync_history(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('new', 'updated', 'deleted', 'deprecated')),
  previous_version_hash TEXT, -- Hash before change
  new_version_hash TEXT, -- Hash after change
  changed_fields JSONB, -- Array of field names that changed: ["name", "icon", "flow_type"]
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_changes_sync_id
  ON catalog_sync_changes (sync_id);

CREATE INDEX IF NOT EXISTS idx_sync_changes_domain
  ON catalog_sync_changes (domain);

CREATE INDEX IF NOT EXISTS idx_sync_changes_change_type
  ON catalog_sync_changes (change_type);

CREATE INDEX IF NOT EXISTS idx_sync_changes_sync_domain
  ON catalog_sync_changes (sync_id, domain);

-- Add comments for documentation
COMMENT ON TABLE catalog_sync_changes IS 'Tracks individual integration changes per sync operation';
COMMENT ON COLUMN catalog_sync_changes.change_type IS 'Type of change: new (added), updated (modified), deleted (removed from HA), deprecated (marked as deprecated)';
COMMENT ON COLUMN catalog_sync_changes.changed_fields IS 'Array of field names that changed for updated integrations';
