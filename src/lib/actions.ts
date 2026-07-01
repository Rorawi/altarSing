'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ─── SONGS ────────────────────────────────────────────────────────────────────

export async function addSong(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from('songs').insert({
    title: (formData.get('title') as string).trim(),
    youtube_link: (formData.get('youtube_link') as string)?.trim() || null,
    categories: formData.getAll('categories') as string[],
    musical_key: (formData.get('musical_key') as string) || null,
    tempo: (formData.get('tempo') as string) || null,
    notes: (formData.get('notes') as string)?.trim() || null,
    lyrics: (formData.get('lyrics') as string)?.trim() || null,
    rehearsal_status: 'none',
  });

  if (error) throw new Error(error.message);
  revalidatePath('/library');
  revalidatePath('/rehearsal');
  revalidatePath('/reference');
}

export async function updateSong(id: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('songs')
    .update({
      title: (formData.get('title') as string).trim(),
      youtube_link: (formData.get('youtube_link') as string)?.trim() || null,
      categories: formData.getAll('categories') as string[],
      musical_key: (formData.get('musical_key') as string) || null,
      tempo: (formData.get('tempo') as string) || null,
      notes: (formData.get('notes') as string)?.trim() || null,
      lyrics: (formData.get('lyrics') as string)?.trim() || null,
      rehearsal_status: (formData.get('rehearsal_status') as string) || 'none',
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/library');
  revalidatePath('/rehearsal');
  revalidatePath('/reference');
  revalidatePath(`/library/${id}`);
}

export async function deleteSong(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('songs').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/library');
  revalidatePath('/rehearsal');
  revalidatePath('/reference');
}

export async function updateRehearsalStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('songs')
    .update({ rehearsal_status: status })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/library');
  revalidatePath('/rehearsal');
}

export async function getSongLyrics(songId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('songs')
    .select('lyrics')
    .eq('id', songId)
    .single();
  return data?.lyrics ?? null;
}

export async function updateSongLyrics(songId: string, lyrics: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('songs')
    .update({ lyrics: lyrics.trim() || null })
    .eq('id', songId);
  if (error) throw new Error(error.message);
  revalidatePath('/library');
}

export async function getRehearsalSongLyrics(rehearsalSongId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rehearsal_songs')
    .select('lyrics')
    .eq('id', rehearsalSongId)
    .single();
  if (error) {
    if (error.message.toLowerCase().includes("could not find the 'lyrics' column")) {
      throw new Error(
        "Database migration required: add rehearsal_songs.lyrics column (ALTER TABLE rehearsal_songs ADD COLUMN IF NOT EXISTS lyrics TEXT;)",
      );
    }
    throw new Error(error.message);
  }
  return data?.lyrics ?? null;
}

export async function updateRehearsalSongLyrics(rehearsalSongId: string, lyrics: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('rehearsal_songs')
    .update({ lyrics: lyrics.trim() || null })
    .eq('id', rehearsalSongId);
  if (error) {
    if (error.message.toLowerCase().includes("could not find the 'lyrics' column")) {
      throw new Error(
        "Database migration required: add rehearsal_songs.lyrics column (ALTER TABLE rehearsal_songs ADD COLUMN IF NOT EXISTS lyrics TEXT;)",
      );
    }
    throw new Error(error.message);
  }
  revalidatePath('/rehearsal');
}

// ─── SERVICE LOGS ─────────────────────────────────────────────────────────────

export async function addServiceLog(data: {
  songs: Array<{ title: string; key: string | null; song_id: string | null }>;
  lead_singers: string[];
  service_date: string;
  service_moment: string;
  notes: string | null;
}) {
  const supabase = await createClient();
  const primary = data.songs[0] ?? { title: '', key: null, song_id: null };

  const { error } = await supabase.from('service_logs').insert({
    // Legacy columns (primary song/leader for backward compat)
    song_title: primary.title,
    song_id: primary.song_id || null,
    musical_key: primary.key || null,
    lead_singer: data.lead_singers[0] || null,
    // New multi-value columns
    songs: data.songs,
    lead_singers: data.lead_singers.filter(Boolean),
    service_date: data.service_date,
    service_moment: data.service_moment,
    notes: data.notes?.trim() || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/log');
}

export async function deleteServiceLog(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('service_logs').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/log');
}

// ─── CHOIR MEMBERS ────────────────────────────────────────────────────────────

export async function addChoirMember(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from('choir_members').insert({
    name: (formData.get('name') as string).trim(),
    role: (formData.get('role') as string)?.trim() || null,
    image_url: (formData.get('image_url') as string)?.trim() || null,
    birth_date: (formData.get('birth_date') as string)?.trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/attendance');
}

export async function deleteChoirMember(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('choir_members').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/attendance');
}

export async function updateBirthdates(updates: Array<{ id: string; birth_date: string | null }>) {
  const supabase = await createClient();
  
  for (const update of updates) {
    const { error } = await supabase
      .from('choir_members')
      .update({ birth_date: update.birth_date })
      .eq('id', update.id);
    
    if (error) throw new Error(error.message);
  }
  
  revalidatePath('/attendance');
}

// ─── REHEARSAL SESSIONS ───────────────────────────────────────────────────────

export async function createRehearsalSession(formData: FormData): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rehearsal_sessions')
    .insert({
      date: formData.get('date') as string,
      name: (formData.get('name') as string).trim(),
      notes: (formData.get('notes') as string)?.trim() || null,
      program_date: (formData.get('program_date') as string)?.trim() || null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  revalidatePath('/rehearsal');
  return data.id;
}

export async function deleteRehearsalSession(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('rehearsal_sessions').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/rehearsal');
}

export async function addRehearsalSong(
  sessionId: string,
  data: {
    song_title: string;
    song_id: string | null;
    key_used: string | null;
    has_modulation: boolean;
    modulation_from: string | null;
    modulation_to: string | null;
    harmony_notes: string | null;
    arrangement_notes: string | null;
    run_throughs: number;
    service_moment: string | null;
    song_leaders: string[];
  },
) {
  const supabase = await createClient();
  // Position accounts for both standalone songs AND medley groups in the session
  const [{ count: songCount }, { count: medleyCount }] = await Promise.all([
    supabase
      .from('rehearsal_songs')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .is('medley_group_id', null),
    supabase
      .from('rehearsal_medley_groups')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId),
  ]);
  const { error } = await supabase.from('rehearsal_songs').insert({
    session_id: sessionId,
    position: (songCount ?? 0) + (medleyCount ?? 0) + 1,
    medley_group_id: null,
    ...data,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/rehearsal/${sessionId}`);
}

export async function deleteRehearsalSong(id: string, sessionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('rehearsal_songs').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/rehearsal/${sessionId}`);
}

// ─── HARMONY PATTERNS ─────────────────────────────────────────────────────────

export async function addHarmonyPattern(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from('harmony_patterns').insert({
    name: (formData.get('name') as string).trim(),
    description: (formData.get('description') as string).trim(),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/rehearsal');
}

export async function deleteHarmonyPattern(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('harmony_patterns').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/rehearsal');
}

// ─── PROGRAM SCHEDULING ──────────────────────────────────────────────────────

export async function updateSessionProgramDate(sessionId: string, programDate: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('rehearsal_sessions')
    .update({ program_date: programDate || null })
    .eq('id', sessionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/rehearsal/${sessionId}`);
  revalidatePath('/rehearsal');
}

export async function confirmAutoLog(logId: string, removedSongIndices: number[]) {
  const supabase = await createClient();
  const { data: log } = await supabase
    .from('service_logs')
    .select('songs, source_session_id')
    .eq('id', logId)
    .single();
  if (!log) throw new Error('Log not found');

  const allSongs = log.songs as Array<{ title: string; key: string | null; song_id: string | null }>;
  const keptSongs = allSongs.filter((_, i) => !removedSongIndices.includes(i));
  const primary = keptSongs[0] ?? allSongs[0] ?? { title: '', key: null, song_id: null };

  const { error } = await supabase
    .from('service_logs')
    .update({
      songs: keptSongs,
      song_title: primary.title,
      musical_key: primary.key,
      song_id: primary.song_id,
      reviewed: true,
    })
    .eq('id', logId);
  if (error) throw new Error(error.message);
  revalidatePath('/log');
}

export async function undoAutoLog(logId: string, sessionId: string) {
  const supabase = await createClient();
  await supabase.from('service_logs').delete().eq('id', logId);
  await supabase
    .from('rehearsal_sessions')
    .update({ program_converted: false, program_log_id: null })
    .eq('id', sessionId);
  revalidatePath('/log');
  revalidatePath('/rehearsal');
}

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────

export async function upsertAttendance(
  memberId: string,
  sessionDate: string,
  present: boolean,
  absenceReason: string | null,
  notes: string | null,
) {
  const supabase = await createClient();
  const { error } = await supabase.from('attendance').upsert(
    { member_id: memberId, session_date: sessionDate, present, absence_reason: absenceReason || null, notes: notes || null },
    { onConflict: 'member_id,session_date' },
  );
  if (error) throw new Error(error.message);
  revalidatePath('/attendance');
}

export async function markAllAbsent(memberIds: string[], sessionDate: string) {
  const supabase = await createClient();
  const rows = memberIds.map((memberId) => ({
    member_id: memberId,
    session_date: sessionDate,
    present: false,
    absence_reason: null,
    notes: null,
  }));
  const { error } = await supabase
    .from('attendance')
    .upsert(rows, { onConflict: 'member_id,session_date' });
  if (error) throw new Error(error.message);
  revalidatePath('/attendance');
}

export async function updateRehearsalSong(
  id: string,
  sessionId: string,
  data: {
    song_title: string;
    key_used: string | null;
    run_throughs: number;
    harmony_notes: string | null;
    arrangement_notes: string | null;
    service_moment: string | null;
    song_leaders: string[];
  },
) {
  const supabase = await createClient();
  const { error } = await supabase.from('rehearsal_songs').update(data).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/rehearsal/${sessionId}`);
}

export async function reorderRehearsalSongs(sessionId: string, orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('rehearsal_songs').update({ position: index + 1 }).eq('id', id),
    ),
  );
  revalidatePath(`/rehearsal/${sessionId}`);
}

// ─── MEDLEY GROUPS ────────────────────────────────────────────────────────────

export async function addMedleyGroup(sessionId: string, name: string): Promise<string> {
  const supabase = await createClient();
  const [{ count: songCount }, { count: medleyCount }] = await Promise.all([
    supabase
      .from('rehearsal_songs')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .is('medley_group_id', null),
    supabase
      .from('rehearsal_medley_groups')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId),
  ]);
  const position = (songCount ?? 0) + (medleyCount ?? 0) + 1;
  const { data, error } = await supabase
    .from('rehearsal_medley_groups')
    .insert({ session_id: sessionId, name: name.trim(), position })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/rehearsal/${sessionId}`);
  return data.id;
}

export async function deleteMedleyGroup(id: string, sessionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('rehearsal_medley_groups').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/rehearsal/${sessionId}`);
}

export async function renameMedleyGroup(id: string, sessionId: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('rehearsal_medley_groups')
    .update({ name: name.trim() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/rehearsal/${sessionId}`);
}

export async function addSongToMedley(
  medleyGroupId: string,
  sessionId: string,
  data: {
    song_title: string;
    song_id: string | null;
    key_used: string | null;
    harmony_notes: string | null;
    arrangement_notes: string | null;
    run_throughs: number;
    service_moment: string | null;
    song_leaders: string[];
  },
) {
  const supabase = await createClient();
  const { count } = await supabase
    .from('rehearsal_songs')
    .select('*', { count: 'exact', head: true })
    .eq('medley_group_id', medleyGroupId);
  const { error } = await supabase.from('rehearsal_songs').insert({
    session_id: sessionId,
    medley_group_id: medleyGroupId,
    position: (count ?? 0) + 1,
    has_modulation: false,
    modulation_from: null,
    modulation_to: null,
    ...data,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/rehearsal/${sessionId}`);
}

export async function reorderSessionItems(
  sessionId: string,
  items: Array<{ type: 'song' | 'medley'; id: string }>,
) {
  const supabase = await createClient();
  await Promise.all(
    items.map(({ type, id }, index) => {
      if (type === 'song') {
        return supabase.from('rehearsal_songs').update({ position: index + 1 }).eq('id', id);
      } else {
        return supabase
          .from('rehearsal_medley_groups')
          .update({ position: index + 1 })
          .eq('id', id);
      }
    }),
  );
  revalidatePath(`/rehearsal/${sessionId}`);
}

export async function reorderSongsInMedley(
  medleyGroupId: string,
  sessionId: string,
  orderedIds: string[],
) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from('rehearsal_songs').update({ position: index + 1 }).eq('id', id),
    ),
  );
  revalidatePath(`/rehearsal/${sessionId}`);
}

// ─── COLLECTIONS ──────────────────────────────────────────────────────────────

export async function createCollection(
  name: string,
  description: string | null,
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('collections')
    .insert({ name: name.trim(), description: description?.trim() || null })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  revalidatePath('/library');
  return data.id;
}

export async function updateCollection(
  id: string,
  name: string,
  description: string | null,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('collections')
    .update({ name: name.trim(), description: description?.trim() || null })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/library');
}

export async function deleteCollection(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('collections').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/library');
}

export async function addSongToCollection(
  collectionId: string,
  data: {
    song_id: string | null;
    song_title: string;
    song_key: string | null;
    song_notes: string | null;
    song_youtube_link: string | null;
  },
) {
  const supabase = await createClient();
  const { count } = await supabase
    .from('collection_songs')
    .select('*', { count: 'exact', head: true })
    .eq('collection_id', collectionId);
  const { error } = await supabase.from('collection_songs').insert({
    collection_id: collectionId,
    position: (count ?? 0) + 1,
    ...data,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/library');
}

export async function removeFromCollection(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('collection_songs').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/library');
}

export async function reorderCollectionSongs(collectionId: string, orderedIds: string[]) {
  const supabase = await createClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('collection_songs')
        .update({ position: index + 1 })
        .eq('id', id)
        .eq('collection_id', collectionId),
    ),
  );
  revalidatePath('/library');
}

export async function getCollectionSongLyrics(collectionSongId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('collection_songs')
    .select('lyrics')
    .eq('id', collectionSongId)
    .single();
  if (error) {
    if (error.message.toLowerCase().includes("could not find the 'lyrics' column")) {
      throw new Error(
        "Database migration required: add collection_songs.lyrics column (ALTER TABLE collection_songs ADD COLUMN IF NOT EXISTS lyrics TEXT;)",
      );
    }
    throw new Error(error.message);
  }
  return data?.lyrics ?? null;
}

export async function updateCollectionSongLyrics(collectionSongId: string, lyrics: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('collection_songs')
    .update({ lyrics: lyrics.trim() || null })
    .eq('id', collectionSongId);
  if (error) {
    if (error.message.toLowerCase().includes("could not find the 'lyrics' column")) {
      throw new Error(
        "Database migration required: add collection_songs.lyrics column (ALTER TABLE collection_songs ADD COLUMN IF NOT EXISTS lyrics TEXT;)",
      );
    }
    throw new Error(error.message);
  }
  revalidatePath('/library');
}
