export interface VoiceRehearsalProject {
  id: string;
  title: string;
  bpm: number | null;
  created_at: string;
  expires_at: string;
}

export interface VoiceRehearsalSection {
  id: string;
  project_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface VoiceRehearsalTake {
  id: string;
  project_id: string;
  section_id?: string | null;
  part_label: string;
  line_label?: string | null;
  mime_type: 'audio/webm' | 'audio/mp4';
  duration_seconds: number;
  offset_ms: number;
  volume: number;
  is_muted: boolean;
  created_at: string;
  expires_at: string;
}

export interface VoiceRehearsalNote {
  id: string;
  take_id: string;
  timestamp_seconds: number;
  body: string;
  created_at: string;
}
