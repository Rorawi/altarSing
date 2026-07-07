'use client';

import { useRouter } from 'next/navigation';
import SongForm from '@/components/SongForm';
import { addSong } from '@/lib/actions';

export default function NewSongPage() {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    await addSong(formData);
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
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Add New Song</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Fill in the song details</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <SongForm onSubmit={handleSubmit} submitLabel="Add to Library" />
      </div>
    </div>
  );
}
