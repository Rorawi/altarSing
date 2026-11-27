import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import SongLibraryClient from './SongLibraryClient';
import { SkeletonLibraryPage } from '@/components/SkeletonLoaders';
import type { CollectionWithSongs, VocalTrainingResource } from '@/types';

async function LibraryContent() {
  const supabase = await createClient();
  const [{ data: songs, error }, { data: collectionsRaw }, { data: trainingResources, error: trainingError }] = await Promise.all([
    supabase.from('songs').select('*').order('created_at', { ascending: false }),
    supabase
      .from('collections')
      .select('*, collection_songs(*)')
      .order('name'),
    supabase.from('vocal_training_resources').select('*').order('created_at', { ascending: false }),
  ]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4">
        <p className="font-semibold">Failed to load library</p>
        <p className="mt-1 text-xs font-mono">{error.message}</p>
      </div>
    );
  }

  return (
    <SongLibraryClient
      initialSongs={songs ?? []}
      initialCollections={(collectionsRaw ?? []) as CollectionWithSongs[]}
      initialTrainingResources={(trainingResources ?? []) as VocalTrainingResource[]}
      trainingResourcesError={trainingError?.message ?? null}
    />
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<SkeletonLibraryPage />}>
      <LibraryContent />
    </Suspense>
  );
}
