-- User Feedback & Analytics Schema
-- Run this in your Supabase SQL Editor to enable learning from user behavior

-- Track venue selections for popularity boost
CREATE TABLE IF NOT EXISTS venue_selections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_id TEXT NOT NULL,
    venue_name TEXT NOT NULL,
    venue_type TEXT,
    final_score INTEGER,
    ai_recommended BOOLEAN DEFAULT FALSE,
    confirmed BOOLEAN DEFAULT FALSE,
    selected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast venue lookups
CREATE INDEX IF NOT EXISTS idx_venue_selections_venue_id 
ON venue_selections(venue_id);

-- Index for time-based queries (popular this week)
CREATE INDEX IF NOT EXISTS idx_venue_selections_time 
ON venue_selections(selected_at DESC);

-- Index for confirmed dates
CREATE INDEX IF NOT EXISTS idx_venue_selections_confirmed 
ON venue_selections(confirmed) WHERE confirmed = TRUE;

-- Enable RLS
ALTER TABLE venue_selections ENABLE ROW LEVEL SECURITY;

-- Allow all operations (for anonymous tracking)
CREATE POLICY "Allow anonymous venue tracking" ON venue_selections
    FOR ALL
    USING (true)
    WITH CHECK (true);
