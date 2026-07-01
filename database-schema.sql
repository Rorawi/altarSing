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
  role        TEXT,
  image_url   TEXT,
  birth_date  DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE choir_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on choir_members"
  ON choir_members FOR ALL USING (true) WITH CHECK (true);

-- Attendance Records Table
-- One record per member per session date
CREATE TABLE IF NOT EXISTS attendance (
  id              UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id       UUID  NOT NULL REFERENCES choir_members(id) ON DELETE CASCADE,
  session_date    DATE  NOT NULL,
  present         BOOLEAN NOT NULL DEFAULT false,
  absence_reason  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (member_id, session_date)
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on attendance"
  ON attendance FOR ALL USING (true) WITH CHECK (true);

-- Rehearsal Sessions Table
CREATE TABLE IF NOT EXISTS rehearsal_sessions (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  date       DATE        NOT NULL,
  name       TEXT        NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE rehearsal_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on rehearsal_sessions"
  ON rehearsal_sessions FOR ALL USING (true) WITH CHECK (true);

-- Rehearsal Songs Table (songs within a session, in order)
CREATE TABLE IF NOT EXISTS rehearsal_songs (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id        UUID        NOT NULL REFERENCES rehearsal_sessions(id) ON DELETE CASCADE,
  position          INTEGER     NOT NULL DEFAULT 1,
  song_title        TEXT        NOT NULL,
  song_id           UUID        REFERENCES songs(id) ON DELETE SET NULL,
  key_used          TEXT,
  has_modulation    BOOLEAN     NOT NULL DEFAULT false,
  modulation_from   TEXT,
  modulation_to     TEXT,
  harmony_notes     TEXT,
  arrangement_notes TEXT,
  run_throughs      INTEGER     NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE rehearsal_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on rehearsal_songs"
  ON rehearsal_songs FOR ALL USING (true) WITH CHECK (true);

-- Harmony Patterns Table
CREATE TABLE IF NOT EXISTS harmony_patterns (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE harmony_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on harmony_patterns"
  ON harmony_patterns FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_rehearsal_sessions_date   ON rehearsal_sessions(date DESC);
CREATE INDEX IF NOT EXISTS idx_rehearsal_songs_session    ON rehearsal_songs(session_id, position);
CREATE INDEX IF NOT EXISTS idx_attendance_date        ON attendance(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_member      ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_songs_rehearsal_status ON songs(rehearsal_status);
CREATE INDEX IF NOT EXISTS idx_songs_title             ON songs(title);
CREATE INDEX IF NOT EXISTS idx_service_logs_date       ON service_logs(service_date DESC);
CREATE INDEX IF NOT EXISTS idx_service_logs_lead       ON service_logs(lead_singer);
CREATE INDEX IF NOT EXISTS idx_service_logs_song_id    ON service_logs(song_id);

-- =====================================================
-- Migration: Program Scheduling & Auto Log Generation
-- Run this AFTER the initial schema above
-- =====================================================

-- Multi-song support for service_logs
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS songs         JSONB    NOT NULL DEFAULT '[]';
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS lead_singers  TEXT[]   NOT NULL DEFAULT '{}';

-- Auto-generation tracking
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS source_session_id    UUID;
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS source_session_name  TEXT;
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS is_auto_generated    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS reviewed             BOOLEAN NOT NULL DEFAULT false;

-- Program date scheduling on rehearsal sessions
ALTER TABLE rehearsal_sessions ADD COLUMN IF NOT EXISTS program_date       DATE;
ALTER TABLE rehearsal_sessions ADD COLUMN IF NOT EXISTS program_converted  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE rehearsal_sessions ADD COLUMN IF NOT EXISTS program_log_id     UUID;

-- Migrate existing single-song service_logs into the songs JSONB array
UPDATE service_logs
SET
  songs = json_build_array(
    json_build_object('title', song_title, 'key', musical_key, 'song_id', song_id::text)
  ),
  lead_singers = CASE
    WHEN lead_singer IS NOT NULL AND lead_singer <> '' THEN ARRAY[lead_singer]
    ELSE '{}'::TEXT[]
  END
WHERE songs = '[]'::jsonb;

-- =====================================================
-- Migration: Medley Groups
-- Run this AFTER the migrations above
-- =====================================================

-- Medley groups table: named groups of songs within a rehearsal session
CREATE TABLE IF NOT EXISTS rehearsal_medley_groups (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID        NOT NULL REFERENCES rehearsal_sessions(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  position    INTEGER     NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE rehearsal_medley_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on rehearsal_medley_groups"
  ON rehearsal_medley_groups FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_rehearsal_medley_groups_session
  ON rehearsal_medley_groups(session_id, position);

-- Link rehearsal songs to a medley group (NULL = standalone song in session)
ALTER TABLE rehearsal_songs
  ADD COLUMN IF NOT EXISTS medley_group_id UUID
    REFERENCES rehearsal_medley_groups(id) ON DELETE CASCADE;

-- Per-song service moment tag (carries through to service log as a tag)
ALTER TABLE rehearsal_songs ADD COLUMN IF NOT EXISTS service_moment TEXT;

-- Optional lyrics per rehearsal song entry (used for unlinked/manual songs)
ALTER TABLE rehearsal_songs ADD COLUMN IF NOT EXISTS lyrics TEXT;

-- =====================================================
-- Migration: Song Leader per rehearsal song
-- Run this AFTER the migrations above
-- =====================================================

-- Optional name of the person leading a specific song during rehearsal
-- Optional: migrate any existing single leaders
-- UPDATE rehearsal_songs SET song_leaders = ARRAY[song_leader] WHERE song_leader IS NOT NULL AND song_leader <> '';
ALTER TABLE rehearsal_songs ADD COLUMN IF NOT EXISTS song_leader TEXT;

-- =====================================================
-- Migration: Song Leader per rehearsal song (multi-leader)
-- Run this AFTER the migrations above
-- =====================================================

-- Array of song leader names per rehearsal song entry
ALTER TABLE rehearsal_songs ADD COLUMN IF NOT EXISTS song_leaders TEXT[] NOT NULL DEFAULT '{}';
-- Migrate existing single-leader data into the array
UPDATE rehearsal_songs SET song_leaders = ARRAY[song_leader] WHERE song_leader IS NOT NULL AND song_leader <> '';
-- Run this AFTER the migrations above
-- =====================================================

-- Named themed groups of songs for quick reference
CREATE TABLE IF NOT EXISTS collections (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on collections"
  ON collections FOR ALL USING (true) WITH CHECK (true);

-- Songs belonging to a collection.
-- song_id is optional: NULL means a manually-added song not in the library.
-- Song data (title, key, etc.) is stored as a snapshot at time of adding.
CREATE TABLE IF NOT EXISTS collection_songs (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id     UUID        NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  song_id           UUID        REFERENCES songs(id) ON DELETE SET NULL,
  song_title        TEXT        NOT NULL,
  song_key          TEXT,
  song_notes        TEXT,
  song_youtube_link TEXT,
  position          INTEGER     NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE collection_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on collection_songs"
  ON collection_songs FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_collection_songs_collection
  ON collection_songs(collection_id, position);

-- Prevent the same library song appearing twice in the same collection
CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_songs_unique_song
  ON collection_songs(collection_id, song_id)
  WHERE song_id IS NOT NULL;

-- Optional lyrics per collection song entry (used for unlinked/manual songs)
ALTER TABLE collection_songs ADD COLUMN IF NOT EXISTS lyrics TEXT;
