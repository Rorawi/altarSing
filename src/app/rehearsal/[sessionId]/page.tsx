import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import SessionDetailClient from './SessionDetailClient';

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const [{ data: session }, { data: songs }, { data: librarySongs }] = await Promise.all([
    supabase.from('rehearsal_sessions').select('*').eq('id', sessionId).single(),
    supabase
      .from('rehearsal_songs')
      .select('*')
      .eq('session_id', sessionId)
      .order('position'),
    supabase.from('songs').select('id, title, musical_key').order('title'),
  ]);

  if (!session) notFound();

  return (
    <SessionDetailClient
      session={session}
      songs={songs ?? []}
      librarySongs={librarySongs ?? []}
    />
  );
}
