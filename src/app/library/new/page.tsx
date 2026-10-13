'use client';

import { useRouter } from 'next/navigation';
import SongForm from '@/components/SongForm';
import { addSong } from '@/lib/actions';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

export default function NewSongPage() {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    await addSong(formData);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Add a song"
        description="Add a song to your music library."
        actions={<button onClick={() => router.back()} className="button-quiet"><Icon name="arrow-left" size={16} />Back</button>}
      />

      <div className="max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:p-7">
        <SongForm onSubmit={handleSubmit} submitLabel="Add to Library" />
      </div>
    </div>
  );
}
