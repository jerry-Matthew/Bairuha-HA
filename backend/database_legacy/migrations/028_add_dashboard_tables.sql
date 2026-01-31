-- Create dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  icon TEXT,
  url_path TEXT UNIQUE NOT NULL, -- e.g., 'kitchen', 'overview'
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dashboard_cards table
CREATE TABLE IF NOT EXISTS dashboard_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'entity', 'weather', 'markdown', 'grid'
  config JSONB NOT NULL DEFAULT '{}', -- { entityId: "light.kitchen" }
  "order" INTEGER DEFAULT 0,
  width INTEGER DEFAULT 1, -- Grid span (1-4)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster dashboard lookups
CREATE INDEX IF NOT EXISTS idx_dashboards_url_path ON dashboards(url_path);

-- Create index for faster card loading by dashboard
CREATE INDEX IF NOT EXISTS idx_dashboard_cards_dashboard_id ON dashboard_cards(dashboard_id);
