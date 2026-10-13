'use client';

import { useRouter } from 'next/navigation';
import type { Song } from '@/types';
import SongForm from '@/components/SongForm';
import { updateSong } from '@/lib/actions';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

export default function EditSongClient({ song }: { song: Song }) {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    await updateSong(song.id, formData);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Edit Song"
        description={song.title}
        actions={
          <button
            type="button"
            onClick={() => router.back()}
            className="button-quiet"
          >
            <Icon name="arrow-left" size={16} />
            Back
          </button>
        }
      />

      <div className="max-w-3xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:p-7">
        <SongForm initialData={song} onSubmit={handleSubmit} submitLabel="Save Changes" />
      </div>
    </div>
  );
}

