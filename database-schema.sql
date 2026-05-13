-- =====================================================
-- AltarSing Database Schema
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Songs Library Table
CREATE TABLE IF NOT EXISTS songs (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title             TEXT        NOT NULL,
  youtube_link      TEXT,
  categories        TEXT[]      DEFAULT '{}',
  musical_key       TEXT,
  tempo             TEXT        CHECK (tempo IN ('Slow', 'Moderate', 'Fast')),
  notes             TEXT,
  rehearsal_status  TEXT        NOT NULL DEFAULT 'none'
                                CHECK (rehearsal_status IN ('none', 'rehearsing', 'complete')),
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Service Performance Log Table
CREATE TABLE IF NOT EXISTS service_logs (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  song_title      TEXT        NOT NULL,
  song_id         UUID        REFERENCES songs(id) ON DELETE SET NULL,
  musical_key     TEXT,
  lead_singer     TEXT,
  service_date    DATE        NOT NULL,
  service_moment  TEXT        NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- Row Level Security
-- This is a single-user personal app.
-- Enable RLS with open policies for the anon key.
-- =====================================================
ALTER TABLE songs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on songs"
  ON songs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on service_logs"
  ON service_logs FOR ALL USING (true) WITH CHECK (true);

-- Choir Members Table
CREATE TABLE IF NOT EXISTS choir_members (
  id          UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT  NOT NULL,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE choir_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on choir_members"
  ON choir_members FOR ALL USING (true) WITH CHECK (true);

-- Attendance Records Table
-- One record per member per session date
CREATE TABLE IF NOT EXISTS attendance (
  id          UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id   UUID  NOT NULL REFERENCES choir_members(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  present     BOOLEAN NOT NULL DEFAULT false,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (member_id, session_date)
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on attendance"
  ON attendance FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_choir_members_name    ON choir_members(name);
CREATE INDEX IF NOT EXISTS idx_attendance_date        ON attendance(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_member      ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_songs_rehearsal_status ON songs(rehearsal_status);
CREATE INDEX IF NOT EXISTS idx_songs_title             ON songs(title);
CREATE INDEX IF NOT EXISTS idx_service_logs_date       ON service_logs(service_date DESC);
CREATE INDEX IF NOT EXISTS idx_service_logs_lead       ON service_logs(lead_singer);
CREATE INDEX IF NOT EXISTS idx_service_logs_song_id    ON service_logs(song_id);
