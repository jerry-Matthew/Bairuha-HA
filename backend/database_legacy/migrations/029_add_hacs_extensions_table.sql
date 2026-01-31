-- HACS Extensions table
CREATE TABLE IF NOT EXISTS hacs_extensions (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    github_repo VARCHAR(255) NOT NULL,
    stars INTEGER DEFAULT 0,
    downloads INTEGER DEFAULT 0,
    last_activity VARCHAR(255),
    version VARCHAR(255),
    installed_version VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    restart_required BOOLEAN DEFAULT false,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient filtering and searching
CREATE INDEX IF NOT EXISTS idx_hacs_extensions_type ON hacs_extensions(type);
CREATE INDEX IF NOT EXISTS idx_hacs_extensions_status ON hacs_extensions(status);
CREATE INDEX IF NOT EXISTS idx_hacs_extensions_github_repo ON hacs_extensions(github_repo);
