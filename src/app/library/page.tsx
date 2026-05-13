import { createClient } from '@/lib/supabase/server';
import SongLibraryClient from './SongLibraryClient';

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: songs, error } = await supabase
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4">
        <p className="font-semibold">Failed to load library</p>
        <p className="mt-1 text-xs font-mono">{error.message}</p>
      </div>
    );
  }

  return <SongLibraryClient initialSongs={songs ?? []} />;
}
