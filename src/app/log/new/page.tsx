import { createClient } from '@/lib/supabase/server';
import NewLogEntryClient from './NewLogEntryClient';

export default async function NewLogPage() {
  const supabase = await createClient();
  const { data: songs } = await supabase
    .from('songs')
    .select('id, title, musical_key')
    .order('title');

  return <NewLogEntryClient songs={songs ?? []} />;
}
