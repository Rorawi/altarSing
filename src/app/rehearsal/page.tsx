import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import RehearsalClient from './RehearsalClient';
import { SkeletonRehearsalPage } from '@/components/SkeletonLoaders';

async function RehearsalContent() {
  const supabase = await createClient();

  const [{ data: sessions }, { data: harmonies }] = await Promise.all([
    supabase
      .from('rehearsal_sessions')
      .select('*, rehearsal_songs(id, song_title, key_used, position)')
      .order('date', { ascending: false }),
    supabase
      .from('harmony_patterns')
      .select('*')
      .order('created_at', { ascending: false }),
  ]);

  return (
    <RehearsalClient
      initialSessions={sessions ?? []}
      initialHarmonies={harmonies ?? []}
    />
  );
}

export default function RehearsalPage() {
  return (
    <Suspense fallback={<SkeletonRehearsalPage />}>
      <RehearsalContent />
    </Suspense>
  );
}
