export type RehearsalStatus = 'none' | 'rehearsing' | 'complete';

export interface Song {
  id: string;
  title: string;
  youtube_link: string | null;
  categories: string[];
  musical_key: string | null;
  tempo: string | null;
  notes: string | null;
  rehearsal_status: RehearsalStatus;
  created_at: string;
}

export interface LogSong {
  title: string;
  key: string | null;
  song_id: string | null;
  performed?: boolean;
}

export interface ServiceLog {
  id: string;
  // Legacy single-value fields (kept for backward compat display)
  song_title: string;
  song_id: string | null;
  musical_key: string | null;
  lead_singer: string | null;
  // Multi-value fields (used by new entries)
  songs: LogSong[];
  lead_singers: string[];
  service_date: string;
  service_moment: string;
  notes: string | null;
  // Auto-generation
  source_session_id: string | null;
  source_session_name: string | null;
  is_auto_generated: boolean;
  reviewed: boolean;
  created_at: string;
}

export interface ChoirMember {
  id: string;
  name: string;
  image_url: string | null;
  role: string | null;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  member_id: string;
  session_date: string;
  present: boolean;
  absence_reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface MemberWithAttendance extends ChoirMember {
  attendance: AttendanceRecord | null;
}

export type SortOption = 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc';

// ─── REHEARSAL SESSIONS ───────────────────────────────────────────────────────

export interface RehearsalSession {
  id: string;
  date: string;
  name: string;
  notes: string | null;
  program_date: string | null;
  program_converted: boolean;
  program_log_id: string | null;
  created_at: string;
}

export interface RehearsalSong {
  id: string;
  session_id: string;
  position: number;
  song_title: string;
  song_id: string | null;
  key_used: string | null;
  has_modulation: boolean;
  modulation_from: string | null;
  modulation_to: string | null;
  harmony_notes: string | null;
  arrangement_notes: string | null;
  run_throughs: number;
  created_at: string;
}

export interface HarmonyPattern {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface RehearsalSessionWithSongs extends RehearsalSession {
  rehearsal_songs: Pick<RehearsalSong, 'id' | 'song_title' | 'key_used' | 'position'>[];
}
