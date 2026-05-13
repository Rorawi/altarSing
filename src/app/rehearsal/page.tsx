import { createClient } from '@/lib/supabase/server';
import RehearsalClient from './RehearsalClient';

export default async function RehearsalPage() {
  const supabase = await createClient();
  const { data: songs } = await supabase
    .from('songs')
    .select('*')
    .in('rehearsal_status', ['rehearsing', 'complete'])
    .order('title');

  return <RehearsalClient songs={songs ?? []} />;
}
