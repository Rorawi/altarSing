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

export type SortOption = 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc';
