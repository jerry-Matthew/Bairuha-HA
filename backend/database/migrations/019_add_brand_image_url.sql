-- Add brand_image_url field to integration_catalog table
-- This stores the URL to the brand logo/icon from Home Assistant's brands repository

ALTER TABLE integration_catalog
ADD COLUMN IF NOT EXISTS brand_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_catalog_brand_image_url
  ON integration_catalog (brand_image_url)
  WHERE brand_image_url IS NOT NULL;
