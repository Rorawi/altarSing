'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SERVICE_MOMENTS, MUSICAL_KEYS } from '@/lib/constants';
import { addServiceLog } from '@/lib/actions';

interface SongOption {
  id: string;
  title: string;
  musical_key: string | null;
}

export default function NewLogEntryClient({ songs }: { songs: SongOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [autoKey, setAutoKey] = useState('');

  function handleSongSelect(id: string) {
    setSelectedSongId(id);
    if (id) {
      const song = songs.find((s) => s.id === id);
      if (song) {
        setSongTitle(song.title);
        setAutoKey(song.musical_key ?? '');
      }
    } else {
      setSongTitle('');
      setAutoKey('');
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await addServiceLog(formData);
        router.push('/log');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    });
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1 -ml-1"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Log Service Entry</h1>
          <p className="text-sm text-slate-500">Record a song from a service</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Link to library song */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Link to Library Song{' '}
              <span className="text-slate-400 font-normal text-xs">(optional)</span>
            </label>
            <select
              value={selectedSongId}
              onChange={(e) => handleSongSelect(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
            >
              <option value="">— Not in library / type manually below —</option>
              {songs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                  {s.musical_key ? ` (${s.musical_key})` : ''}
                </option>
              ))}
            </select>
            <input type="hidden" name="song_id" value={selectedSongId} />
          </div>

          {/* Song Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Song Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="song_title"
              required
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              placeholder="e.g. How Great Thou Art"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Date & Key */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Service Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="service_date"
                required
                defaultValue={today}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Musical Key
              </label>
              <select
                name="musical_key"
                value={autoKey}
                onChange={(e) => setAutoKey(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
              >
                <option value="">— Key —</option>
                {MUSICAL_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Service Moment */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Service Moment <span className="text-red-500">*</span>
            </label>
            <select
              name="service_moment"
              required
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
            >
              <option value="">— Select when this was sung —</option>
              {SERVICE_MOMENTS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Lead Singer */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Lead Singer / Song Leader
            </label>
            <input
              type="text"
              name="lead_singer"
              placeholder="e.g. Sister Abena"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Any notes about the performance…"
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-3 text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
            >
              {isPending ? 'Saving…' : 'Save Log Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
