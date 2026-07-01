import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import SessionDetailClient from './SessionDetailClient';
import type { CollectionForPicker } from '@/types';

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const [
    { data: session },
    { data: songs },
    { data: medleyGroups },
    { data: librarySongs },
    { data: members },
    { data: collectionsRaw },
  ] = await Promise.all([
    supabase.from('rehearsal_sessions').select('*').eq('id', sessionId).single(),
    supabase.from('rehearsal_songs').select('*').eq('session_id', sessionId).order('position'),
    supabase.from('rehearsal_medley_groups').select('*').eq('session_id', sessionId).order('position'),
    supabase.from('songs').select('id, title, musical_key').order('title'),
    supabase.from('choir_members').select('id, name').order('name'),
    supabase
      .from('collections')
      .select('id, name, collection_songs(id, song_title, song_id, song_key)')
      .order('name'),
  ]);

  if (!session) notFound();

  const collections: CollectionForPicker[] = (collectionsRaw ?? []).map((c: Record<string, unknown>) => {
    const rawSongs = (c.collection_songs as Record<string, unknown>[] | null) ?? [];

    return {
      id: c.id as string,
      name: c.name as string,
      songs: rawSongs.map((s) => ({
        id: s.id as string,
        song_title: s.song_title as string,
        song_id: (s.song_id as string | null) ?? null,
        song_key: (s.song_key as string | null) ?? null,
      })),
    };
  });

  return (
    <SessionDetailClient
      session={session}
      songs={songs ?? []}
      medleyGroups={medleyGroups ?? []}
      librarySongs={librarySongs ?? []}
      members={members ?? []}
      collections={collections}
    />
  );
}
