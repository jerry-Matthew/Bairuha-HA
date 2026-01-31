-- Migration: Add config_files table for file uploads
-- Date: 2025-01-15
-- Description: Stores metadata for files uploaded during config flow

CREATE TABLE IF NOT EXISTS config_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_entry_id UUID REFERENCES config_entries(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  mime_type VARCHAR(100),
  file_size BIGINT,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_config_files_config_entry_id ON config_files(config_entry_id);
CREATE INDEX IF NOT EXISTS idx_config_files_field_name ON config_files(field_name);
CREATE INDEX IF NOT EXISTS idx_config_files_uploaded_by ON config_files(uploaded_by);

COMMENT ON TABLE config_files IS 'Stores metadata for files uploaded during integration configuration';
COMMENT ON COLUMN config_files.id IS 'Unique file identifier';
COMMENT ON COLUMN config_files.config_entry_id IS 'Reference to config entry (optional, may be null during upload)';
COMMENT ON COLUMN config_files.field_name IS 'Field name in config schema that this file belongs to';
COMMENT ON COLUMN config_files.original_filename IS 'Original filename from user';
COMMENT ON COLUMN config_files.stored_filename IS 'Stored filename on disk (UUID-based)';
COMMENT ON COLUMN config_files.file_path IS 'Full path to file on disk';
COMMENT ON COLUMN config_files.mime_type IS 'MIME type of the file';
COMMENT ON COLUMN config_files.file_size IS 'File size in bytes';
COMMENT ON COLUMN config_files.uploaded_at IS 'Timestamp when file was uploaded';
COMMENT ON COLUMN config_files.uploaded_by IS 'User who uploaded the file';
