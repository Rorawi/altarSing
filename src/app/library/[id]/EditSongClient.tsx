'use client';

import { useRouter } from 'next/navigation';
import type { Song } from '@/types';
import SongForm from '@/components/SongForm';
import { updateSong } from '@/lib/actions';

export default function EditSongClient({ song }: { song: Song }) {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    await updateSong(song.id, formData);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1 -ml-1"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">Edit Song</h1>
          <p className="text-sm text-slate-500 truncate">{song.title}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <SongForm initialData={song} onSubmit={handleSubmit} submitLabel="Save Changes" />
      </div>
    </div>
  );
}
