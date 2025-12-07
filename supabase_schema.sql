-- MeetPoint Protocol Database Schema
-- Run this in your Supabase SQL Editor

-- Create the dates table
CREATE TABLE IF NOT EXISTS dates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_details JSONB NOT NULL,
    meetup_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'confirmed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create an index on meetup_time for faster queries
CREATE INDEX IF NOT EXISTS idx_dates_meetup_time ON dates(meetup_time);

-- Create an index on status for filtering
CREATE INDEX IF NOT EXISTS idx_dates_status ON dates(status);

-- Enable Row Level Security (RLS)
ALTER TABLE dates ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for now
-- You can customize this based on your authentication needs
CREATE POLICY "Allow all operations on dates" ON dates
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Optional: Create a function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to call the function
CREATE TRIGGER update_dates_updated_at BEFORE UPDATE ON dates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
