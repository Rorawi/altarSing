'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { SONG_CATEGORIES, MUSICAL_KEYS, TEMPOS } from '@/lib/constants';
import type { Song } from '@/types';
import {
  parseSubSongItem,
  serializeSubSongItem,
  formatSubSongsLyrics,
  type SubSongItem,
} from '@/lib/sub-songs';

interface SongFormProps {
  initialData?: Partial<Song>;
  onSubmit: (formData: FormData) => Promise<void>;
  submitLabel?: string;
  prefillYoutubeLink?: string;
}

export default function SongForm({
  initialData,
  onSubmit,
  submitLabel = 'Save Song',
  prefillYoutubeLink,
}: SongFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const knownCategories = ['Evangelism', 'Communion', 'General Administration', 'Wedding Procession', 'Offertory', 'Praise & Worship', 'Special Occasion', 'Other'];
  const initOther = (initialData?.categories ?? []).find((c) => !knownCategories.includes(c)) ?? '';
  const initSelected = (initialData?.categories ?? []).map((c) =>
    knownCategories.includes(c) ? c : 'Other',
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initSelected);
  const [otherText, setOtherText] = useState<string>(initOther);
  const [subSongs, setSubSongs] = useState<SubSongItem[]>(
    (initialData?.sub_songs ?? []).map(parseSubSongItem),
  );
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubLyrics, setNewSubLyrics] = useState('');
  const [showSubLyrics, setShowSubLyrics] = useState(false);
  const [editingSubIndex, setEditingSubIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.delete('categories');
    selectedCategories.forEach((cat) =>
      formData.append('categories', cat === 'Other' ? (otherText.trim() || 'Other') : cat),
    );
    // Encode sub_songs as JSON array string
    formData.set('sub_songs', JSON.stringify(subSongs.map(serializeSubSongItem)));
    const mainLyrics = (formData.get('lyrics') as string)?.trim();
    if (!mainLyrics && subSongs.some((s) => s.lyrics?.trim())) {
      formData.set('lyrics', formatSubSongsLyrics(subSongs));
    }

    startTransition(async () => {
      try {
        await onSubmit(formData);
        router.push('/library');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm dark:bg-red-950/40 dark:border-red-900 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Song Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Song Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          required
          defaultValue={initialData?.title ?? ''}
          placeholder="e.g. Amazing Grace"
          className="field-control"
        />
      </div>

      {/* YouTube Link */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          YouTube / Online Link
        </label>
        <input
          type="url"
          name="youtube_link"
          defaultValue={prefillYoutubeLink ?? initialData?.youtube_link ?? ''}
          placeholder="https://youtube.com/watch?v=..."
          className="field-control"
        />
      </div>

      {/* Categories */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Categories</label>
        <div className="flex flex-wrap gap-2">
          {SONG_CATEGORIES.map((cat) => {
            const selected = selectedCategories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`min-h-9 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selected
                    ? 'border-violet-700 bg-violet-600 text-white font-semibold dark:border-violet-500 dark:bg-violet-600 dark:text-white shadow-sm'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-violet-500 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
        {selectedCategories.includes('Other') && (
          <input
            type="text"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="Describe the category…"
            className="field-control mt-2"
          />
        )}
        {selectedCategories.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">Tap to select one or more categories</p>
        )}
      </div>

      {/* Key & Tempo */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Musical Key</label>
          <select
            name="musical_key"
            defaultValue={initialData?.musical_key ?? ''}
            className="field-control"
          >
            <option value="">— Select key —</option>
            {MUSICAL_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tempo / Feel</label>
          <select
            name="tempo"
            defaultValue={initialData?.tempo ?? ''}
            className="field-control"
          >
            <option value="">— Select —</option>
            {TEMPOS.map((tempo) => (
              <option key={tempo} value={tempo}>
                {tempo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rehearsal Status (edit only) */}
      {initialData?.id && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Rehearsal Status
          </label>
          <select
            name="rehearsal_status"
            defaultValue={initialData.rehearsal_status ?? 'none'}
            className="field-control"
          >
            <option value="none">Not in rehearsal</option>
            <option value="rehearsing">Currently Rehearsing</option>
            <option value="complete">Rehearsal Complete</option>
          </select>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Notes{' '}
          <span className="text-slate-400 font-normal text-xs">
            (rehearsal instructions, arrangement notes, etc.)
          </span>
        </label>
        <textarea
          name="notes"
          defaultValue={initialData?.notes ?? ''}
          rows={4}
          placeholder="Add rehearsal instructions, arrangement notes, or special instructions..."
          className="field-control resize-none"
        />
      </div>

      {/* Sub-songs tracklist */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Songs in this medley{' '}
          <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">(optional — list each song and optionally its lyrics)</span>
        </label>

        {subSongs.length > 0 && (
          <ol className="mb-3 space-y-2">
            {subSongs.map((sub, i) => {
              const isEditing = editingSubIndex === i;
              return (
                <li
                  key={i}
                  className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 dark:border-amber-800/60 dark:bg-amber-950/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-amber-600 dark:text-amber-400 w-4 text-right">
                      {i + 1}.
                    </span>
                    <span className="flex-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {sub.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingSubIndex(isEditing ? null : i)}
                      className="button-quiet text-xs py-0.5 px-2 text-amber-700 dark:text-amber-400"
                    >
                      {sub.lyrics?.trim()
                        ? isEditing ? 'Hide lyrics' : 'Lyrics ✓'
                        : isEditing ? 'Cancel' : '+ Add lyrics'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubSongs(subSongs.filter((_, j) => j !== i));
                        if (editingSubIndex === i) setEditingSubIndex(null);
                      }}
                      aria-label={`Remove ${sub.title}`}
                      className="shrink-0 text-slate-400 hover:text-red-500 transition-colors leading-none text-base px-1"
                    >
                      ×
                    </button>
                  </div>

                  {isEditing && (
                    <div className="mt-2 pl-6 space-y-1.5">
                      <textarea
                        value={sub.lyrics || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSubSongs(
                            subSongs.map((s, idx) => (idx === i ? { ...s, lyrics: val } : s)),
                          );
                        }}
                        rows={3}
                        placeholder="Lyrics for this subsection…"
                        className="field-control text-xs resize-y font-mono"
                      />
                    </div>
                  )}

                  {!isEditing && sub.lyrics?.trim() && (
                    <p className="mt-1 pl-6 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                      "{sub.lyrics.trim().split('\n')[0]}"
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {/* Add new sub-song input box */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/40 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubTitle}
              onChange={(e) => setNewSubTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (newSubTitle.trim()) {
                    setSubSongs([...subSongs, { title: newSubTitle.trim(), lyrics: newSubLyrics.trim() }]);
                    setNewSubTitle('');
                    setNewSubLyrics('');
                    setShowSubLyrics(false);
                  }
                }
              }}
              placeholder="Song title in medley…"
              autoComplete="off"
              className="field-control flex-1 text-sm"
            />
            <button
              type="button"
              disabled={!newSubTitle.trim()}
              onClick={() => {
                if (newSubTitle.trim()) {
                  setSubSongs([...subSongs, { title: newSubTitle.trim(), lyrics: newSubLyrics.trim() }]);
                  setNewSubTitle('');
                  setNewSubLyrics('');
                  setShowSubLyrics(false);
                }
              }}
              className="button-secondary shrink-0 px-3.5 disabled:opacity-40"
            >
              + Add
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowSubLyrics((v) => !v)}
              className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium"
            >
              {showSubLyrics ? '− Remove lyrics input' : '+ Attach lyrics to this song'}
            </button>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Optional
            </span>
          </div>

          {showSubLyrics && (
            <textarea
              value={newSubLyrics}
              onChange={(e) => setNewSubLyrics(e.target.value)}
              rows={3}
              placeholder="Type or paste lyrics for this specific song…"
              className="field-control text-xs resize-y font-mono"
            />
          )}
        </div>
      </div>

      {/* Lyrics */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Lyrics{' '}
          <span className="text-slate-400 font-normal text-xs">(optional)</span>
        </label>
        <textarea
          name="lyrics"
          defaultValue={initialData?.lyrics ?? ''}
          rows={10}
          placeholder="Paste or type the song lyrics here…"
          className="field-control resize-y font-mono leading-relaxed"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => router.back()}
          className="button-secondary flex-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="button-primary flex-1"
        >
          {isPending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
