-- TTS (Text-to-Speech) entries table
-- Stores metadata for generated TTS audio files

CREATE TABLE IF NOT EXISTS tts_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    language VARCHAR(10) NOT NULL,
    voice VARCHAR(100),
    file_path VARCHAR(500) NOT NULL,
    url VARCHAR(500) NOT NULL,
    size BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tts_entries_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_tts_entries_user_id ON tts_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_tts_entries_created_at ON tts_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tts_entries_language ON tts_entries(language);
