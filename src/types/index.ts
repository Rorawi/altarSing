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

export interface ServiceLog {
  id: string;
  song_title: string;
  song_id: string | null;
  musical_key: string | null;
  lead_singer: string | null;
  service_date: string;
  service_moment: string;
  notes: string | null;
  created_at: string;
  songs?: { title: string } | null;
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
