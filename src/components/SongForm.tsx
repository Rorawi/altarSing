'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { SONG_CATEGORIES, MUSICAL_KEYS, TEMPOS } from '@/lib/constants';
import type { Song } from '@/types';

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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
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
                    ? 'border-violet-800 bg-violet-50 text-violet-950 dark:border-violet-400 dark:bg-violet-950/40 dark:text-violet-100'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-violet-500 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white'
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
      <div className="flex gap-3 pt-1">
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
