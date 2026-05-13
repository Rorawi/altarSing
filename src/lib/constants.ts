export const SONG_CATEGORIES = [
  'Evangelism',
  'Communion',
  'Carols Service',
  'Wedding Procession',
  'Offertory',
  'Praise & Worship',
  'Special Occasion',
  'Other',
] as const;

export const MUSICAL_KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E',
  'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
] as const;

export const TEMPOS = ['Slow', 'Moderate', 'Fast'] as const;

export const SERVICE_MOMENTS = [
  'Church Procession',
  'Administration',
  'Music Interlude',
  'Communion',
  'Offertory',
  'After Church',
  'Special Occasion',
  'Other',
] as const;

export const ABSENCE_REASONS = ['Sick', 'Travelling', 'No Notice', 'Other'] as const;

export const MEMBER_ROLES = [
  'Choir Director',
  'Vocalist (Lead)',
  'Vocalist (Backing)',
  'Keyboardist',
  'Drummer',
  'Bassist',
  'Guitarist',
  'Saxophonist',
  'Trumpeter',
  'Other',
] as const;

export const REHEARSAL_STATUS_LABELS: Record<string, string> = {
  none: 'Not in rehearsal',
  rehearsing: 'Currently Rehearsing',
  complete: 'Rehearsal Complete',
};

export const REHEARSAL_STATUS_COLORS: Record<string, string> = {
  none: 'bg-gray-100 text-gray-500',
  rehearsing: 'bg-amber-100 text-amber-700',
  complete: 'bg-green-100 text-green-700',
};

export const CATEGORY_COLORS: Record<string, string> = {
  'Evangelism': 'bg-red-50 text-red-700',
  'Communion': 'bg-purple-50 text-purple-700',
  'Carols Service': 'bg-blue-50 text-blue-700',
  'Wedding Procession': 'bg-pink-50 text-pink-700',
  'Offertory': 'bg-orange-50 text-orange-700',
  'Praise & Worship': 'bg-yellow-50 text-yellow-700',
  'Special Occasion': 'bg-teal-50 text-teal-700',
};
