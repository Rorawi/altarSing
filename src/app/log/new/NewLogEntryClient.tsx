'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SERVICE_MOMENTS, MUSICAL_KEYS } from '@/lib/constants';
import { addServiceLog } from '@/lib/actions';

interface SongEntry {
  uid: string;
  songId: string;
  title: string;
  key: string;
  tags: string[];
}

interface SongOption {
  id: string;
  title: string;
  musical_key: string | null;
}

function generateUid() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `song-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function NewLogEntryClient({ songs }: { songs: SongOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [songEntries, setSongEntries] = useState<SongEntry[]>([
    { uid: generateUid(), songId: '', title: '', key: '', tags: [] },
  ]);
  const [leaders, setLeaders] = useState<string[]>(['']);
  const today = new Date().toISOString().split('T')[0];

  function addSong() {
    if (songEntries.length >= 4) return;
    setSongEntries((prev) => [...prev, { uid: generateUid(), songId: '', title: '', key: '', tags: [] }]);
  }
  function toggleSongTag(uid: string, tag: string) {
    setSongEntries((prev) =>
      prev.map((s) =>
        s.uid !== uid
          ? s
          : { ...s, tags: s.tags.includes(tag) ? s.tags.filter((t) => t !== tag) : [...s.tags, tag] },
      ),
    );
  }
  function removeSong(uid: string) {
    setSongEntries((prev) => prev.filter((s) => s.uid !== uid));
  }
  function updateSong(uid: string, field: keyof SongEntry, value: string) {
    setSongEntries((prev) => prev.map((s) => (s.uid === uid ? { ...s, [field]: value } : s)));
  }
  function handleLibrarySelect(uid: string, id: string) {
    if (!id) { updateSong(uid, 'songId', ''); return; }
    const found = songs.find((s) => s.id === id);
    if (found) {
      setSongEntries((prev) =>
        prev.map((s) => s.uid === uid ? { ...s, songId: id, title: found.title, key: found.musical_key ?? '' } : s),
      );
    }
  }
  function addLeader() { setLeaders((prev) => [...prev, '']); }
  function removeLeader(i: number) { setLeaders((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateLeader(i: number, value: string) { setLeaders((prev) => prev.map((v, idx) => (idx === i ? value : v))); }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const serviceDate = (form.elements.namedItem('service_date') as HTMLInputElement).value;
    const serviceMoment = (form.elements.namedItem('service_moment') as HTMLSelectElement).value;
    const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;
    const validSongs = songEntries
      .filter((s) => s.title.trim())
      .map((s) => ({ title: s.title.trim(), key: s.key || null, song_id: s.songId || null, tags: s.tags }));
    if (validSongs.length === 0) { setError('Please enter at least one song title.'); return; }
    startTransition(async () => {
      try {
        await addServiceLog({
          songs: validSongs,
          lead_singers: leaders.filter((l) => l.trim()),
          service_date: serviceDate,
          service_moment: serviceMoment,
          notes: notes || null,
        });
        router.push('/log');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 -ml-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Log Service Entry</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Record songs from a service</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date & Moment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date <span className="text-red-500">*</span></label>
              <input type="date" name="service_date" required defaultValue={today}
                className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Moment <span className="text-red-500">*</span></label>
              <select name="service_moment" required
                className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="">— Select —</option>
                {SERVICE_MOMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Songs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Songs <span className="text-red-500">*</span></label>
              {songEntries.length < 4 && (
                <button type="button" onClick={addSong} className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 font-medium hover:text-violet-800 dark:hover:text-violet-200">
                  <span className="text-base leading-none">+</span> Add song
                </button>
              )}
            </div>
            <div className="space-y-3">
              {songEntries.map((entry, i) => (
                <div key={entry.uid} className="border border-slate-200 dark:border-slate-600 rounded-xl p-3 space-y-2 bg-slate-50 dark:bg-slate-700/40">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-5 shrink-0">#{i + 1}</span>
                    <select value={entry.songId} onChange={(e) => handleLibrarySelect(entry.uid, e.target.value)}
                      className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500">
                      <option value="">From library (optional)…</option>
                      {songs.map((s) => <option key={s.id} value={s.id}>{s.title}{s.musical_key ? ` (${s.musical_key})` : ''}</option>)}
                    </select>
                    {songEntries.length > 1 && (
                      <button type="button" onClick={() => removeSong(entry.uid)} className="text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors text-xl leading-none shrink-0">×</button>
                    )}
                  </div>
                  <div className="flex gap-2 pl-7">
                    <input type="text" value={entry.title} onChange={(e) => updateSong(entry.uid, 'title', e.target.value)} placeholder="Song title…"
                      className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    <select value={entry.key} onChange={(e) => updateSong(entry.uid, 'key', e.target.value)}
                      className="w-20 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 shrink-0">
                      <option value="">Key</option>
                      {MUSICAL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  {/* Per-song tags */}
                  <div className="pl-7">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">Tags</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {SERVICE_MOMENTS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleSongTag(entry.uid, tag)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                            entry.tags.includes(tag)
                              ? 'bg-violet-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leaders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Song Leader(s)</label>
              <button type="button" onClick={addLeader} className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 font-medium hover:text-violet-800 dark:hover:text-violet-200">
                <span className="text-base leading-none">+</span> Add leader
              </button>
            </div>
            <div className="space-y-2">
              {leaders.map((leader, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={leader} onChange={(e) => updateLeader(i, e.target.value)}
                    placeholder={i === 0 ? 'e.g. Sister Abena' : 'Another leader…'}
                    className="flex-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  {leaders.length > 1 && (
                    <button type="button" onClick={() => removeLeader(i)} className="text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors text-xl leading-none shrink-0">×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notes</label>
            <textarea name="notes" rows={3} placeholder="Any notes about the service…"
              className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => router.back()}
              className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl py-3 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 bg-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors">
              {isPending ? 'Saving…' : 'Save Log Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}