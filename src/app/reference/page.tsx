import { createClient } from '@/lib/supabase/server';
import ReferenceClient from './ReferenceClient';

export default async function ReferencePage() {
  const supabase = await createClient();
  const { data: songs } = await supabase
    .from('songs')
    .select('id, title, musical_key, youtube_link, categories, tempo')
    .order('title');

  return <ReferenceClient songs={songs ?? []} />;
}
