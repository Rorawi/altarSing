'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { SONG_CATEGORIES, MUSICAL_KEYS, TEMPOS, CATEGORY_COLORS } from '@/lib/constants';
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
          className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
          className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  selected
                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-violet-400 hover:text-violet-600'
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
            className="mt-2 w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
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
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
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
            className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
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
          className="w-full border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl py-3 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
