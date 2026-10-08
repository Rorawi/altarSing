'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SERVICE_MOMENTS, MUSICAL_KEYS } from '@/lib/constants';
import { addServiceLog } from '@/lib/actions';
import PageHeader from '@/components/PageHeader';
import Icon from '@/components/Icon';

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
      <PageHeader
        title="Log a service"
        description="Record the songs, keys, and leaders from a service."
        actions={<button onClick={() => router.back()} className="button-quiet"><Icon name="arrow-left" size={16} />Back</button>}
      />

      <div className="max-w-4xl border-b border-slate-200 pb-6 dark:border-slate-800">
        {error && (
          <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date & Moment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date <span className="text-red-500">*</span></label>
              <input type="date" name="service_date" required defaultValue={today}
                className="field-control" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Moment <span className="text-red-500">*</span></label>
              <select name="service_moment" required
                className="field-control">
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
                <button type="button" onClick={addSong} className="button-quiet min-h-8 px-2 text-xs text-violet-900 dark:text-violet-200">
                  <Icon name="plus" size={14} /> Add song
                </button>
              )}
            </div>
            <div className="space-y-3">
              {songEntries.map((entry, i) => (
                <div key={entry.uid} className="border-b border-slate-200 py-4 first:border-t dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-5 shrink-0">#{i + 1}</span>
                    <select value={entry.songId} onChange={(e) => handleLibrarySelect(entry.uid, e.target.value)}
                      className="field-control flex-1 text-xs">
                      <option value="">From library (optional)…</option>
                      {songs.map((s) => <option key={s.id} value={s.id}>{s.title}{s.musical_key ? ` (${s.musical_key})` : ''}</option>)}
                    </select>
                    {songEntries.length > 1 && (
                      <button type="button" onClick={() => removeSong(entry.uid)} className="icon-button h-8 w-8 shrink-0" title="Remove song" aria-label="Remove song"><Icon name="close" size={15} /></button>
                    )}
                  </div>
                  <div className="flex gap-2 pl-7">
                    <input type="text" value={entry.title} onChange={(e) => updateSong(entry.uid, 'title', e.target.value)} placeholder="Song title…"
                      className="field-control flex-1" />
                    <select value={entry.key} onChange={(e) => updateSong(entry.uid, 'key', e.target.value)}
                      className="field-control w-20 shrink-0 px-2 text-xs">
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
                          className={`min-h-8 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                            entry.tags.includes(tag)
                              ? 'border-violet-800 bg-violet-50 text-violet-950 dark:border-violet-400 dark:bg-violet-950/40 dark:text-violet-100'
                              : 'border-slate-300 bg-white text-slate-600 hover:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
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
              <button type="button" onClick={addLeader} className="button-quiet min-h-8 px-2 text-xs text-violet-900 dark:text-violet-200">
                <Icon name="plus" size={14} /> Add leader
              </button>
            </div>
            <div className="space-y-2">
              {leaders.map((leader, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={leader} onChange={(e) => updateLeader(i, e.target.value)}
                    placeholder={i === 0 ? 'e.g. Sister Abena' : 'Another leader…'}
                    className="field-control flex-1" />
                  {leaders.length > 1 && (
                    <button type="button" onClick={() => removeLeader(i)} className="icon-button h-8 w-8 shrink-0" title="Remove leader" aria-label="Remove leader"><Icon name="close" size={15} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notes</label>
            <textarea name="notes" rows={3} placeholder="Any notes about the service…"
              className="field-control resize-none" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => router.back()}
              className="button-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="button-primary flex-1">
              {isPending ? 'Saving…' : 'Save Log Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
