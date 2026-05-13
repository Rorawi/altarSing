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

// ─── SERVICE LOGS ─────────────────────────────────────────────────────────────

export async function addServiceLog(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from('service_logs').insert({
    song_title: (formData.get('song_title') as string).trim(),
    song_id: (formData.get('song_id') as string) || null,
    musical_key: (formData.get('musical_key') as string) || null,
    lead_singer: (formData.get('lead_singer') as string)?.trim() || null,
    service_date: formData.get('service_date') as string,
    service_moment: formData.get('service_moment') as string,
    notes: (formData.get('notes') as string)?.trim() || null,
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
