-- Add AI profile caching table
CREATE TABLE IF NOT EXISTS venue_ai_profiles (
  venue_name TEXT PRIMARY KEY,
  romantic INTEGER CHECK (romantic >= 0 AND romantic <= 10),
  casual INTEGER CHECK (casual >= 0 AND casual <= 10),
  upscale INTEGER CHECK (upscale >= 0 AND upscale <= 10),
  energetic INTEGER CHECK (energetic >= 0 AND energetic <= 10),
  date_worthy INTEGER CHECK (date_worthy >= 0 AND date_worthy <= 10),
  analyzed_at TIMESTAMP DEFAULT NOW(),
  venue_type TEXT,
  cuisine TEXT
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_venue_ai_profiles_name ON venue_ai_profiles(venue_name);

-- Index for filtering by date worthiness
CREATE INDEX IF NOT EXISTS idx_venue_ai_profiles_date_worthy ON venue_ai_profiles(date_worthy DESC);
