import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import EditSongClient from './EditSongClient';

export default async function EditSongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: song } = await supabase.from('songs').select('*').eq('id', id).single();
  if (!song) notFound();

  return <EditSongClient song={song} />;
}
